import { GameEvent } from "./game.js";
import { Statement } from "../types/commands.js";

export interface TTTView {
  // events
  onNewPlayer: (index: number, name: string) => any;
  onMove: (i: number, value: string) => any;
  onWinner: (winner: number, name: string) => any;
  onDraw: () => any;
}

export const enum Mark {
  Null = "",
  X = "X",
  O = "O",
}

export type InputRequest =
  | { _: "name" }
  | {
      _: "move";
      grid: Mark[];
    };

export class TTTViewImpl implements TTTView {
  grid: HTMLTableElement;
  state: HTMLParagraphElement;

  constructor() {
    this.grid = document.getElementById("grid") as HTMLTableElement;
    this.state = document.getElementById("gameState") as HTMLParagraphElement;
  }

  // TTTView events
  async onMove(i: number, value: string) {
    this.grid.rows.item(i / 3).cells.item(i % 3).innerText = value;
  }
  async onNewPlayer(index: number, name: string) {
    throw new Error("STUB");
  }
  async onWinner(index: number, name: string) {
    throw new Error("STUB");
  }
  async onDraw() {
    throw new Error("STUB");
  }

  async input(i: InputRequest): Promise<Statement<GameEvent>> {
    // TODO: also, use this.makeStatement
    switch (i._) {
      case "name":
        throw new Error("STUB"); // TODO:
      case "move":
        throw new Error("STUB"); // TODO:
    }
  }

  private makeStatement(payload: GameEvent): Statement<GameEvent> {
    return {
      index: undefined,
      replica: undefined,
      // mode: AccessControlMode.All,
      // accessControlList: [],
      payload,
    };
  }
}
