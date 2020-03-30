import { strict as assert } from "assert";
import "mocha";
import { TicTatToe } from "../tic-tac-toe/game.js";

describe("Tic-tac-toe", function () {
  it("init", async function () {
    const t = new TicTatToe(undefined);
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
