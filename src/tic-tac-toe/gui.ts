import { GameEvent, GameState } from "./game.js";
import { Statement } from "../types/commands.js";
// import { mk } from "./test.js";

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

export class TTTGUI {
  grid: HTMLTableElement;
  state: HTMLParagraphElement;
  nextMove: Promise<number> | undefined;
  nameInputDiv: HTMLDivElement;
  playerXname: HTMLSpanElement;
  playerOname: HTMLSpanElement;

  constructor() {
    // mk();
    this.grid = document.getElementById("grid") as HTMLTableElement;
    this.grid.style.display = "none";
    this.state = document.getElementById("gameState") as HTMLParagraphElement;
    this.nameInputDiv = document.getElementById("playerNameInputDiv") as HTMLDivElement;
    this.playerXname = document.getElementById("playerXname") as HTMLSpanElement;
    this.playerOname = document.getElementById("playerOname") as HTMLSpanElement;
    this.state.style.display = "";
  }

  render(state: GameState) {
    switch (state._) {
      case "init":
        this.grid.style.display = "none";
        this.nameInputDiv.style.display = "none";
        this.state.innerText = "Waiting for initialisation";
        break;
      case "intro X":
        this.grid.style.display = "none";
        // this.nameInputDiv.style.display = "none";
        this.state.innerText = "Waiting for the name of X player";
        break;
      case "intro O":
        this.grid.style.display = "none";
        // this.nameInputDiv.style.display = "none";
        this.playerXname.innerText = state.playerX.name;
        this.state.innerText = "Waiting for the name of O player";
        break;
      case "turn":
        this.grid.style.display = "";
        this.nameInputDiv.style.display = "none";
        this.playerXname.innerText = state.playerX.name;
        this.playerOname.innerText = state.playerO.name;
        this.state.innerText = "It is " + state.player + "'s turn.";
        break;
      case "over":
        this.grid.style.display = "";
        this.nameInputDiv.style.display = "none";
        if (state.winner == Mark.Null) {
          this.state.innerText = "Game over. Draw.";
        } else {
          this.state.innerText = "Game over. " + state.winner + "wins.";
        }
    }
  }

  // (this.grid.rows.item(i / 3) as any).cells.item(i % 3).innerText = value;

  async input(i: InputRequest): Promise<Statement<GameEvent>> {
    console.log("TTT GUI: input requested", i);
    switch (i._) {
      case "name":
        // console.log("STUB", i);
        return this.makeStatement({
          _: "name",
          name: prompt("Name") as string,
        });
        // throw new Error("STUB"); // TODO:
        break;
      case "move":
        // throw new Error("STUB"); // TODO:
        return this.makeStatement({
          _: "move",
          i: parseInt(prompt("Move") as string),
          mark: (undefined as unknown) as Mark,
        });
    }
  }

  private makeStatement(payload: GameEvent): Statement<GameEvent> {
    return {
      index: (undefined as unknown) as any,
      replica: (undefined as unknown) as any,
      time: (undefined as unknown) as any,
      // mode: AccessControlMode.All,
      // accessControlList: [],
      payload,
    };
  }
}
