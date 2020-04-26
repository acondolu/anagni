import {
  Statement,
  AuthRequest,
  WelcomeResponse,
  FailureResponse,
} from "../types/commands.js";

import { Transition, compose3 } from "./machine.js";
import { Sum } from "../types/common.js";
import { Socket } from "../types/socket.js";

export interface ConnectionInterface {
  /**
   * A fatal error. Disconnects.
   */
  onError: (err: ControllerError, reason?: any) => any;
  onConnect: () => any;
  onDisconnect: () => any;
}

export interface UI<S> {
  show: () => any;
  hide: () => any;
  render: (state: S) => any;
}

export interface Replica<S, T, U> {
  state: S;
  init: Transition<string, Sum<Statement<T>, U>>;
  dispatch: Transition<Statement<T>, Sum<Statement<T>, U>>;
}

export type Auth = {
  type: "simple";
  replicaId: string;
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
  AuthError,
  ProtocolError,
}

interface Connector {
  connect: (uri: string) => Socket;
}

export class Follower<S, T, U> {
  auth: Auth;
  view: ConnectionInterface;
  replica: Replica<S, T, U>;

  socket: Socket | undefined;
  socketState: ConnectionState;

  recvPromise: Promise<void> | undefined;
  receivedStatementsNo: number;
  sentStatementsNo: number;
  sendQueue: Array<Statement<T>>;

  sentOne: boolean;

  ui: UI<S>;
  input: (u: U) => Promise<Statement<T>>;
  replay: number;

  constructor(
    auth: Auth,
    view: ConnectionInterface,
    replica: Replica<S, T, U>,
    ui: UI<S>,
    input: (u: U) => Promise<Statement<T>>
  ) {
    this.auth = auth;
    this.view = view;
    this.replica = replica;
    this.ui = ui;
    this.socket = undefined;
    this.socketState = ConnectionState.Down;
    this.recvPromise = undefined;
    this.sentStatementsNo = 0;
    this.receivedStatementsNo = 0;

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
  connect(connector: Connector = io) {
    if (this.socket) {
      return this.view.onError(ControllerError.AlreadyConnect);
    }
    const socket = connector.connect(this.auth.server);
    this.socket = socket;
    socket.on("error", (reason: string) => {
      this.view.onError(ControllerError.SocketError, reason);
      this.disconnect();
    });
    socket.on("connect", () => {
      this.socketState = ConnectionState.Joining;
      socket.emit("join", {
        replica: this.auth.replicaId,
        db: this.auth.db,
        secret: this.auth.secret,
      } as AuthRequest);
    });
    socket.on("err", (reason: FailureResponse) => {
      this.disconnect();
      this.view.onError(ControllerError.AuthError, reason);
    });
    socket.on("okay", (ok: WelcomeResponse) => {
      if (ok.yourStatementsCount > this.sendQueue.length) {
        // it must be a replay situation
        if (
          this.recvPromise ||
          this.sendQueue.length != 0 ||
          this.receivedStatementsNo != 0 ||
          this.sentStatementsNo != 0
        ) {
          this.disconnect();
          this.view.onError(
            ControllerError.AuthError,
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
      console.log("new statement", JSON.stringify(stmt));
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
      let init = compose3((u: U) => {
        if (this.replay > 0) {
          this.replay -= 1;
          return Promise.resolve(undefined);
        }
        this.ui.render(this.replica.state);
        return this.input(u);
      }, this.replica.init.bind(this.replica))(this.auth.replicaId);
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
    if (this.receivedStatementsNo != statement.index) {
      return this.view.onError(ControllerError.ProtocolError);
    }
    this.receivedStatementsNo += 1;
    if (statement.replica == this.auth.replicaId) {
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
        // statement.mode != stmt2.mode ||
        // statement.accessControlList != stmt2.accessControlList ||
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
    let dispatch = compose3((u: U): Promise<Statement<T> | undefined> => {
      if (this.replay > 0) {
        this.replay -= 1;
        return Promise.resolve(undefined);
      }
      return this.input(u);
    }, this.replica.dispatch.bind(this.replica))(statement);
    for await (const b of dispatch) {
      this.sendQueue.push(b);
      if (check) {
        this.checkSend();
        check = false;
      }
    }
    this.ui.render(this.replica.state);
  }
}
