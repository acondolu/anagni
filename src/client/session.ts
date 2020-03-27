import { Auth } from "./controller.js";

// Problem: node/browser compatibility
class Crypto {
  counter: number;
  constructor() {
    console.warn("!!! Crypto class implemented in session.ts is a STUB !!!");
    this.counter = 0;
  }
  getRandomValues(a: Uint16Array) {
    a[0] = this.counter++;
  }
}

class Storage {
  map: Map<string, string>;
  constructor() {
    console.warn("!!! Storage class implemented in session.ts is a STUB !!!");
    this.map = new Map();
  }
  getItem(k: string) {
    return this.map.get(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}
const sessionStorage = new Storage();

export class SessionManager {
  static sessionKey = "anagni-session";
  crypto: Crypto;

  constructor() {
    this.crypto = new Crypto();
  }

  fromCache(): Auth | null {
    if (typeof Storage === "undefined") return null;
    let result = sessionStorage.getItem(SessionManager.sessionKey);
    return JSON.parse(result);
  }

  newSession(server: string, room?: string): Auth {
    const session = this.random();
    const secret = this.random();
    if (!room) room = this.random();
    const auth: Auth = {
      type: "simple",
      session,
      room,
      secret,
      server,
    };
    sessionStorage.setItem(SessionManager.sessionKey, JSON.stringify(auth));
    return auth;
  }

  random(): string {
    let arr: Uint16Array = new Uint16Array(4);
    this.crypto.getRandomValues(arr);
    return String.fromCharCode.apply(null, arr);
  }

  str2ab(str) {
    // TODO: TAKEN from google, refactor
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
}
