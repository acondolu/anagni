import { Auth } from "./follower.js";
import { randomBytes } from "crypto";

class Crypto {
  /**
   * @param bytesNo The number of bytes
   */
  static getRandomBytes(bytesNo: number): Uint16Array {
    if (typeof window === "undefined") {
      // Node
      const buf = randomBytes(bytesNo);
      return new Uint16Array(
        buf.buffer,
        buf.byteOffset,
        bytesNo / Uint16Array.BYTES_PER_ELEMENT
      );
    } else {
      // Browser
      const uint16arr = new Uint16Array(
        bytesNo / Uint16Array.BYTES_PER_ELEMENT
      );
      window.crypto.getRandomValues(uint16arr);
      return uint16arr;
    }
  }
}

class LocalStorage {
  static map: Map<string, string> = new Map();
  getItem(k: string) {
    if (sessionStorage) {
      return sessionStorage.getItem(k);
    } else {
      return LocalStorage.map.get(k);
    }
  }
  setItem(k: string, v: string) {
    if (sessionStorage) {
      return sessionStorage.setItem(k, v);
    } else {
      LocalStorage.map.set(k, v);
    }
  }
}

export class SessionManager {
  static sessionKey = "anagni-session";

  fromCache(): Auth | undefined {
    if (typeof LocalStorage === "undefined") return;
    let result = sessionStorage.getItem(SessionManager.sessionKey);
    if (!result) return;
    return JSON.parse(result);
  }

  newSession(server: string, room?: string): Auth {
    const session = this.random();
    const secret = this.random();
    if (!room) room = this.random();
    const auth: Auth = {
      type: "simple",
      replicaId: session,
      db: room,
      secret,
      server,
      // additional: ""
    };
    sessionStorage.setItem(SessionManager.sessionKey, JSON.stringify(auth));
    return auth;
  }

  random(): string {
    const arr: Uint16Array = Crypto.getRandomBytes(8);
    return String.fromCharCode.apply(null, Array.from(arr));
  }

  str2ab(str: string) {
    // TODO: TAKEN from google, refactor
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
}

// interface Auth {
//   server: string; // URL
//   session: string;
//   room: string;
// }

// class SimpleAuth implements Auth {
//   type: "simple";
//   server: string; // URL
//   session: string;
//   room: string;
//   secret: string;
//   additional: string;

//   static parse(str: string): Auth {
//     const a = new Auth();
//     if (str[0] != "\xa0")
//       // Only type="simple" supported for now
//       return;
//     a.
//     return a;
//   }

//   stringify(): string {
//     const b = new Array<string>();
//     b.push("\xa0");

//     return btoa(
//       escape(auth.room + auth.session + auth.secret)
//     );
//   }
// };
