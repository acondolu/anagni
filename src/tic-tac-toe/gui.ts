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

export class TTTViewImpl implements View, TTTView {
  table: HTMLTableElement;

  constructor() {}

  // View events
  onError(err: ControllerError, reason?: any) {
    throw new Error("STUB"); // TODO:
  }
  onConnect() {
    throw new Error("STUB"); // TODO:
  }
  onDisconnect() {
    throw new Error("STUB"); // TODO:
  }

  // TTTView events
  async onMove(i: number, j: number, value: string) {
    this.table.rows.item(i).cells.item(j).innerText = value;
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
