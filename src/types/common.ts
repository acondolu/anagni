/**
 * The tagged sum of two given types.
 * @typedef Sum
 */
export type Sum<A, B> =
  | { where: false; content: A }
  | { where: true; content: B };

/**
 * The tagged product of two given types.
 * @typedef Prod
 */
export type Prod<A, B> = { a: A; b: B };
