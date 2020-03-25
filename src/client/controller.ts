import "socket.io-client";
import "../types/messages.js";
import { LoginMessage } from "../types/messages.js";

enum ClientState {
  Disconnected,
  Connected,
  Logged,
  Joined,
}

type Message = {};
type Game = Transition<Message, Message>;

export class Client {
  game: Game;
  addr: string;
  auth: string;
  state: ClientState;
  socket: SocketIOClient.Socket;

  fastForwardUntil: number;
  results: Array<Message>;

  counter: number;
  queue: Array<Message>;

  constructor(addr: string, auth: string, game: Game) {
    this.game = game;
    this.addr = addr;
    this.auth = auth;
    this.state = ClientState.Disconnected;
  }

  disconnect() {
    this.socket.disconnect();
    this.socket = null;
  }

  connect() {
    this.socket = io.connect(this.addr);
    this.socket.on("error", () => {
      this.state = ClientState.Disconnected;
      this.socket = null;
    });
    this.socket.on("connect", () => {
      this.state = ClientState.Connected;
      this.login();
    });
    this.socket.on("err", () => {
      this.state = ClientState.Disconnected;
      this.socket = null;
    });
    this.socket.on("okay", (m: any) => this.okay(m));
    this.socket.on("append", (m: any) => this.append(m));
  }

  private login() {
    const auth: LoginMessage = {
      uid: "",
      secret: "",
      no: -666,
    };
    this.socket.emit("login", auth);
  }

  private okay(_: any) {
    switch (this.state) {
      case ClientState.Connected:
        this.state = ClientState.Logged;
        this.join();
        break;
      case ClientState.Logged:
        this.state = ClientState.Joined;
        this.done();
        break;
    }
  }

  private join() {}

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
