import { Controller, Auth } from "../client/controller.js";
import { Block, Binary, AccessControlMode } from "../types/messages.js";
import { TTTView, TTTViewImpl } from "./gui.js";
import { SessionManager } from "../client/session.js";

let name = "Lady Gaga";

const auth: Auth = SessionManager.newSession();

const enum TTTEntry {
  Null,
  X,
  O,
}
const enum TTTState {
  Undecided,
  WinX,
  WinO,
  Draw,
}

type TTTMessage =
  | { type: "hello"; name: string }
  | { type: "move"; i: number; j: number; x: TTTEntry };

class TTTModel {
  // Internal stuff
  replay: number;
  // View
  view: TTTView;
  // TTT-specific stuff
  table: Array<Array<TTTEntry>>;
  me: Binary;
  myName: string;
  player: Binary;
  playerName: string;
  round: number;
  amIfirst: boolean;
  done: boolean;

  constructor(
    id: Binary,
    name: string,
    replay: number,
    step: (b: Block<TTTMessage>) => any,
    view: TTTView
  ) {
    this.me = id;
    this.replay = replay;
    this.view = view;
    this.table = new Array(3);
    for (let i = 0; i < 3; i++) {
      this.table[i] = new Array(3);
      for (let j = 0; j < 3; j++) this.table[i][j] = TTTEntry.Null;
    }
    this.myName = this.playerName = this.round = undefined;
    this.round = undefined;
    this.done = false;
    // Introduce yourself
    if (this.replay == 0)
      step({
        index: undefined,
        session: id,
        mode: AccessControlMode.All,
        accessControlList: undefined,
        payload: { type: "hello", name: name },
      });
  }

  async *step(b: Block<TTTMessage>): AsyncGenerator<Block<TTTMessage>> {
    if (this.done) return;
    switch (b.payload.type) {
      case "hello":
        if (!isNaN(this.round)) {
          throw new Error("Too late for introductions");
        }
        const name = b.payload.name;
        if (name.length === 0) {
          throw new Error("Name cannot be empty");
        }
        if (b.session == this.me) {
          if (this.myName) {
            throw new Error("Playing twice!");
          }
          this.myName = b.payload.name;
          this.amIfirst = !this.playerName;
          if (this.playerName) {
            this.round = 0;
          }
          return;
        } else {
          if (this.playerName) {
            throw new Error("Not playing!");
          }
          this.player = b.session;
          this.playerName = name;
          if (this.myName) {
            this.round = 0;
            break;
          }
          return;
        }
      case "move":
        // Check if allowed:
        if (this.table[b.payload.i][b.payload.j] != TTTEntry.Null) {
          throw new Error("Invalid move");
        }
        let symbol: TTTEntry =
          (b.session == this.me) == this.amIfirst ? TTTEntry.X : TTTEntry.O;
        this.table[b.payload.i][b.payload.j] = symbol;
        // Check if this is over... TODO:
        if (this.state()) {
          this.done = true;
          return;
        }
        if (b.session == this.me) {
          if (this.replay > 0) {
            yield b;
            this.replay -= 1;
          }
          return;
        } else break;
    }
    if (this.replay > 0) return;
    // this is your turn: play!
  }

  private state(): TTTState {
    // TODO: FIXME:
    return TTTState.Undecided;
  }
}

let view = new TTTViewImpl();
const ctrl: Controller<TTTMessage> = new Controller(
  "http://localhost:8080",
  auth,
  view,
  (id: Binary, step: (b: Block<TTTMessage>) => any, replay: number) =>
    new TTTModel(id, name, replay, step, view).step
);
ctrl.connect();
