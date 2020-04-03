import { Replica } from "../client/follower.js";
import { Statement } from "../types/commands.js";
import { InputRequest, Mark } from "./gui.js";
import { Sum, right as input } from "../types/common.js";

export type GameEvent =
  // Used for the initial introduction
  | { _: "name"; name: string }
  // Mark the i-th entry of the grid
  | { _: "move"; i: number; mark: Mark };

// const enum GameState {
//   IntroX, // Waiting for Player X's name
//   IntroO, // Waiting for Player O's name
//   TurnX, // X's turn
//   TurnO, // O's turn
//   Over, // Game over! (Unused state)
//   WinX, // X has won
//   WinO, // O has won
//   Draw, // Nobody wins
// }

type Player = {
  id: string;
  name: string;
};

type GameState =
  | { _: "init" }
  | { _: "intro X"; id: string }
  | { _: "intro O"; id: string; playerX: Player }
  | {
      _: "turn O" | "turn X";
      id: string;
      playerX: Player;
      playerO: Player;
      grid: Mark[];
    }
  | { _: "over"; winner: Mark };

export class TicTacToe implements Replica<GameEvent, InputRequest> {
  private state: GameState;
  constructor() {
    this.state = { _: "init" };
  }

  async *init(id: string): AsyncGenerator<Sum<never, InputRequest>> {
    this.state = { _: "intro X", id: id };
    // Request the name of the human user
    yield input({ _: "name" });
  }

  /**
   *
   */
  async *dispatch(
    b: Statement<GameEvent>
  ): AsyncGenerator<Sum<never, InputRequest>> {
    if (this.state._.startsWith("over")) {
      return; // Game Over!
    }
    console.log("dispath", b);
    switch (b.payload._) {
      case "name":
        switch (this.state._) {
          case "intro X":
            this.state = {
              _: "intro O",
              id: this.state.id,
              playerX: {
                id: b.replica,
                name: b.payload.name,
              },
            };
            break;
          case "intro O":
            this.state = {
              _: "turn X",
              id: this.state.id,
              playerX: this.state.playerX,
              playerO: {
                id: b.replica,
                name: b.payload.name,
              },
              grid: new Array(9).fill(Mark.Null),
            };
            break;
          default:
            this.error("Late introduction");
        }
        if (b.payload.name.length == 0) {
          return this.error("Empty name");
        }
        break;
      case "move":
        if (this.state._ != "turn X" && this.state._ != "turn O") {
          throw new Error();
        }
        // Check if the move is legal
        if (this.state.grid[b.payload.i] != Mark.Null) {
          return this.error("Invalid move");
        }
        let symbol: Mark = b.replica == this.state.playerX.id ? Mark.X : Mark.O;
        this.state.grid[b.payload.i] = symbol;
        const winner = TicTacToe.checkGameOver(this.state.grid);
        if (winner !== undefined) {
          this.state = { _: "over", winner };
          return;
        }
    }
    // Request a "move" input from the user
    // (in case this is their turn)
    if (
      (this.state._ == "turn O" && this.state.id == this.state.playerO.id) ||
      (this.state._ == "turn X" && this.state.id == this.state.playerX.id)
    )
      yield input({ _: "move", grid: this.state.grid });
  }

  private error(reason: string) {
    throw new Error(reason);
  }

  /**
   * Update `this.state` by checking whether
   * any player has won
   * @returns The updated game state
   */
  static checkGameOver(squares: Mark[]): Mark | undefined {
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
          return Mark.O;
        } else {
          return Mark.X;
        }
      }
    }
    // Is the game draw?
    if (squares.every((m: Mark) => m != Mark.Null)) return Mark.Null;
    // Keep playing!
    return;
  }
}
