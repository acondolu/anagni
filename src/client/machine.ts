/**
 * A state-transition machine, parametrized
 */

type Transition<State, Event, Action> = (
  s: State,
  e: Event
) => Promise<{ s: State; as: Iterable<Action> }>;

function _yield<T>(x: T): Iterable<T> {
  return (function* () {
    yield x;
  })();
}

//
function idMachine<T>(): Transition<null, T, T> {
  return async (s: null, e: T) => {
    return {
      s,
      as: (function* () {
        yield e;
      })(),
    };
  };
}

// Composition of machines

type Sum<A, B> = { where: false; content: A } | { where: true; content: B };
type Prod<A, B> = {
  a: A;
  b: B;
};

function composeMachines<State, Event, Action, StateX, EventX, ActionX>(
  f: Transition<State, Event, Action>,
  g: Transition<StateX, Sum<EventX, Action>, Sum<Event, ActionX>>
): Transition<Prod<StateX, State>, EventX, ActionX> {
  return async (s: Prod<StateX, State>, e: EventX) => {
    const as: Array<ActionX> = new Array();
    let sX: StateX = s.a;
    let sY: State = s.b;
    const process = async (el: Sum<EventX, Action>) => {
      const res = await g(sX, el);
      sX = res.s;
      for (const eax of res.as)
        switch (eax.where) {
          case true:
            as.push(eax.content);
            break;
          case false:
            let res2 = await f(sY, eax.content);
            sY = res2.s;
            for (const ea of res2.as) process({ where: true, content: ea });
        }
    };
    await process({ where: false, content: e });
    return { s: { a: sX, b: sY }, as: as.values() };
  };
}

// Implementation of the AES layer
type AESState = {
  key: CryptoKey;
  iv: Uint8Array;
};
type AESPayload = {
  iv: Uint8Array;
  data: Uint8Array;
};

// AESLayer(): Transition<
//   AESState,
//   Sum<AESPayload, Uint8Array>,
//   Sum<Uint8Array, AESPayload>
// >
async function AESLayer(
  s: AESState,
  e: Sum<AESPayload, Uint8Array>
): Promise<{ s: AESState; as: Iterable<Sum<Uint8Array, AESPayload>> }> {
  let newState: AESState;
  let ret: Sum<Uint8Array, AESPayload>;
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
        s.key,
        e.content.data
      );
      ret = { where: false, content: new Uint8Array(c2) };
      newState = s;
      break;
    }
    case true: {
      // Encrypt e.content
      const iv = s.iv; // FIXME: generate new iv
      const c = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        s.key,
        e.content
      );
      ret = { where: true, content: { iv, data: new Uint8Array(c) } };
      newState = { iv, key: s.key };
      break;
    }
  }
  return { s: newState, as: _yield(ret) };
}

// JSON

async function JSONLayer(
  s: null,
  e: Sum<string, any>
): Promise<{ s: null; as: Iterable<Sum<any, string>> }> {
  switch (e.where) {
    case false: {
      return {
        s,
        as: _yield({ where: false, content: JSON.parse(e.content) }),
      };
    }
    case true: {
      return {
        s,
        as: _yield({ where: true, content: JSON.stringify(e.content) }),
      };
    }
  }
}

async function TextLayer(
  s: null,
  e: Sum<Uint8Array, string>
): Promise<{ s: null; as: Iterable<Sum<string, Uint8Array>> }> {
  switch (e.where) {
    case true: {
      let enc = new TextEncoder();
      return {
        s,
        as: _yield({ where: true, content: enc.encode(e.content) }),
      };
    }
    case false: {
      let dec = new TextDecoder();
      return {
        s,
        as: _yield({ where: false, content: dec.decode(e.content) }),
      };
    }
  }
}

// test the types

let a = composeMachines(idMachine(), JSONLayer);
let b = composeMachines(a, TextLayer);
let c = composeMachines(b, AESLayer);
