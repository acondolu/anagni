import { TTTMessage } from "./game.js";
import { Statement, AccessControlMode } from "../types/messages.js";

export interface TTTView {
  // events
  onNewPlayer: (index: number, name: string) => any;
  onMove: (i: number, j: number, value: string) => any;
  onWinner: (winner: number, name: string) => any;
  onDraw: () => any;
}

export type Input =
  | { _: "name" }
  | {
      _: "turn";
      board: boolean[];
    };

export class TTTViewImpl implements TTTView {
  grid: HTMLTableElement;
  state: HTMLParagraphElement;

  constructor() {
    this.grid = document.getElementById("grid") as HTMLTableElement;
    this.state = document.getElementById("gameState") as HTMLParagraphElement;
  }

  // TTTView events
  async onMove(i: number, j: number, value: string) {
    this.grid.rows.item(i).cells.item(j).innerText = value;
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

  async input(i: Input): Promise<Statement<TTTMessage>> {
    // TODO: also, use this.makeStatement
    switch (i._) {
      case "name":
        throw new Error("STUB"); // TODO:
      case "turn":
        throw new Error("STUB"); // TODO:
    }
  }

  private makeStatement(payload: TTTMessage): Statement<TTTMessage> {
    return {
      index: undefined,
      replica: undefined,
      mode: AccessControlMode.All,
      accessControlList: [],
      payload,
    };
  }
}
