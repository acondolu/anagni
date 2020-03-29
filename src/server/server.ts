import {
  AccessControlMode,
  Statement,
  JoinMessage,
  OkayMessage,
  ErrorMessage,
} from "../types/messages.js";

export interface Socket {
  emit: (command: string, content: any) => void;
  disconnect: () => void;
  connected: boolean;
}

const enum SocketState {
  None,
  Idle,
  Streaming,
  Delete,
}

type Replica = {
  id: string;
  db: string;
  secret: string;
  socket: Socket | null;
  socketState: SocketState;
  sentStatementsNo: number;
  receivedStatementsNo: number;
};

type Database<T> = {
  log: Array<Readonly<Statement<T>>>;
  replicas: Map<string, Replica>;
};

export class Server<T> {
  dbs: Map<string, Database<T>>;
  sockets: Map<Socket, Replica>;

  constructor() {
    this.dbs = new Map();
    this.sockets = new Map();
    Object.seal(this);
  }

  private async sendMore(db: Database<T>, replica: Replica) {
    switch (replica.socketState) {
      case SocketState.Streaming:
        let log = db.log;
        if (log.length > replica.sentStatementsNo) {
          // Send one more log
          // Enforce access mode!
          const b = log[replica.sentStatementsNo];
          let obscure = false;
          switch (b.mode) {
            case AccessControlMode.Only:
              obscure = b.accessControlList.indexOf(replica.id) == -1;
              break;
            case AccessControlMode.Except:
              obscure = b.accessControlList.indexOf(replica.id) != -1;
              break;
          }
          const bCopy: Statement<T> = {
            index: b.index,
            replica: b.replica,
            mode: b.mode,
            accessControlList: b.accessControlList,
            payload: obscure ? null : b.payload,
          };
          replica.socket.emit("push", bCopy as Statement<T>);
          replica.sentStatementsNo += 1;
          // Call again
          this.sendMore(db, replica);
        } else {
          // No more logs to send, set the state to Idle
          replica.socketState = SocketState.Idle;
        }
        return;
      case SocketState.None:
      case SocketState.Delete:
        return;
      case SocketState.Idle:
        throw new Error("Idle state is not possible");
    }
  }

  private emitUpdate(db: Database<T>) {
    for (const id of db.replicas.keys()) {
      const replica = db.replicas.get(id);
      if (replica.socketState == SocketState.Idle) {
        replica.socketState = SocketState.Streaming;
        this.sendMore(db, replica);
      }
    }
  }

  join(socket: Socket, j: JoinMessage) {
    let replica: Replica = this.sockets.get(socket);
    //
    if (replica) {
      return socket.emit("err", ErrorMessage.AlreadyJoined);
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
        return socket.emit("err", ErrorMessage.WrongSession);
      }
      if (replica.socket) {
        // Invalidate previous socket connection
        socket.emit("err", ErrorMessage.OtherConnection);
        socket.disconnect();
      }
      replica.socket = socket;
    } else {
      // Create new replica
      replica = {
        id: j.replica,
        db: j.db,
        secret: j.secret,
        socket,
        socketState: SocketState.Idle,
        sentStatementsNo: 0,
        receivedStatementsNo: 0,
      } as Replica;
      db.replicas.set(j.replica, replica);
    }
    this.sockets.set(socket, replica);
    replica.sentStatementsNo = j.receivedStatementsNo;

    const response: OkayMessage = {
      totalStatementsCount: db.log.length,
      yourStatementsCount: replica.receivedStatementsNo,
    };
    return socket.emit("okay", response);
  }

  push(socket: Socket, stmt: Statement<T>) {
    const replica = this.sockets.get(socket);
    if (!replica) {
      return socket.emit("err", ErrorMessage.MustJoin);
    }
    const db = this.dbs.get(replica.db);
    db.log.push(
      Object.freeze({
        index: db.log.length,
        replica: replica.id,
        mode: stmt.mode,
        accessControlList: stmt.accessControlList,
        payload: stmt.payload,
      } as Statement<T>)
    );
    replica.receivedStatementsNo += 1;
    this.emitUpdate(db);
  }

  disconnect(socket: Socket, reason: string) {
    const replica = this.sockets.get(socket);
    if (!replica) return;
    switch (replica.socketState) {
      case SocketState.Idle:
        this.freeSocket(replica);
        break;
      case SocketState.Streaming:
        // Will be deleted by this.sendMore
        replica.socketState = SocketState.Delete;
        return;
      case SocketState.Delete:
        return;
      case SocketState.None:
        throw new Error("None state impossible when disconnecting");
    }
  }

  private freeSocket(replica: Replica) {
    const socket = replica.socket;
    this.sockets.delete(socket);
    replica.socketState = SocketState.None;
    replica.socket = null;
    if (socket.connected) socket.disconnect();
  }
}
