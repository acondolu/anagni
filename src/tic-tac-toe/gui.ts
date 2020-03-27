import { ControllerError, View } from "../client/controller.js";
import { Prod } from "../types/common.js";

export interface TTTView {
  onMove: (i: number, j: number, value: string) => void;
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
  async onNewPlayer(index: number, name: string, mark: undefined) {
    throw new Error("STUB");
  }

  // TODO: ask for stuff
  async inputMove(
    allowed: Array<Array<boolean>>
  ): Promise<Prod<number, number>> {
    throw new Error("STUB"); // TODO:
  }
  async inputName(): Promise<string> {
    throw new Error("STUB"); // TODO:
  }
}
