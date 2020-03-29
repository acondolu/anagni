import { Control, Auth, Model } from "../client/controller.js";
import { Statement, AccessControlMode } from "../types/messages.js";
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

export type TTTMessage =
  // Used for the initial introduction
  | { type: "hello"; name: string }
  // Marks the (i,j)-entry of the grid
  | { type: "move"; i: number; j: number; mark: TTTMark };

export class TicTatToe implements Model<TTTMessage> {
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

  constructor() {
    this.view = new TTTViewImpl();
    // Init grid
    this.grid = new Array(3);
    for (let i = 0; i < 3; i++) {
      this.grid[i] = new Array(3);
      for (let j = 0; j < 3; j++) this.grid[i][j] = TTTMark.Null;
    }
    this.state = TTTState.IntroX;
    this.playerX = this.playerO = undefined;
  }

  async *init(
    id: string,
    replay: number
  ): AsyncGenerator<Statement<TTTMessage>> {
    this.id = id;
    this.replay = replay;
    // Introduce yourself, but only if not in replay mode
    if (this.replay == 0) {
      let name: string = await this.view.requestName();
      yield this.wrapBlock({ type: "hello", name: name });
    }
  }

  async *dispatch(
    b: Statement<TTTMessage>
  ): AsyncGenerator<Statement<TTTMessage>> {
    if (this.state > TTTState.Over) {
      // On game over, ignore all messages that follow
      return;
    }
    switch (b.payload.type) {
      case "hello":
        switch (this.state) {
          case TTTState.IntroX:
            this.playerX = {
              id: b.replica,
              name: b.payload.name,
            };
            this.state = TTTState.IntroO;
            break;
          case TTTState.IntroO:
            this.playerO = {
              id: b.replica,
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
          b.replica == this.playerX.id ? TTTMark.X : TTTMark.O;
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
        if (b.replica == this.id && this.replay > 0) {
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

  private wrapBlock(payload: TTTMessage): Statement<TTTMessage> {
    return {
      index: undefined,
      replica: undefined,
      mode: AccessControlMode.All,
      accessControlList: undefined,
      payload,
    };
  }
}
