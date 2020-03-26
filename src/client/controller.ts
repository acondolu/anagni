import {
  UserId,
  RoomId,
  Block,
  JoinMessage,
  LoginMessage,
} from "../types/messages.js";

enum ClientState {
  Disconnected,
  Connected,
  Logged,
  Joined,
}

type Game = Transition<Block<any>, Block<any>>;

type Auth = {
  type: "simple";
  uid: UserId;
  userSecret: string;
  rid: RoomId;
  roomSecret: string;
};

export class Client {
  addr: string;
  auth: Auth;
  game: Game;
  state: ClientState;

  socket: SocketIOClient.Socket;

  recvBlockPromise: Promise<void>;
  recvdBlocksNo: number;
  sentBlocksNo: number;
  sendQueue: Array<Block<any>>;

  constructor(addr: string, auth: Auth, game: Game) {
    this.game = game;
    this.addr = addr;
    this.auth = auth;
    this.state = ClientState.Disconnected;
    this.recvBlockPromise = Promise.resolve();
    console.log("Client");
  }

  disconnect() {
    this.socket.disconnect();
    this.socket = null;
  }

  connect() {
    this.socket = io.connect(this.addr);
    this.socket.on("error", () => {
      console.log("connected");
      this.state = ClientState.Disconnected;
      this.socket = null;
    });
    this.socket.on("connect", () => {
      console.log("connected");
      this.state = ClientState.Connected;
      this.socket.emit("login", {
        uid: this.auth.uid,
        secret: this.auth.userSecret,
      } as LoginMessage);
    });
    this.socket.on("err", () => {
      this.state = ClientState.Disconnected;
      this.socket = null;
    });
    this.socket.on("okay", (m: any) => this.okay(m));
    this.socket.on("append", (m: any) =>
      this.recvBlockPromise.then(() => this.receiveBlock(m))
    );
    console.log("connect", this.socket.connected);
  }

  private okay(_: any) {
    console.log("okay", this.state);
    switch (this.state) {
      case ClientState.Connected:
        this.state = ClientState.Logged;
        this.socket.emit("join", {
          rid: this.auth.rid,
          recvdBlocksNo: this.recvdBlocksNo,
        } as JoinMessage);
        break;
      case ClientState.Logged:
        this.state = ClientState.Joined;
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
      return this.fatalError("protocol error");
    }
    this.recvdBlocksNo += 1;
    if (block.uid == this.auth.uid) {
      // Block sent by this user, remove
      // from queue and maybe send another one
      const sendQueueLen = this.sendQueue.length;
      if (this.sentBlocksNo >= sendQueueLen) {
        return this.fatalError("protocol error");
      }
      const block2 = this.sendQueue[this.sentBlocksNo];
      // Check that msg == msg2
      // Note: do not compare index attribute
      if (
        block.mode != block2.mode ||
        block.accessControlList != block2.accessControlList ||
        block.payload != block2.payload
      ) {
        return this.fatalError("protocol error: received different than sent");
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
    for await (const b of this.game(block)) {
      this.sendQueue.push(b);
      if (wasEmpty) {
        this.socket.emit("append", b as Block<any>);
        wasEmpty = false;
      }
    }
  }

  private fatalError(reason: string) {
    document.write(reason);
  }
}
