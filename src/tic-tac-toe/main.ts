import { Controller, Auth, Model } from "../client/controller.js";
import { Block, AccessControlMode } from "../types/messages.js";
import { TTTView, TTTViewImpl } from "./gui.js";
import { SessionManager } from "../client/session.js";

const enum TTTMark {
  Null = "",
  X = "X",
  O = "O",
}

const enum TTTState {
  IntroX, // Waiting for Player X's intro
  IntroO, // Waiting for Player O's intro
  TurnX, //
  TurnO, //
  Over, // The game is over, do not use this state
  WinX, // X has won
  WinO, // O has won
  Draw, // Nobody wins
}

type Player = {
  id: string;
  name: string;
};

type TTTMessage =
  // Used for the initial introduction
  | { type: "hello"; name: string }
  // Marks the (i,j)-entry of the grid
  | { type: "move"; i: number; j: number; mark: TTTMark };

class TTTModel implements Model<TTTMessage> {
  // Internal stuff
  id: string;
  replay: number;
  // View
  view: TTTView;
  // TTT-specific stuff
  grid: Array<Array<TTTMark>>;
  state: TTTState;
  playerX: Player;
  playerO: Player;

  constructor(view: TTTView) {
    this.view = view;
    // Init grid
    this.grid = new Array(3);
    for (let i = 0; i < 3; i++) {
      this.grid[i] = new Array(3);
      for (let j = 0; j < 3; j++) this.grid[i][j] = TTTMark.Null;
    }
    this.state = TTTState.IntroX;
    this.playerX = this.playerO = undefined;
  }

  async *init(id: string, replay: number): AsyncGenerator<Block<TTTMessage>> {
    this.id = id;
    this.replay = replay;
    // Introduce yourself, but only if we are not in replay mode
    if (this.replay == 0) {
      let name: string = await this.view.requestName();
      yield this.wrapBlock({ type: "hello", name: name });
    }
  }

  async *step(b: Block<TTTMessage>): AsyncGenerator<Block<TTTMessage>> {
    if (this.state > TTTState.Over) {
      // On game over, ignore all following messages
      return;
    }
    switch (b.payload.type) {
      case "hello":
        switch (this.state) {
          case TTTState.IntroX:
            this.playerX = {
              id: b.session,
              name: b.payload.name,
            };
            this.state = TTTState.IntroO;
            break;
          case TTTState.IntroO:
            this.playerO = {
              id: b.session,
              name: b.payload.name,
            };
            this.state = TTTState.TurnX;
            break;
          default:
            this.error("Late introduction");
        }
        if (b.payload.name.length == 0) {
          return this.error("Empty name");
        }
        break;
      case "move":
        // Check if the move is legal
        if (this.grid[b.payload.i][b.payload.j] != TTTMark.Null) {
          return this.error("Invalid move");
        }
        let symbol: TTTMark =
          b.session == this.playerX.id ? TTTMark.X : TTTMark.O;
        this.grid[b.payload.i][b.payload.j] = symbol;
        if (this.updateState() > TTTState.Over) {
          switch (this.state) {
            case TTTState.WinX:
              return this.view.onWinner(0, this.playerX.name);
            case TTTState.WinO:
              return this.view.onWinner(1, this.playerO.name);
            case TTTState.Draw:
              return this.view.onDraw();
          }
          return;
        }
        // If replaying:
        if (b.session == this.id && this.replay > 0) {
          this.replay -= 1;
          yield b;
        }
    }
    if (this.replay > 0) return;
    // Play, if this is your turn
    switch (this.state) {
      case TTTState.TurnO:
        if (this.id == this.playerO.id) {
          let allowed = this.allowed();
          const { a, b } = await this.view.requestMove(allowed);
          yield this.wrapBlock({ type: "move", i: a, j: b, mark: TTTMark.O });
        }
        break;
      case TTTState.TurnX:
        if (this.id == this.playerX.id) {
          let allowed = this.allowed();
          const { a, b } = await this.view.requestMove(allowed);
          yield this.wrapBlock({ type: "move", i: a, j: b, mark: TTTMark.X });
        }
        break;
    }
  }

  private allowed(): boolean[][] {
    let g: boolean[][] = new Array();
    for (const row of this.grid) {
      const r: boolean[] = new Array();
      g.push(r);
      for (const entry of row) r.push(entry == TTTMark.Null);
    }
    return g;
  }

  private error(reason: string) {
    throw new Error(reason);
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

  private wrapBlock(payload: TTTMessage): Block<TTTMessage> {
    return {
      index: undefined,
      session: undefined,
      mode: AccessControlMode.All,
      accessControlList: undefined,
      payload,
    };
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
main();
