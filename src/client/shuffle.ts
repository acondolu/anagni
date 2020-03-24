type Card = Array<number>;
type Deck = Array<Card>;
const realDeck: Deck = [
  [0, 0],
  [0, 0],
  [0, 0],
  [1, 0],
  [1, 0],
  [2, 0],
  [2, 0],
  [3, 0],
  [3, 0],
  [4, 0],
  [0, 1],
  [0, 1],
  [0, 1],
  [1, 1],
  [1, 1],
  [2, 1],
  [2, 1],
  [3, 1],
  [3, 1],
  [4, 1],
  [0, 2],
  [0, 2],
  [0, 2],
  [1, 2],
  [1, 2],
  [2, 2],
  [2, 2],
  [3, 2],
  [3, 2],
  [4, 2],
  [0, 3],
  [0, 3],
  [0, 3],
  [1, 3],
  [1, 3],
  [2, 3],
  [2, 3],
  [3, 3],
  [3, 3],
  [4, 3],
];

type Permutation = Uint8Array; // of length 50

/**
 * @param playersNo the number of other players
 */
function generateSecrets(playersNo: number): Array<Permutation> {
  if (playersNo < 2) {
    throw new Error("This protocol requires at least three players in total.");
  }
  // Note: 5 colors, 10 cards each = 50 cards total
  // but we are actually using 8 bits...
  // (wasting 100 bits per player)
  // create secret permutation
  const secret: Permutation = shuffle();
  // create a random
  const players: Array<Permutation> = new Array(playersNo);
  for (let i = 1; i < playersNo; i++) {
    players[i] = random();
  }
  // Patch player0
  players[0] = new Uint8Array(50);
  for (let j = 0; j < 50; j++) {
    let cur: number = secret[j];
    for (let i = 1; i < playersNo; i++) {
      cur = cur ^ players[i][j];
    }
    players[0][j] = cur;
  }
  return players;
}

/**
 * Generates a random Uint8Array of length 50.
 */
function random(): Permutation {
  const dst = new Uint8Array(50);
  for (let i = 0; i < 50; i++) dst[i] = Math.floor(Math.random() * 50);
  return dst;
}

/**
 * Returns a permutation of [0, ..., 49]
 */
function shuffle(): Permutation {
  // Perform a Fisher-Yates shuffle of
  // the [0, ..., 49] array
  const dst = new Uint8Array(50);
  for (let i = 0; i < 50; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j != i) {
      dst[i] = dst[j];
    } else {
      dst[j] = i;
    }
  }
  return dst;
}
