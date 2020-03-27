import { Controller, Auth, Model } from "../client/controller.js";
import { Block, AccessControlMode } from "../types/messages.js";
import { TTTView, TTTViewImpl } from "./gui.js";
import { SessionManager } from "../client/session.js";

const enum TTTMark {
  Null,
  X,
  O,
}

const enum TTTState {
  Introductions, // Players are introducing themselves
  TurnX, //
  TurnO, //
  Over, // The game is over, do not use this state
  WinX, // X has won
  WinO, // O has won
  Draw, // Nobody wins
}

type TTTMessage =
  // Used for the initial introduction
  | { type: "hello"; name: string }
  // Marks the (i,j)-entry of the grid
  | { type: "move"; i: number; j: number; mark: TTTMark };

class TTTModel implements Model<TTTMessage> {
  // Internal stuff
  replay: number;
  // View
  view: TTTView;
  // TTT-specific stuff
  grid: Array<Array<TTTMark>>;
  me: string;
  myName: string;
  player: string;
  playerName: string;
  round: number;
  amIfirst: boolean;
  state: TTTState;

  constructor(view: TTTView) {
    this.view = view;
    // Init grid
    this.grid = new Array(3);
    for (let i = 0; i < 3; i++) {
      this.grid[i] = new Array(3);
      for (let j = 0; j < 3; j++) this.grid[i][j] = TTTMark.Null;
    }
    this.myName = this.playerName = this.round = undefined;
    this.round = 0;
    this.state = TTTState.Introductions;
  }

  async *init(id: string, replay: number): AsyncGenerator<Block<TTTMessage>> {
    this.me = id;
    this.replay = replay;
    // Introduce yourself, but only if we are not in replay mode
    //
    if (this.replay == 0)
      yield {
        index: undefined,
        session: id,
        mode: AccessControlMode.All,
        accessControlList: undefined,
        payload: { type: "hello", name: name },
      };
  }

  async *step(b: Block<TTTMessage>): AsyncGenerator<Block<TTTMessage>> {
    if (this.state > TTTState.Over) {
      // On game over, ignore all following messages
      return;
    }
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
        if (this.grid[b.payload.i][b.payload.j] != TTTMark.Null) {
          throw new Error("Invalid move");
        }
        let symbol: TTTMark =
          (b.session == this.me) == this.amIfirst ? TTTMark.X : TTTMark.O;
        this.grid[b.payload.i][b.payload.j] = symbol;
        if (this.updateState() > TTTState.Over) return;
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

  /**
   * Update `this.state` by checking whether
   * any player has won
   * @returns The updated game state
   */
  private updateState(): TTTState {
    // TODO: FIXME:
    return null;
  }
}

function main() {
  let name = "Lady Gaga";
  let server = "http://localhost:8080";
  const auth: Auth = new SessionManager().newSession(server);

  let view = new TTTViewImpl();
  let model = new TTTModel(view);
  const ctrl: Controller<TTTMessage> = new Controller(auth, view, model);
  ctrl.connect();
}
