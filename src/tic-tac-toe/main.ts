import { Auth, Control, View, ControllerError } from "../client/controller.js";
import { SessionManager } from "../client/session.js";
import { TicTatToe } from "./game.js";

class BeginPage implements View {
  init: HTMLDivElement;
  connectionState: HTMLSpanElement;
  play: HTMLDivElement;

  ctrl: Control<any>;

  constructor() {
    // Attach events handlers
    document.getElementById("newSessionBtn").onclick = () => {
      const server = (document.getElementById(
        "serverInput"
      ) as HTMLInputElement).value;
      const auth = new SessionManager().newSession(server);
      this.start(auth);
    };
    // States
    this.init = document.getElementById("init") as HTMLDivElement;
    this.play = document.getElementById("play") as HTMLDivElement;
    this.connectionState = document.getElementById(
      "connectionState"
    ) as HTMLSpanElement;
    // Init
    this.connectionState.textContent = "disconnected";
    this.init.style.display = "block";
  }

  start(auth: Auth) {
    this.init.style.display = "none";
    console.log(auth);
    (document.getElementById("gameId") as HTMLInputElement).value = btoa(
      auth.room
    );
    (document.getElementById("sessionId") as HTMLInputElement).value = btoa(
      auth.room + auth.session + auth.secret
    );
    this.ctrl = new Control(auth, this, new TicTatToe());
    this.ctrl.connect();
  }

  // View events
  onError(err: ControllerError, reason?: any) {
    this.play.style.display = "none";
    this.connectionState.textContent = `disconnected (error ${err} ${reason})`;
  }
  onConnect() {
    this.play.style.display = "block";
    this.connectionState.textContent = "connected";
  }
  onDisconnect() {
    this.play.style.display = "none";
    this.connectionState.textContent = "disconnected";
  }
}

window.onload = () => new BeginPage();
