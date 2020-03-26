import {
  SessionId,
  RoomId,
  Block,
  JoinMessage,
  OkayMessage,
  ErrorMessage,
} from "../types/messages.js";

interface View {
  /**
   * A fatal error. Disconnects.
   */
  error: (reason: string) => any;
  connected: () => any;
  disconnected: () => any;
}

type Model = Transition<Block<any>, Block<any>>;

type Auth = {
  type: "simple";
  session: SessionId;
  room: RoomId;
  sessionSecret: string;
  roomSecret: string;
};

enum ConnectionState {
  Down,
  Joining,
  Joined,
}

export class Controller {
  addr: string;
  auth: Auth;
  view: View;
  model: Model;

  socket: SocketIOClient.Socket;
  socketState: ConnectionState;

  recvBlockPromise: Promise<void>;
  recvdBlocksNo: number;
  sentBlocksNo: number;
  sendQueue: Array<Block<any>>;

  constructor(addr: string, auth: Auth, view: View, model: Model) {
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
      this.view.error("Already connected"); // FIXME:
    }
    this.socket = io.connect(this.addr);
    this.socket.on("error", (reason: string) => {
      this.disconnect();
      this.view.error("Socket Error: " + reason); // FIXME:
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
      this.view.error("Join Error: " + reason); // FIXME:
    });
    this.socket.on("okay", (m: any) => this.okay(m));
    this.socket.on("push", (m: any) =>
      this.recvBlockPromise.then(() => this.receiveBlock(m))
    );
    console.log("connect", this.socket.connected);
  }

  private okay(ok: OkayMessage) {
    this.sentBlocksNo = ok.yourCount;
    this.view.connected();
  }

  /**
   * When a new Block is received
   */
  private async receiveBlock(block: Block<any>): Promise<void> {
    // Check that we have all previous blocks
    if (this.recvdBlocksNo != block.index) {
      return this.view.error("protocol error");
    }
    this.recvdBlocksNo += 1;
    if (block.session == this.auth.session) {
      // Block sent by this user, remove
      // from queue and maybe send another one
      const sendQueueLen = this.sendQueue.length;
      if (this.sentBlocksNo >= sendQueueLen) {
        return this.view.error("protocol error");
      }
      const block2 = this.sendQueue[this.sentBlocksNo];
      // Check that msg == msg2
      // Note: do not compare index attribute
      if (
        block.mode != block2.mode ||
        block.accessControlList != block2.accessControlList ||
        block.payload != block2.payload
      ) {
        return this.view.error("protocol error: received different than sent");
      }
      this.sentBlocksNo += 1;
      if (this.sentBlocksNo < sendQueueLen) {
        this.socket.emit(
          "push",
          this.sendQueue[this.sentBlocksNo] as Block<any>
        );
      }
    }
    let wasEmpty = this.sentBlocksNo == this.sendQueue.length;
    for await (const b of this.model(block)) {
      this.sendQueue.push(b);
      if (wasEmpty) {
        this.socket.emit("push", b as Block<any>);
        wasEmpty = false;
      }
    }
  }
}
