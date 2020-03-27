import { ControllerError, View } from "../client/controller.js";

export interface TTTView {
  onMove: (i: number, j: number, value: string) => void;
}

export class TTTViewImpl implements View, TTTView {
  table: HTMLTableElement;

  constructor() {}

  error: (err: ControllerError, reason?: any) => {};
  connected: () => {};
  disconnected: () => {};

  onMove(i: number, j: number, value: string) {
    this.table.rows.item(i).cells.item(j).innerText = value;
  }

  inputMove(allowed: Array<Array<boolean>>) {
    // TODO:
  }
}
