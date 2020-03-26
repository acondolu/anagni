import {
  Controller,
  Auth,
  ControllerError,
  View,
} from "../client/controller.js";
import { Block, Binary } from "../types/messages.js";

const tmp = new ArrayBuffer(8);
const auth: Auth = {
  type: "simple",
  session: tmp,
  room: tmp,
  sessionSecret: tmp,
  roomSecret: "super-secret", // FIXME: refactor, should not be here!!! only in the encryption layer
};

const view: View = {
  error: (err: ControllerError, reason?: any) => {},
  connected: () => {},
  disconnected: () => {},
};

const enum TTTEntry {
  Null,
  X,
  O,
}

type TTTMessage =
  | { type: "hello"; name: string }
  | { type: "play"; i: number; j: number; x: TTTEntry };

class TTTModel {
  // Internal stuff
  replay: number;
  // TTT-specific stuff
  table: Array<Array<TTTEntry>>;
  me: Binary;
  myName: string;
  player: Binary;
  playerName: string;
  round: number;
  amIfirst: boolean;
  done: boolean;

  constructor(id: Binary, replay: number) {
    this.me = id;
    this.replay = replay;
    this.table = new Array(3);
    for (let i = 0; i < 3; i++) {
      this.table[i] = new Array(3);
      for (let j = 0; j < 3; j++) this.table[i][j] = TTTEntry.Null;
    }
    this.myName = this.playerName = this.round = undefined;
    this.round = undefined;
    this.done = false;
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
      case "play":
        // Check if allowed:
        if (this.table[b.payload.i][b.payload.j] != TTTEntry.Null) {
          throw new Error("Invalid move");
        }
        let symbol: TTTEntry =
          (b.session == this.me) == this.amIfirst ? TTTEntry.X : TTTEntry.O;
        this.table[b.payload.i][b.payload.j] = symbol;
        // Check if this is over... TODO:
        if (this.checkOver()) {
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

  private checkOver() {
    // TODO: FIXME:
    return true;
  }
}

const ctrl: Controller<TTTMessage> = new Controller(
  "http://localhost:8080",
  auth,
  view,
  (id: Binary, _: (b: Block<TTTMessage>) => any, replay: number) =>
    new TTTModel(id, replay).step
);
ctrl.connect();
