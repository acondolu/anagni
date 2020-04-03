import { strict as assert } from "assert";
import "mocha";
import { TicTacToe } from "../tic-tac-toe/game.js";
import { Mark } from "../tic-tac-toe/gui.js";

describe("Tic-tac-toe", function () {
  it("init", async function () {
    const t = new TicTacToe();
    let initted = false;
    for await (const x of t.init("")) {
      if (initted) assert.fail("Two many init things");
      initted = true;
      switch (x.where) {
        case false:
          assert.fail("Init statements fired");
        case true:
          assert.equal(x.content._, "name");
      }
    }
  });
});

describe("Tic-tac-toe: checkGameOver", function () {
  it("X wins", function () {
    assert.equal(
      TicTacToe.checkGameOver([
        Mark.X,
        Mark.O,
        Mark.O,
        Mark.X,
        Mark.O,
        Mark.O,
        Mark.X,
        Mark.X,
        Mark.X,
      ]),
      Mark.X
    );
  });

  it("O wins", function () {
    assert.equal(
      TicTacToe.checkGameOver([
        Mark.X,
        Mark.O,
        Mark.O,
        Mark.X,
        Mark.O,
        Mark.O,
        Mark.Null,
        Mark.O,
        Mark.Null,
      ]),
      Mark.O
    );
  });

  it("draw", function () {
    assert.equal(
      TicTacToe.checkGameOver([
        Mark.X,
        Mark.O,
        Mark.O,
        Mark.O,
        Mark.X,
        Mark.X,
        Mark.X,
        Mark.O,
        Mark.O,
      ]),
      Mark.Null
    );
  });
});
