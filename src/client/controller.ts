import { UserId, RoomId, Block, JoinMessage } from "../types/messages.js";

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
  uid: UserId;
  userSecret: string;
  rid: RoomId;
  roomSecret: string;
};

enum ConnectionState {
  Disconnected,
  Connected,
  Logged,
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
    this.socketState = ConnectionState.Disconnected;
    this.recvBlockPromise = Promise.resolve();
  }

  /**
   * Disconnect and clear the socket.
   */
  disconnect() {
    this.socketState = ConnectionState.Disconnected;
    this.socket.disconnect();
    this.socket = null;
  }

  /**
   * Connect, login, and join the room.
   */
  connect() {
    this.socket = io.connect(this.addr);
    this.socket.on("error", () => {
      console.log("connected");
      this.socketState = ConnectionState.Disconnected;
      this.socket = null;
    });
    this.socket.on("connect", () => {
      console.log("connected");
      this.socketState = ConnectionState.Connected;
      this.socket.emit("login", {
        session: this.auth.uid,
        rid: this.auth.rid,
        secret: this.auth.userSecret,
      } as JoinMessage);
    });
    this.socket.on("err", () => {
      this.socketState = ConnectionState.Disconnected;
      this.socket = null;
    });
    this.socket.on("okay", (m: any) => this.okay(m));
    this.socket.on("append", (m: any) =>
      this.recvBlockPromise.then(() => this.receiveBlock(m))
    );
    console.log("connect", this.socket.connected);
  }

  private okay(_: any) {
    console.log("okay", this.socketState);
    switch (this.socketState) {
      case ConnectionState.Connected:
        this.socketState = ConnectionState.Logged;
        this.socket.emit("join", {
          rid: this.auth.rid,
          recvdBlocksNo: this.recvdBlocksNo,
        } as JoinMessage);
        break;
      case ConnectionState.Logged:
        this.socketState = ConnectionState.Joined;
        this.done();
        break;
    }
  }

  private done() {}

  /**
   * When a new Block is received
   */
  private async receiveBlock(block: Block<any>): Promise<void> {
    // Check that we have all previous blocks
    if (this.recvdBlocksNo != block.index) {
      return this.view.error("protocol error");
    }
    this.recvdBlocksNo += 1;
    if (block.uid == this.auth.uid) {
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
          "append",
          this.sendQueue[this.sentBlocksNo] as Block<any>
        );
      }
    }
    let wasEmpty = this.sentBlocksNo == this.sendQueue.length;
    for await (const b of this.model(block)) {
      this.sendQueue.push(b);
      if (wasEmpty) {
        this.socket.emit("append", b as Block<any>);
        wasEmpty = false;
      }
    }
  }
}
