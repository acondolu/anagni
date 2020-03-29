import { Sum } from "../types/common";

/**
 * A state-transition machine, parametrized by the types of
 * Events (input) and Actions (output).
 */
export type Transition<Event, Action> = (e: Event) => AsyncGenerator<Action>;

/**
 * The identity machine: you reap what you sow.
 */
function idMachine<T>(): Transition<T, T> {
  return async function* (e: T) {
    yield e;
  };
}

/**
 * Composition of machines:
 */
function composeMachines<EventX, ActionX, EventY, ActionY>(
  f: Transition<EventX, ActionX>,
  g: Transition<Sum<EventY, ActionX>, Sum<EventX, ActionY>>
): Transition<EventY, ActionY> {
  return async function* (e: EventY) {
    async function* process(ea: Sum<EventY, ActionX>) {
      for await (const eax of g(ea))
        switch (eax.where) {
          case true:
            yield eax.content;
            break;
          case false:
            for await (const c of f(eax.content))
              yield* process({ where: true, content: c });
        }
    }
    yield* process({ where: false, content: e });
  };
}

function composeMachines2<EventX, ActionX, EventY>(
  f: Transition<EventX, ActionX>,
  g: Transition<EventY, Sum<EventX, ActionX>>
): Transition<EventY, ActionX> {
  return async function* process(ea: EventY): AsyncGenerator<ActionX> {
    for await (const eax of g(ea))
      switch (eax.where) {
        case true:
          yield eax.content;
          break;
        case false:
          yield* f(eax.content);
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
  ): AsyncGenerator<Sum<Uint8Array, AESPayload>> {
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
        yield { where: false, content: new Uint8Array(c2) };
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
          where: true,
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

async function* JSONLayer(
  e: Sum<string, any>
): AsyncGenerator<Sum<any, string>> {
  switch (e.where) {
    case false: {
      yield { where: false, content: JSON.parse(e.content) };
      break;
    }
    case true: {
      yield { where: true, content: JSON.stringify(e.content) };
    }
  }
}

/**
 * The UTF-8 encoding layer.
 */

async function* TextLayer(
  e: Sum<Uint8Array, string>
): AsyncGenerator<Sum<string, Uint8Array>> {
  switch (e.where) {
    case true: {
      let enc = new TextEncoder();
      yield { where: true, content: enc.encode(e.content) };
      break;
    }
    case false: {
      let dec = new TextDecoder();
      yield { where: false, content: dec.decode(e.content) };
    }
  }
}

// FIXME: remove these:
// test the types
let aes = new SimpleAES(null, null);

let a: Transition<string, string> = composeMachines(idMachine(), JSONLayer);
let b: Transition<Uint8Array, Uint8Array> = composeMachines(a, TextLayer);
let c: Transition<AESPayload, AESPayload> = composeMachines(
  b,
  aes.event.bind(aes)
);

// let d: Transition<string, Uint8Array> = composeMachines(JSONLayer, TextLayer);
