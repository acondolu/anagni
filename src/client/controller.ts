import {
  Block,
  JoinMessage,
  OkayMessage,
  ErrorMessage,
} from "../types/messages.js";

import { Transition } from "./machine.js";
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

export interface Model<T> {
  init: (id: string, replay: number) => AsyncGenerator<Block<T>>;
  dispatch: Transition<Block<T>, Block<T>>;
}

interface RefactorThis<T, UserEvent> {
init: (id: string, replay: number) => AsyncGenerator<Sum<Block<T>, UserEvent>>;
dispatch: Transition<Block<T>, Sum<Block<T>, UserEvent>>;
}
// Transition<UserEvent, Block<T>>


export type Auth = {
  type: "simple";
  session: string;
  room: string;
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

export class Control<T> {
  auth: Auth;
  view: View;
  model: Model<T>;

  socket: SocketIOClient.Socket;
  socketState: ConnectionState;

  recvBlockPromise: Promise<void>;
  recvdBlocksNo: number;
  sentBlocksNo: number;
  sendQueue: Array<Block<T>>;

  sentOne: boolean;

  constructor(auth: Auth, view: View, model: Model<T>) {
    this.auth = auth;
    this.view = view;
    this.model = model;
    this.socket = undefined;
    this.socketState = ConnectionState.Down;
    this.recvBlockPromise = undefined;

    this.sendQueue = new Array();
    this.sentOne = false;
  }

  /**
   * Disconnect and clear the socket.
   */
  disconnect() {
    this.socketState = ConnectionState.Down;
    const socket = this.socket;
    if (socket.connected) this.socket.disconnect();
    this.socket = null;
  }

  /**
   * Connect, login, and join the room.
   */
  connect() {
    if (this.socket) {
      this.view.onError(ControllerError.AlreadyConnect);
    }
    this.socket = io.connect(this.auth.server);
    this.socket.on("error", (reason: string) => {
      this.view.onError(ControllerError.SocketError, reason);
      this.disconnect();
    });
    this.socket.on("connect", () => {
      this.socketState = ConnectionState.Joining;
      this.socket.emit("join", {
        session: this.auth.session,
        rid: this.auth.room,
        secret: this.auth.secret,
      } as JoinMessage);
    });
    this.socket.on("err", (reason: ErrorMessage) => {
      this.disconnect();
      this.view.onError(ControllerError.JoinError, reason);
    });
    this.socket.on("okay", (ok: OkayMessage) => {
      if (ok.yourCount > this.sendQueue.length) {
        // it must be a replay situation
        if (
          this.recvBlockPromise ||
          this.sendQueue.length != 0 ||
          this.recvdBlocksNo != 0 ||
          this.sentBlocksNo != 0
        ) {
          this.disconnect();
          this.view.onError(
            ControllerError.JoinError,
            "wrong replay from future (re-init Controller)"
          );
        }
        this.initModel(ok.yourCount);
      } else {
        this.sentBlocksNo = ok.yourCount;
        if (!this.recvBlockPromise) this.initModel();
      }
      this.view.onConnect();
    });
    this.socket.on(
      "push",
      (block: Block<T>) =>
        (this.recvBlockPromise = this.recvBlockPromise.then(() =>
          this.receiveBlock(block)
        ))
    );
  }

  checkSend() {
    if (!this.socket) {
      this.sentOne = false;
      return;
    }
    let can = this.sentBlocksNo < this.sendQueue.length;
    if (can && !this.sentOne) {
      this.socket.emit("push", this.sendQueue[this.sentBlocksNo] as Block<T>);
      this.sentOne = true;
    }
  }

  async initModel(c?: number) {
    if (this.recvBlockPromise) {
      throw new Error("The model has already been initialised");
    }

    this.recvBlockPromise = new Promise(async () => {
      let init = this.model.init(this.auth.session, c);
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
  private async receiveBlock(block: Block<T>): Promise<void> {
    // Check that we have all previous blocks
    if (this.recvdBlocksNo != block.index) {
      return this.view.onError(ControllerError.ProtocolError);
    }
    this.recvdBlocksNo += 1;
    if (block.session == this.auth.session) {
      // Block sent by this user, remove
      // from queue and maybe send another one
      const sendQueueLen = this.sendQueue.length;
      if (this.sentBlocksNo >= sendQueueLen) {
        return this.view.onError(ControllerError.ProtocolError);
      }
      const block2 = this.sendQueue[this.sentBlocksNo];
      // Check that msg == msg2
      // Note: do not compare index attribute
      if (
        block.mode != block2.mode ||
        block.accessControlList != block2.accessControlList ||
        block.payload != block2.payload
      ) {
        return this.view.onError(
          ControllerError.ProtocolError,
          "received different than sent"
        );
      }
      this.sentBlocksNo += 1;
      if (this.sentBlocksNo < sendQueueLen) {
        this.socket.emit("push", this.sendQueue[this.sentBlocksNo] as Block<T>);
      }
    }
    let check = true;
    for await (const b of this.model.dispatch(block)) {
      this.sendQueue.push(b);
      if (check) {
        this.checkSend();
        check = false;
      }
    }
  }
}
