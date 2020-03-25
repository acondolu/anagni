import { LoginMessage, RoomId } from "../types/messages.js";

enum ClientState {
  Disconnected,
  Connected,
  Logged,
  Joined,
}

type Message = {};
type Game = Transition<Message, Message>;

type RoomAuth = {
  rid: RoomId;
  secret: string;
}

export class Client {
  game: Game;
  addr: string;
  auth: LoginMessage;
  room: RoomAuth;
  state: ClientState;
  socket: SocketIOClient.Socket;

  fastForwardUntil: number;
  results: Array<Message>;

  counter: number;
  queue: Array<Message>;

  constructor(addr: string, auth: LoginMessage, room: RoomAuth, game: Game) {
    this.game = game;
    this.addr = addr;
    this.auth = auth;
    this.room = room;
    this.state = ClientState.Disconnected;
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
      this.socket.emit("login", this.auth);
    });
    this.socket.on("err", () => {
      this.state = ClientState.Disconnected;
      this.socket = null;
    });
    this.socket.on("okay", (m: any) => this.okay(m));
    this.socket.on("append", (m: any) => this.append(m));
    console.log("connect", this.socket.connected);
  }

  private okay(_: any) {
    console.log("okay", this.state);
    switch (this.state) {
      case ClientState.Connected:
        this.state = ClientState.Logged;
        this.socket.emit("join", {
          rid: this.room.rid,
          lastKnownMsg: -1, // FIXME: 
        });
        break;
      case ClientState.Logged:
        this.state = ClientState.Joined;
        this.done();
        break;
    }
  }

  private done() {}

  private append(m: any) {
    const index = 666;
    const result = this.game(m);
    if (result) {
      if (this.fastForwardUntil > index) {
        // Fast-forward mode
        this.results.push(result);
      } else {
        this.socket.emit("append", result);
      }
    }
  }
}
