const io = require("socket.io-client");
import "types/messages";

type Packet = string;

interface State {}

interface Brain {
  getInitialState: () => State;
  getCurrentIndex: () => number;
  step: (p: Packet) => Packet | null;
}

enum ClientState {
  Disconnected,
  Connected,
  Logged,
  Joined,
}

export class Client {
  brain: Brain;
  addr: string;
  auth: string;
  state: ClientState;
  socket: SocketIOClient.Socket;

  fastForwardUntil: number;
  results: Array<any>;

  constructor(addr: string, auth: string, brain: Brain) {
    this.brain = brain;
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
    const result = this.brain.step(m);
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
/*

this.socket = io.connect("http://localhost:8080");
    this.socket.on("connnect", () => {
      console.log("CONNECTED");
    });
    this.socket.emit("chat_message", "hello");


var socket = io.connect("http://localhost:8080");
socket.on("connect", () => {
  console.log("C", socket.connected); // false
});
socket.emit("login", { uid: "ciao" });
socket.on("okay", (m) => {
  console.log("okay", m);
});
window.f = function () {
  socket.emit("login", { uid: "ciao" });
};
*/
