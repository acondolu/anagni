import {
  Statement,
  JoinMessage,
  OkayMessage,
  ErrorMessage,
} from "../types/messages.js";

import { Transition, composeU } from "./machine.js";
import { Sum } from "../types/common.js";

// import io from "socket.io-client";

export interface View {
  /**
   * A fatal error. Disconnects.
   */
  onError: (err: ControllerError, reason?: any) => any;
  onConnect: () => any;
  onDisconnect: () => any;
}

export interface Model<T, U> {
  init: Transition<string, Sum<Statement<T>, U>>;
  dispatch: Transition<Statement<T>, Sum<Statement<T>, U>>;
}

export type Auth = {
  type: "simple";
  replica: string;
  db: string;
  secret: string;
  server: string; // URL
};

const enum ConnectionState {
  Down,
  Joining,
  Joined,
}

export const enum ControllerError {
  AlreadyConnect,
  SocketError,
  JoinError,
  ProtocolError,
}

export class Control<T, U> {
  auth: Auth;
  view: View;
  model: Model<T, U>;

  socket: SocketIOClient.Socket | undefined;
  socketState: ConnectionState;

  recvPromise: Promise<void> | undefined;
  receivedStatementsBlocksNo: number;
  sentStatementsNo: number;
  sendQueue: Array<Statement<T>>;

  sentOne: boolean;

  input: (ue: U) => Promise<Statement<T> | undefined>;
  replay: number;

  constructor(
    auth: Auth,
    view: View,
    model: Model<T, U>,
    input: (ue: U) => Promise<Statement<T> | undefined>
  ) {
    this.auth = auth;
    this.view = view;
    this.model = model;
    this.socket = undefined;
    this.socketState = ConnectionState.Down;
    this.recvPromise = undefined;

    this.replay = 0;
    this.input = input;

    this.sendQueue = new Array();
    this.sentOne = false;
  }

  /**
   * Disconnect and clear the socket.
   */
  disconnect() {
    this.socketState = ConnectionState.Down;
    if (this.socket && this.socket.connected) this.socket.disconnect();
    this.socket = undefined;
  }

  /**
   * Connect, login, and join the database.
   */
  connect() {
    if (this.socket) {
      return this.view.onError(ControllerError.AlreadyConnect);
    }
    const socket = io.connect(this.auth.server);
    this.socket = socket;
    socket.on("error", (reason: string) => {
      this.view.onError(ControllerError.SocketError, reason);
      this.disconnect();
    });
    socket.on("connect", () => {
      this.socketState = ConnectionState.Joining;
      socket.emit("join", {
        replica: this.auth.replica,
        db: this.auth.db,
        secret: this.auth.secret,
      } as JoinMessage);
    });
    socket.on("err", (reason: ErrorMessage) => {
      this.disconnect();
      this.view.onError(ControllerError.JoinError, reason);
    });
    socket.on("okay", (ok: OkayMessage) => {
      if (ok.yourStatementsCount > this.sendQueue.length) {
        // it must be a replay situation
        if (
          this.recvPromise ||
          this.sendQueue.length != 0 ||
          this.receivedStatementsBlocksNo != 0 ||
          this.sentStatementsNo != 0
        ) {
          this.disconnect();
          this.view.onError(
            ControllerError.JoinError,
            "wrong replay from future (re-init Controller)"
          );
        }
        this.replay = ok.yourStatementsCount;
        this.initModel();
      } else {
        this.sentStatementsNo = ok.yourStatementsCount;
        this.replay = 0;
        if (!this.recvPromise) this.initModel();
      }
      this.view.onConnect();
    });
    socket.on("push", (stmt: Statement<T>) => {
      if (!this.recvPromise) throw new Error();
      this.recvPromise = this.recvPromise.then(() =>
        this.receiveStatement(stmt)
      );
    });
  }

  checkSend() {
    if (!this.socket) {
      this.sentOne = false;
      return;
    }
    let can = this.sentStatementsNo < this.sendQueue.length;
    if (can && !this.sentOne) {
      this.socket.emit(
        "push",
        this.sendQueue[this.sentStatementsNo] as Statement<T>
      );
      this.sentOne = true;
    }
  }

  async initModel(c?: number) {
    if (this.recvPromise) {
      throw new Error("The model has already been initialised");
    }

    this.recvPromise = new Promise(async () => {
      let init = composeU((u: U) => {
        if (this.replay > 0) {
          this.replay -= 1;
          return;
        }
        return this.input(u);
      }, this.model.init)(this.auth.replica);
      let check = true;
      for await (const b of init) {
        this.sendQueue.push(b);
        if (check) {
          this.checkSend();
          check = false;
        }
      }
    });
  }

  /**
   * When a new Block is received
   */
  private async receiveStatement(statement: Statement<T>): Promise<void> {
    // Check that we have all previous statements
    if (this.receivedStatementsBlocksNo != statement.index) {
      return this.view.onError(ControllerError.ProtocolError);
    }
    this.receivedStatementsBlocksNo += 1;
    if (statement.replica == this.auth.replica) {
      // Block sent by this user, remove
      // from queue and maybe send another one
      const sendQueueLen = this.sendQueue.length;
      if (this.sentStatementsNo >= sendQueueLen) {
        return this.view.onError(ControllerError.ProtocolError);
      }
      const stmt2 = this.sendQueue[this.sentStatementsNo];
      // Check that msg == msg2
      // Note: do not compare index attribute
      if (
        statement.mode != stmt2.mode ||
        statement.accessControlList != stmt2.accessControlList ||
        statement.payload != stmt2.payload
      ) {
        return this.view.onError(
          ControllerError.ProtocolError,
          "received different than sent"
        );
      }
      this.sentStatementsNo += 1;
      if (this.sentStatementsNo < sendQueueLen) {
        if (!this.socket) throw new Error();
        this.socket.emit(
          "push",
          this.sendQueue[this.sentStatementsNo] as Statement<T>
        );
      }
    }
    let check = true;
    let dispatch = composeU((u: U): Promise<Statement<T> | undefined> => {
      if (this.replay > 0) {
        this.replay -= 1;
        return Promise.resolve(undefined);
      }
      return this.input(u);
    }, this.model.dispatch)(statement);
    for await (const b of dispatch) {
      this.sendQueue.push(b);
      if (check) {
        this.checkSend();
        check = false;
      }
    }
  }
}
