import { ControllerError, View } from "../client/controller.js";
import { Prod } from "../types/common.js";

export interface TTTView {
  // events
  onNewPlayer: (index: number, name: string) => any;
  onMove: (i: number, j: number, value: string) => any;
  onWinner: (winner: number, name: string) => any;
  onDraw: () => any;

  requestName: () => Promise<string>;
  requestMove: (
    allowed: Array<Array<boolean>>
  ) => Promise<Prod<number, number>>;
}

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

  // TODO: ask for stuff
  async requestMove(
    allowed: Array<Array<boolean>>
  ): Promise<Prod<number, number>> {
    throw new Error("STUB"); // TODO:
  }
  async requestName(): Promise<string> {
    throw new Error("STUB"); // TODO:
  }
}
