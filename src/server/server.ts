import {
  MessageTypes,
  AppendMessage,
  UserId,
  Index,
  RoomId,
  ErrorMessage,
  JoinMessage,
  OkayEnterMessage,
  LoginMessage,
  OkayLoginMessage,
} from "../types/messages.js";

interface Socket {
  emit: (emit: string, msg: any) => void;
  disconnect: () => void;
}

type Room = {
  log: Array<Readonly<AppendMessage>>;
  userMessagesCount: Map<UserId, Index>;
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
  rid: RoomId;
  state: SocketState;
  lastSent: Index;
};

export class Server {
  rooms: Map<RoomId, Room>;
  users: Map<UserId, User>;
  sockets: Map<Socket, SocketInfo>;

  constructor() {
    this.rooms = new Map();
    this.users = new Map();
    this.sockets = new Map();
    Object.seal(this);
  }

  connection(socket: Socket) {
    this.sockets.set(socket, {
      uid: null,
      user: null,
      rid: null,
      state: SocketState.Idle,
      lastSent: null,
    });
  }

  private async sendMoreAux(room: Room, socket: Socket, info: SocketInfo) {
    switch (info.state) {
      case SocketState.Idle:
        throw new Error("Idle state is not possible");
      case SocketState.Delete:
        this.freeSocket(socket, info);
        break;
      case SocketState.Streaming:
        let log = room.log;
        if (log.length > info.lastSent + 1) {
          // Send one more message
          // FIXME: enforce access mode!
          socket.emit("append", log[log.length - 1]);
          this.sendMoreAux(room, socket, info);
        } else {
          info.state = SocketState.Idle;
        }
    }
  }

  private emitUpdate(room: Room) {
    for (const socket of room.sockets.keys()) {
      const info = this.sockets.get(socket);
      if (info.state == SocketState.Idle) {
        info.state = SocketState.Streaming;
        this.sendMoreAux(room, socket, info);
      }
    }
  }

  login(socket: Socket, msg: LoginMessage) {
    let socketInfo: SocketInfo = this.sockets.get(socket);
    if (!!socketInfo.uid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Login,
        reason: "Already logged in",
      };
      return socket.emit("err", response);
    }
    let uid = msg.uid;
    let user: User = this.users.get(uid);
    if (user) {
      if (user.secret != msg.secret) {
        const response: ErrorMessage = {
          errorType: MessageTypes.Login,
          reason: "Wrong secret",
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
      okay: MessageTypes.Login,
    };
    return socket.emit("okay", response);
  }

  join(socket: Socket, msg: JoinMessage) {
    let info = this.sockets.get(socket);
    if (!info.uid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Login,
        reason: "Must login first",
      };
      return socket.emit("err", response);
    }
    if (!!info.rid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Enter,
        reason: "Already entered",
      };
      return socket.emit("err", response);
    }
    const { rid, lastKnownMsg } = msg;
    let user: User = info.user;
    // Check rid
    let room = this.rooms.get(rid);
    if (!room) {
      // Create room
      room = { log: [], userMessagesCount: new Map(), sockets: new Set() };
      this.rooms.set(rid, room);
    }
    for (const s of user.sockets.keys()) {
      const info = this.sockets.get(s);
      if (info.rid == rid) {
        // Close previous socket
        const response: ErrorMessage = {
          errorType: MessageTypes.Enter,
          reason: "New connection",
        };
        s.emit("err", response);
        s.disconnect();
      }
    }
    info.rid = rid;
    info.lastSent = lastKnownMsg;

    let yourCount: Index = room.userMessagesCount.get(info.uid);
    if (yourCount == undefined) {
      yourCount = 0;
      room.userMessagesCount.set(info.uid, 0);
    }
    const lastMsg: Index = room.log.length - 1;
    if (lastMsg > lastKnownMsg + 1) {
      if (info.state != SocketState.Idle)
        throw new Error("Not idle, impossible.");
      info.state = SocketState.Streaming;
      this.sendMoreAux(room, socket, info);
    }
    let answer: OkayEnterMessage = {
      okay: MessageTypes.Enter,
      yourCount: yourCount,
      totalCount: lastMsg,
    };
    socket.emit("welcome", answer);
  }

  append(socket: Socket, msg: AppendMessage) {
    const info = this.sockets.get(socket);
    const rid = info.rid;
    if (!rid) {
      const response: ErrorMessage = {
        errorType: MessageTypes.Append,
        reason: "Enter first",
      };
      return socket.emit("err", response);
    }
    const room: Room = this.rooms.get(rid);
    msg.index = room.log.length;
    room.log.push(Object.freeze(msg));
    // TODO: enforce sender
    room.userMessagesCount.set(
      info.uid,
      room.userMessagesCount.get(info.uid) + 1
    );
    this.emitUpdate(room);
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

  private freeSocket(socket: Socket, info: SocketInfo) {
    this.sockets.delete(socket);
    const user = info.user;
    if (user) user.sockets.delete(socket);
    const rid = info.rid;
    if (rid) this.rooms.get(rid).sockets.delete(socket);
  }
}
