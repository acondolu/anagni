import * as socketio from "socket.io";
import "../types/messages";

type Socket = socketio.Socket;

type Table = {
  log: Array<Readonly<AppendMessage>>;
  lastUserMsg: Map<UserId, Index>;
  sockets: Set<Socket>;
};

enum SocketState {
  Idle,
  Streaming,
  Delete,
}
type User = {
  secret: string;
  sockets: Set<Socket>;
};

type SocketInfo = {
  uid: UserId;
  user: User;
  tid: TableId;
  state: SocketState;
  lastSent: Index;
};

class Server {
  tables: Map<TableId, Table>;
  users: Map<UserId, User>;
  sockets: Map<Socket, SocketInfo>;

  constructor(port: number = 8080) {
    this.tables = new Map();
    this.users = new Map();
    this.sockets = new Map();

    const io: socketio.Server = socketio({
      "heartbeat interval": 5,
      "heartbeat timeout": 60,
    }).listen(port);

    io.sockets.on("connection", (socket: Socket) => {
      this.sockets.set(socket, {
        uid: null,
        user: null,
        tid: null,
        state: SocketState.Idle,
        lastSent: null,
      });
      socket.on("login", (msg: LoginMessage) => this.login(socket, msg));
      socket.on("enter", (msg: EnterMessage) => this.enter(socket, msg));
      socket.on("append", (msg: AppendMessage) => this.append(socket, msg));
      socket.on("disconnect", (reason) => this.disconnect(socket, reason));
    });
  }

  async sendMoreAux(table: Table, socket: Socket, info: SocketInfo) {
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

  emitUpdate(table: Table) {
    for (const socket of table.sockets.keys()) {
      const info = this.sockets.get(socket);
      if (info.state == SocketState.Idle) this.sendMoreAux(table, socket, info);
    }
  }

  login(socket: Socket, msg: LoginMessage) {
    let socketInfo: SocketInfo = this.sockets.get(socket);
    if (!!socketInfo.uid) {
      const response: ErrorMessage = {
        type: MessageTypes.Error,
        errorType: MessageTypes.Login,
        reason: "Already logged in",
        no: msg.no,
      };
      return socket.emit("error", response);
    }
    let uid = msg.uid;
    let user: User = this.users[uid];
    if (user) {
      if (user.secret != msg.secret) {
        const response: ErrorMessage = {
          type: MessageTypes.Error,
          errorType: MessageTypes.Login,
          reason: "Wrong secret",
          no: msg.no,
        };
        return socket.emit("error", response);
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
      type: MessageTypes.Okay,
      okayType: MessageTypes.Login,
      no: msg.no,
    };
    return socket.emit("okay", response);
  }

  enter(socket: Socket, msg: EnterMessage) {
    let info = this.sockets.get(socket);
    if (!info.uid) {
      const response: ErrorMessage = {
        type: MessageTypes.Error,
        errorType: MessageTypes.Login,
        reason: "Must login first",
        no: msg.no,
      };
      return socket.emit("error", response);
    }
    if (!!info.tid) {
      const response: ErrorMessage = {
        type: MessageTypes.Error,
        errorType: MessageTypes.Enter,
        reason: "Already entered",
        no: msg.no,
      };
      return socket.emit("error", response);
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
          type: MessageTypes.Error,
          errorType: MessageTypes.Enter,
          reason: "New connection",
          no: msg.no,
        };
        s.emit("error", response);
        s.disconnect();
      }
    }
    info.tid = tid;
    info.lastSent = lastKnownMsg;

    // // user on the same table, but leave other tables untouched
    const lastYours: Index = table.lastUserMsg.get(info.uid); // fixme retreve from users[uid][tid];
    const lastMsg: Index = table.log.length - 1;
    if (lastMsg > lastKnownMsg + 1) {
      if (info.state != SocketState.Idle)
        throw new Error("Not idle, impossible.");
      this.sendMoreAux(table, socket, info);
    }
    let answer: OkayEnterMessage = {
      type: MessageTypes.Okay,
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
        type: MessageTypes.Error,
        errorType: MessageTypes.Append,
        reason: "Enter first",
        no: -1,
      };
      return socket.emit("error", response);
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
