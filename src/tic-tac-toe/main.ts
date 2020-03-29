import { Auth, Control, View, ControllerError } from "../client/controller.js";
import { SessionManager } from "../client/session.js";
import { TicTatToe, GameEvent } from "./game.js";
import { TTTViewImpl, InputRequest } from "./gui.js";

class BeginPage implements View {
  init: HTMLDivElement;
  connectionState: HTMLSpanElement;
  play: HTMLDivElement;

  ctrl: Control<GameEvent, InputRequest>;

  constructor() {
    // Attach events handlers
    document.getElementById("newSessionBtn").onclick = () => {
      const server = (document.getElementById(
        "serverInput"
      ) as HTMLInputElement).value;
      const auth = new SessionManager().newSession(server);
      this.start(auth);
    };
    // document.getElementById("joinSessionBtn").onclick = () => {
    //   const sessionId = (document.getElementById(
    //     "sessionIdInput"
    //   ) as HTMLInputElement).value;
    //   const auth = new SessionManager().newSession(server);
    //   this.start(auth);
    // };

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
    (document.getElementById("gameId") as HTMLDivElement).textContent = btoa(
      auth.db
    );
    (document.getElementById("sessionId") as HTMLDivElement).textContent = btoa(
      auth.db + auth.replica + auth.secret
    );
    const view = new TTTViewImpl();
    this.ctrl = new Control(auth, this, new TicTatToe(view), view.input);
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
