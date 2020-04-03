import { Sum, left, right } from "../types/common.js";

type Kleisli<A, B> = (_: A) => AsyncGenerator<B>;

// Give Kleisli a category structure

/**
 * The identity morphism in the Kleisli category.
 * @type Kleisli<A, A>
 */
async function* id<A>(a: A) {
  yield a;
}

/**
 * The morphism composition in the Kleisli category.
 */
function compose<A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>) {
  return async function* (a: A) {
    for await (const b of f(a)) {
      yield* g(b);
    }
  };
}

// ArrowZero

function zero<A, B>(): Kleisli<A, B> {
  return async function* (a: A) {};
}

/**
 * Lifts a function to the Kleisli arrow.
 */
function arr<A, B>(f: (a: A) => Promise<B>): Kleisli<A, B> {
  return async function* (a: A): AsyncGenerator<B> {
    const b: B = await f(a);
    if (b) yield b;
  };
}

/**
 * Composition of machines:
 */
function loop<A, B, C, D>(
  g: Kleisli<C, D>,
  f: Kleisli<Sum<A, D>, Sum<B, C>>
): Kleisli<A, B> {
  return async function* (a: A) {
    async function* process(ad: Sum<A, D>): AsyncGenerator<B> {
      for await (const bc of f(ad))
        switch (bc.where) {
          case false:
            yield bc.content;
            break;
          case true:
            for await (const c of g(bc.content)) yield* process(right(c));
        }
    }
    yield* process(left(a));
  };
}

export function compose3<A, B, C>(
  g: (_: C) => Promise<B | undefined>,
  f: Kleisli<A, Sum<B, C>>
): Kleisli<A, B> {
  return async function* process(a: A): AsyncGenerator<B> {
    for await (const bc of f(a))
      switch (bc.where) {
        case false:
          yield bc.content;
          break;
        case true: {
          const b = await g(bc.content);
          if (b) yield b;
        }
      }
  };
}

/**
 * The AES encryption layer.
 * FIXME: Comment the use of AES-GCM
 * TODO: Crypt only the field of Block<.>
 */
type AESPayload = {
  iv: Uint8Array;
  data: Uint8Array;
};

class SimpleAES {
  key: CryptoKey;
  iv: Uint8Array;

  constructor(key: CryptoKey, iv: Uint8Array) {
    this.key = key;
    this.iv = iv;
  }

  async *event(
    e: Sum<AESPayload, Uint8Array>
  ): AsyncGenerator<Sum<AESPayload, Uint8Array>> {
    // let
    switch (e.where) {
      case false: {
        // Decrypt e.content
        const iv = e.content.iv;
        const c2 = await window.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: iv,
          },
          this.key,
          e.content.data
        );
        yield { where: true, content: new Uint8Array(c2) };
        break;
      }
      case true: {
        // Encrypt e.content
        this.iv = SimpleAES.ivIncrement(this.iv);
        const c = await window.crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: this.iv,
          },
          this.key,
          e.content
        );
        yield {
          where: false,
          content: { iv: this.iv, data: new Uint8Array(c) },
        };
      }
    }
  }

  /**
   * Increments the integer stored in a Uint8Array
   * according to the big-endian order.
   */
  static ivIncrement(iv: Uint8Array): Uint8Array {
    const iv2 = iv.slice();
    for (let i = iv2.length - 1; i >= 0; i--) {
      if (iv2[i] == 0xff) {
        iv2[i] = 0x00;
      } else {
        iv2[i] += 0x01;
        return iv2;
      }
    }
    throw new Error("Overflow error when incrementing the iv");
  }
}

/**
 * The JSON encoding layer.
 */

async function* JSONLayer<A>(
  e: Sum<string, A>
): AsyncGenerator<Sum<string, A>> {
  switch (e.where) {
    case false: {
      yield right(JSON.parse(e.content));
      break;
    }
    case true: {
      yield left(JSON.stringify(e.content));
    }
  }
}

/**
 * The UTF-8 encoding layer.
 */

async function* TextLayer(
  e: Sum<Uint8Array, string>
): AsyncGenerator<Sum<Uint8Array, string>> {
  switch (e.where) {
    case true: {
      let enc = new TextEncoder();
      yield left(enc.encode(e.content));
      break;
    }
    case false: {
      let dec = new TextDecoder();
      yield right(dec.decode(e.content));
    }
  }
}

// FIXME: remove these:
// test the types
let aes = new SimpleAES(null as any, null as any);

let a: Kleisli<string, string> = loop(id, JSONLayer);
let b: Kleisli<Uint8Array, Uint8Array> = loop(a, TextLayer);
let c: Kleisli<AESPayload, AESPayload> = loop(b, aes.event.bind(aes));

// let d: Transition<string, Uint8Array> = composeMachines(JSONLayer, TextLayer);

/**
 * A state-transition machine, parametrized by the types of
 * Events (input) and Actions (output).
 */
export type Transition<Event, Action> = Kleisli<Event, Action>;
