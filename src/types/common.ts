/**
 * The tagged sum of two given types.
 * @typedef Sum
 */
export type Sum<A, B> =
  | { where: false; content: A }
  | { where: true; content: B };

export function left<A, B>(a: A): Sum<A, B> {
  return { where: false, content: a };
}
export function right<A, B>(b: B): Sum<A, B> {
  return { where: true, content: b };
}

/**
 * The tagged product of two given types.
 * @typedef Prod
 */
export type Prod<A, B> = { a: A; b: B };

export function pair<A, B>(a: A, b: B): Prod<A, B> {
  return { a, b };
}
