import { Model } from "../client/controller.js";
import { Statement } from "../types/commands.js";
import { TTTView, Input } from "./gui.js";
import { Sum, right } from "../types/common.js";

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
  | { _: "hello"; name: string }
  // Marks the (i,j)-entry of the grid
  | { _: "move"; i: number; mark: TTTMark };

export class TicTatToe implements Model<TTTMessage, Input> {
  // Internal stuff
  id: string;
  // View
  view: TTTView;
  // TTT-specific stuff
  squares: TTTMark[];
  state: TTTState;
  playerX: Player;
  playerO: Player;

  constructor(view: TTTView) {
    this.view = view;
    // Init grid
    this.squares = new Array(3);
    for (let i = 0; i < 9; i++) {
      this.squares[i] = TTTMark.Null;
    }
    this.state = TTTState.IntroX;
    this.playerX = this.playerO = undefined;
  }

  async *init(id: string): AsyncGenerator<Sum<Statement<TTTMessage>, Input>> {
    this.id = id;
    // Ask for name input
    yield right({ _: "name" });
  }

  async *dispatch(
    b: Statement<TTTMessage>
  ): AsyncGenerator<Sum<Statement<TTTMessage>, Input>> {
    if (this.state > TTTState.Over) {
      // On game over, ignore all messages that follow
      return;
    }
    switch (b.payload._) {
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
        if (this.squares[b.payload.i] != TTTMark.Null) {
          return this.error("Invalid move");
        }
        let symbol: TTTMark =
          b.replica == this.playerX.id ? TTTMark.X : TTTMark.O;
        this.squares[b.payload.i] = symbol;
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
    }
    // Play, if this is your turn
    switch (this.state) {
      case TTTState.TurnO:
        if (this.id == this.playerO.id)
          yield right({ _: "turn", board: this.allowed() });
        break;
      case TTTState.TurnX:
        if (this.id == this.playerX.id)
          yield right({ _: "turn", board: this.allowed() });
        break;
    }
  }

  private allowed(): boolean[] {
    let ret: boolean[] = new Array();
    for (const s of this.squares) {
      ret.push(s === TTTMark.Null);
    }
    return ret;
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
    const squares = this.squares;
    const lines: number[][] = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    let winner: TTTMark = TTTMark.Null;
    for (let i = 0; i < 8; i++) {
      const [a, b, c] = lines[i];
      if (
        squares[a] != TTTMark.Null &&
        squares[a] === squares[b] &&
        squares[b] === squares[c]
      ) {
        winner = squares[a];
        break;
      }
    }
    switch (winner) {
      case TTTMark.Null:
        return this.state;
      case TTTMark.O:
        return (this.state = TTTState.WinO);
      case TTTMark.X:
        return (this.state = TTTState.WinX);
    }
  }
}
