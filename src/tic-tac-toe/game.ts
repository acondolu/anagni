import { Model } from "../client/controller.js";
import { Statement } from "../types/commands.js";
import { TTTView, InputRequest, Mark } from "./gui.js";
import { Sum, right as input } from "../types/common.js";

const enum GameState {
  IntroX, // Waiting for Player X's name
  IntroO, // Waiting for Player O's name
  TurnX, // X's turn
  TurnO, // O's turn
  Over, // Game over! (Unused state)
  WinX, // X has won
  WinO, // O has won
  Draw, // Nobody wins
}

type Player = {
  id: string;
  name: string;
};

export type GameEvent =
  // Used for the initial introduction
  | { _: "name"; name: string }
  // Mark the i-th entry of the grid
  | { _: "move"; i: number; mark: Mark };

export class TicTatToe implements Model<GameEvent, InputRequest> {
  // Internal stuff
  id: string;
  // View
  view: TTTView;
  // TTT-specific stuff
  grid: Mark[];
  state: GameState;
  playerX: Player;
  playerO: Player;

  constructor(view: TTTView) {
    this.view = view;
    this.grid = new Array(9).fill(Mark.Null);
    this.state = GameState.IntroX;
    this.playerX = this.playerO = undefined;
  }

  async *init(
    id: string
  ): AsyncGenerator<Sum<Statement<GameEvent>, InputRequest>> {
    // Store the identifier of this replica/player
    this.id = id;
    // Request the name of the human user
    yield input({ _: "name" });
  }

  /**
   *
   */
  async *dispatch(
    b: Statement<GameEvent>
  ): AsyncGenerator<Sum<never, InputRequest>> {
    if (this.state > GameState.Over) {
      return; // Game Over!
    }
    switch (b.payload._) {
      case "name":
        switch (this.state) {
          case GameState.IntroX:
            this.playerX = {
              id: b.replica,
              name: b.payload.name,
            };
            this.state = GameState.IntroO;
            break;
          case GameState.IntroO:
            this.playerO = {
              id: b.replica,
              name: b.payload.name,
            };
            this.state = GameState.TurnX;
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
        if (this.grid[b.payload.i] != Mark.Null) {
          return this.error("Invalid move");
        }
        let symbol: Mark = b.replica == this.playerX.id ? Mark.X : Mark.O;
        this.grid[b.payload.i] = symbol;
        if (this.checkGameOver() > GameState.Over) {
          switch (this.state) {
            case GameState.WinX:
              return this.view.onWinner(0, this.playerX.name);
            case GameState.WinO:
              return this.view.onWinner(1, this.playerO.name);
            case GameState.Draw:
              return this.view.onDraw();
          }
          return;
        }
    }
    // Request a "move" input from the user
    // (in case this is their turn)
    if (
      (this.state == GameState.TurnO && this.id == this.playerO.id) ||
      (this.state == GameState.TurnX && this.id == this.playerX.id)
    )
      yield input({ _: "move", grid: this.grid });
  }

  private error(reason: string) {
    throw new Error(reason);
  }

  /**
   * Update `this.state` by checking whether
   * any player has won
   * @returns The updated game state
   */
  private checkGameOver(): GameState {
    const squares = this.grid;
    // Is there a winner?
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
    for (let i = 0; i < 8; i++) {
      const [a, b, c] = lines[i];
      if (
        squares[a] != Mark.Null &&
        squares[a] === squares[b] &&
        squares[b] === squares[c]
      ) {
        if (squares[a] == Mark.O) {
          return (this.state = GameState.WinO);
        } else {
          return (this.state = GameState.WinX);
        }
      }
    }
    // Is the game draw?
    if (squares.every((m: Mark) => m != Mark.Null))
      return (this.state = GameState.Draw);
    // Keep playing!
    return this.state;
  }
}
