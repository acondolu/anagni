import {
  // AccessControlMode,
  Statement,
  AuthRequest,
  WelcomeResponse,
  FailureResponse,
} from "../types/commands.js";
import { Socket } from "../types/socket.js";

// const enum SocketState {
//   None,
//   Idle,
//   Streaming,
//   Delete,
// }

type SocketState =
  | { _: "none" }
  | { _: "idle"; socket: Socket }
  | { _: "streaming"; socket: Socket }
  | { _: "delete"; socket: Socket };

type Replica = {
  id: string;
  db: string;
  secret: string;
  state: SocketState;
  sentStatementsNo: number;
  receivedStatementsNo: number;
};

type Database<T> = {
  log: Array<Readonly<Statement<T>>>;
  replicas: Map<string, Replica>;
};

/**
 * A simple in-memory single-node Anagni server.
 */
export class Server<T> {
  private dbs: Map<string, Database<T>>;
  private sockets: Map<Socket, Replica>;

  constructor() {
    this.dbs = new Map();
    this.sockets = new Map();
    Object.seal(this);
  }

  private async sendMore(db: Database<T>, replica: Replica) {
    switch (replica.state._) {
      case "streaming":
        let log = db.log;
        if (log.length > replica.sentStatementsNo) {
          // Send one more log
          // Enforce access mode!
          const b: Statement<T> = log[replica.sentStatementsNo];
          // let obscure = false;
          // switch (b.mode) {
          //   case AccessControlMode.Only:
          //     obscure = b.accessControlList.indexOf(replica.id) == -1;
          //     break;
          //   case AccessControlMode.Except:
          //     obscure = b.accessControlList.indexOf(replica.id) != -1;
          //     break;
          // }
          // const bCopy: Statement<T> = {
          //   index: b.index,
          //   replica: b.replica,
          //   mode: b.mode,
          //   accessControlList: b.accessControlList,
          //   payload: obscure ? null : b.payload,
          // };
          replica.state.socket.emit("push", b);
          replica.sentStatementsNo += 1;
          // Call again
          this.sendMore(db, replica);
        } else {
          // No more logs to send, set the state to Idle
          replica.state = {
            _: "idle",
            socket: replica.state.socket,
          };
        }
        return;
      case "none":
        return;
      case "delete":
        return this.freeSocket(replica, replica.state.socket);
      case "idle":
        throw new Error("Idle state is not possible");
    }
  }

  private emitUpdate(db: Database<T>) {
    for (const id of db.replicas.keys()) {
      const replica = db.replicas.get(id);
      if (replica && replica.state._ == "idle") {
        replica.state = {
          _: "streaming",
          socket: replica.state.socket,
        };
        this.sendMore(db, replica);
      }
    }
  }

  join(socket: Socket, j: AuthRequest) {
    let replica = this.sockets.get(socket);
    //
    if (replica) {
      return socket.emit("err", FailureResponse.AlreadyJoined);
    }
    //
    let db = this.dbs.get(j.db);
    if (!db) {
      // Create new database
      db = {
        log: new Array(),
        replicas: new Map(),
      };
      this.dbs.set(j.db, db);
    }
    // Check if the replica is already existing
    replica = db.replicas.get(j.replica);
    if (replica) {
      // Check secret
      if (replica.secret != j.secret || replica.db != j.db) {
        return socket.emit("err", FailureResponse.WrongSession);
      }
      if (replica.state._ == "idle" || replica.state._ == "streaming") {
        // Invalidate previous socket connection
        replica.state.socket.emit("err", FailureResponse.OtherConnection);
        replica.state.socket.disconnect();
      }
      replica.state = { _: "idle", socket: socket };
    } else {
      // Create new replica
      replica = {
        id: j.replica,
        db: j.db,
        secret: j.secret,
        state: { _: "idle", socket: socket },
        sentStatementsNo: 0,
        receivedStatementsNo: 0,
      } as Replica;
      db.replicas.set(j.replica, replica);
    }
    this.sockets.set(socket, replica);
    replica.sentStatementsNo = j.receivedStatementsNo;

    const response: WelcomeResponse = {
      totalStatementsCount: db.log.length,
      yourStatementsCount: replica.receivedStatementsNo,
    };
    return socket.emit("okay", response);
  }

  push(socket: Socket, stmt: Statement<T>) {
    const replica = this.sockets.get(socket);
    if (!replica) {
      return socket.emit("err", FailureResponse.MustJoin);
    }
    const db = this.dbs.get(replica.db);
    if (!db) {
      throw new Error();
    }
    db.log.push(
      Object.freeze({
        index: db.log.length,
        replica: replica.id,
        time: new Date().getTime(),
        payload: stmt.payload,
        // mode: stmt.mode,
        // accessControlList: stmt.accessControlList,
      })
    );
    replica.receivedStatementsNo += 1;
    this.emitUpdate(db);
  }

  disconnect(socket: Socket, reason: string) {
    const replica = this.sockets.get(socket);
    if (!replica) return;
    switch (replica.state._) {
      case "idle":
        this.freeSocket(replica, socket);
        break;
      case "streaming":
        // Will be deleted by this.sendMore
        replica.state = {
          _: "delete",
          socket: socket,
        };
        return;
      case "delete":
        return;
      case "none":
        throw new Error("None state impossible when disconnecting");
    }
  }

  private freeSocket(replica: Replica, socket: Socket) {
    this.sockets.delete(socket);
    replica.state = { _: "none" };
    if (socket.connected) socket.disconnect();
  }
}
