import "../types/messages";

interface Socket {
  emit: (emit: string, msg: any) => void;
  disconnect: () => void;
}

type Table = {
  log: Array<Readonly<AppendMessage>>;
  lastUserMsg: Map<UserId, Index>;
  sockets: Set<Socket>;
};

type User = {
  secret: string;
  sockets: Set<Socket>;
};

enum SocketState {
  Idle,
  Streaming,
  Delete,
}
type SocketInfo = {
  uid: UserId;
  user: User;
  tid: TableId;
  state: SocketState;
  lastSent: Index;
};

export class Server {
  tables: Map<TableId, Table>;
  users: Map<UserId, User>;
  sockets: Map<Socket, SocketInfo>;

  constructor() {
    this.tables = new Map();
    this.users = new Map();
    this.sockets = new Map();
    Object.seal(this);
  }

  connection(socket: Socket) {
    this.sockets.set(socket, {
      uid: null,
      user: null,
      tid: null,
      state: SocketState.Idle,
      lastSent: null,
    });
  }

  private async sendMoreAux(table: Table, socket: Socket, info: SocketInfo) {
    switch (info.state) {
      case SocketState.Idle:
        throw new Error("Idle state is not possible");
      case SocketState.Delete:
        this.freeSocket(socket, info);
        break;
      case SocketState.Streaming:
        let log = table.log;
        if (log.length > info.lastSent + 1) {
          // Send one more message
          socket.emit("append", log[log.length - 1]);
          this.sendMoreAux(table, socket, info);
        } else {
          info.state = SocketState.Idle;
        }
    }
  }

  private emitUpdate(table: Table) {
    for (const socket of table.sockets.keys()) {
      const info = this.sockets.get(socket);
      if (info.state == SocketState.Idle) {
        info.state = SocketState.Streaming;
        this.sendMoreAux(table, socket, info);
      }
    }
  }

  login(socket: Socket, msg: LoginMessage) {
    let socketInfo: SocketInfo = this.sockets.get(socket);
    if (!!socketInfo.uid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Login,
        reason: "Already logged in",
        no: msg.no,
      };
      return socket.emit("err", response);
    }
    let uid = msg.uid;
    let user: User = this.users[uid];
    if (user) {
      if (user.secret != msg.secret) {
        const response: ErrorMessage = {
          errorType: MessageTypes.Login,
          reason: "Wrong secret",
          no: msg.no,
        };
        return socket.emit("err", response);
      }
    } else {
      user = {
        secret: msg.secret,
        sockets: new Set(),
      };
      this.users.set(uid, user);
    }
    socketInfo.uid = uid;
    socketInfo.user = user;
    user.sockets.add(socket);
    const response: OkayLoginMessage = {
      okayType: MessageTypes.Login,
      no: msg.no,
    };
    return socket.emit("okay", response);
  }

  enter(socket: Socket, msg: EnterMessage) {
    let info = this.sockets.get(socket);
    if (!info.uid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Login,
        reason: "Must login first",
        no: msg.no,
      };
      return socket.emit("err", response);
    }
    if (!!info.tid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Enter,
        reason: "Already entered",
        no: msg.no,
      };
      return socket.emit("err", response);
    }
    const { tid, lastKnownMsg } = msg;
    let user: User = info.user;
    // Check tid
    let table = this.tables[tid];
    if (!table) {
      // Create table
      table = { log: [], lastUserMsg: new Map() };
      this.tables[tid] = table;
    }
    for (const s of user.sockets.keys()) {
      const info = this.sockets.get(s);
      if (info.tid == tid) {
        // Close previous socket
        const response: ErrorMessage = {
          errorType: MessageTypes.Enter,
          reason: "New connection",
          no: msg.no,
        };
        s.emit("err", response);
        s.disconnect();
      }
    }
    info.tid = tid;
    info.lastSent = lastKnownMsg;

    const lastYours: Index = table.lastUserMsg.get(info.uid);
    const lastMsg: Index = table.log.length - 1;
    if (lastMsg > lastKnownMsg + 1) {
      if (info.state != SocketState.Idle)
        throw new Error("Not idle, impossible.");
      info.state = SocketState.Streaming;
      this.sendMoreAux(table, socket, info);
    }
    let answer: OkayEnterMessage = {
      okayType: MessageTypes.Enter,
      lastYours,
      lastMsg,
      no: msg.no,
    };
    socket.emit("welcome", answer);
  }

  append(socket: Socket, msg: AppendMessage) {
    const info = this.sockets.get(socket);
    const tid = info.tid;
    if (!tid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Append,
        reason: "Enter first",
        no: -1,
      };
      return socket.emit("err", response);
    }
    const table: Table = this.tables.get(tid);
    msg.index = table.log.length;
    table.log.push(Object.freeze(msg));
    table.lastUserMsg.set(info.uid, msg.index);
    this.emitUpdate(table);
  }

  disconnect(socket: Socket, reason: string) {
    const info = this.sockets.get(socket);
    switch (info.state) {
      case SocketState.Idle:
        this.freeSocket(socket, info);
        break;
      default:
        // Will be deleted by this.sendMore
        info.state = SocketState.Delete;
    }
  }

  freeSocket(socket: Socket, info: SocketInfo) {
    this.sockets.delete(socket);
    const user = info.user;
    if (user) user.sockets.delete(socket);
    const tid = info.tid;
    if (tid) this.tables[tid].sockets.delete(socket);
  }
}
