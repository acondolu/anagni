import { Auth } from "./controller.js";
import { RoomId, Binary } from "src/types/messages.js";

export class SessionManager {
  static sessionKey = "anagni-session";
  crypto: Crypto;

  constructor() {
    this.crypto = new Crypto();
  }

  static fromCache(): Auth | null {
    if (typeof Storage === "undefined") return null;
    let result = sessionStorage.getItem(SessionManager.sessionKey);
    return JSON.parse(result);
  }

  static newSession(room?: RoomId): Auth {
    const session = SessionManager.random();
    const secret = SessionManager.random();
    if (!room) room = SessionManager.random();
    const auth: Auth = {
      type: "simple",
      session,
      room,
      sessionSecret: secret,
      roomSecret: "super-secret", // FIXME: refactor, should not be here!!! only in the encryption layer
    };
    sessionStorage.setItem(SessionManager.sessionKey, JSON.stringify(auth));
    return auth;
  }

  static random(): Binary {
    return new ArrayBuffer(8);
  }

  randomS(): string {
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
