import {
  Binary,
  Block,
  JoinMessage,
  OkayMessage,
  ErrorMessage,
} from "../types/messages.js";

import { Transition } from "./machine.js";

import io from "socket.io-client";

export interface View {
  /**
   * A fatal error. Disconnects.
   */
  error: (err: ControllerError, reason?: any) => any;
  connected: () => any;
  disconnected: () => any;
}

export type Model<T> = (
  id: Binary,
  emit: (b: Block<T>) => any,
  replay: number
) => Transition<Block<T>, Block<T>>;

export type Auth = {
  type: "simple";
  session: Binary;
  room: Binary;
  sessionSecret: Binary;
  roomSecret: string;
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

export class Controller<T> {
  addr: string;
  auth: Auth;
  view: View;
  step: Transition<Block<T>, Block<T>>;
  model: Model<T>;

  socket: SocketIOClient.Socket;
  socketState: ConnectionState;

  recvBlockPromise: Promise<void>;
  recvdBlocksNo: number;
  sentBlocksNo: number;
  sendQueue: Array<Block<T>>;

  constructor(addr: string, auth: Auth, view: View, model: Model<T>) {
    this.addr = addr;
    this.auth = auth;
    this.view = view;
    this.model = model;
    this.socket = undefined;
    this.socketState = ConnectionState.Down;
    this.recvBlockPromise = Promise.resolve();
  }

  /**
   * Disconnect and clear the socket.
   */
  disconnect() {
    this.socketState = ConnectionState.Down;
    const socket = this.socket;
    this.socket = null;
    if (socket.connected) this.socket.disconnect();
  }

  /**
   * Connect, login, and join the room.
   */
  connect() {
    if (this.socket) {
      this.view.error(ControllerError.AlreadyConnect);
    }
    this.socket = io.connect(this.addr);
    this.socket.on("error", (reason: string) => {
      this.disconnect();
      this.view.error(ControllerError.SocketError, reason);
    });
    this.socket.on("connect", () => {
      console.log("connected");
      this.socketState = ConnectionState.Joining;
      this.socket.emit("join", {
        session: this.auth.session,
        rid: this.auth.room,
        secret: this.auth.sessionSecret,
      } as JoinMessage);
    });
    this.socket.on("err", (reason: ErrorMessage) => {
      this.disconnect();
      this.view.error(ControllerError.JoinError, reason);
    });
    this.socket.on("okay", (ok: OkayMessage) => {
      if (ok.yourCount > this.sendQueue.length) {
        // it must be a replay situation
        if (
          this.step ||
          this.sendQueue.length != 0 ||
          this.recvdBlocksNo != 0 ||
          this.sentBlocksNo != 0
        ) {
          this.disconnect();
          this.view.error(
            ControllerError.JoinError,
            "wrong replay from future"
          );
        }
        this.step = this.model(this.auth.session, this.emit, ok.yourCount);
      } else {
        this.sentBlocksNo = ok.yourCount;
        if (!this.step) {
          this.step = this.model(this.auth.session, this.emit, 0);
        }
      }
      this.view.connected();
    });
    this.socket.on(
      "push",
      (block: Block<T>) =>
        (this.recvBlockPromise = this.recvBlockPromise.then(() =>
          this.receiveBlock(block)
        ))
    );
  }

  emit(block: Block<T>) {
    throw new Error("FIXME");
  }

  /**
   * When a new Block is received
   */
  private async receiveBlock(block: Block<T>): Promise<void> {
    // Check that we have all previous blocks
    if (this.recvdBlocksNo != block.index) {
      return this.view.error(ControllerError.ProtocolError);
    }
    this.recvdBlocksNo += 1;
    if (block.session == this.auth.session) {
      // Block sent by this user, remove
      // from queue and maybe send another one
      const sendQueueLen = this.sendQueue.length;
      if (this.sentBlocksNo >= sendQueueLen) {
        return this.view.error(ControllerError.ProtocolError);
      }
      const block2 = this.sendQueue[this.sentBlocksNo];
      // Check that msg == msg2
      // Note: do not compare index attribute
      if (
        block.mode != block2.mode ||
        block.accessControlList != block2.accessControlList ||
        block.payload != block2.payload
      ) {
        return this.view.error(
          ControllerError.ProtocolError,
          "received different than sent"
        );
      }
      this.sentBlocksNo += 1;
      if (this.sentBlocksNo < sendQueueLen) {
        this.socket.emit("push", this.sendQueue[this.sentBlocksNo] as Block<T>);
      }
    }
    let wasEmpty = this.sentBlocksNo == this.sendQueue.length;
    for await (const b of this.step(block)) {
      this.sendQueue.push(b);
      if (wasEmpty) {
        this.socket.emit("push", b as Block<T>);
        wasEmpty = false;
      }
    }
  }
}
