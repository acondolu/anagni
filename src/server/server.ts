import {
  SessionId,
  RoomId,
  Binary,
  AccessControlMode,
  Block,
  JoinMessage,
  OkayMessage,
  ErrorMessage,
} from "../types/messages.js";

export interface Socket {
  emit: (cmd: string, content: any) => void;
  disconnect: () => void;
  connected: boolean;
}

const enum SocketState {
  Idle,
  Streaming,
  Delete,
}

type Session = {
  id: SessionId;
  rid: RoomId;
  secret: Binary;
  socket: Socket | null;
  socketState: SocketState;
  sentBlocksNo: number;
  recvBlocksNo: number;
};

type Room = {
  log: Array<Readonly<Block<any>>>;
  sessions: Map<SessionId, Session>;
};

export class Server {
  rooms: Map<RoomId, Room>;
  sockets: Map<Socket, Session>;

  constructor() {
    this.rooms = new Map();
    this.sockets = new Map();
    Object.seal(this);
  }

  private async sendMoreAux(room: Room, session: Session) {
    switch (session.socketState) {
      case SocketState.Idle:
        throw new Error("Idle state is not possible");
      case SocketState.Delete:
        this.freeSocket(session);
        break;
      case SocketState.Streaming:
        let log = room.log;
        if (log.length > session.sentBlocksNo) {
          // Send one more message
          // Enforce access mode!
          const b = log[session.sentBlocksNo];
          let obscure = false;
          switch (b.mode) {
            case AccessControlMode.Only:
              obscure = b.accessControlList.indexOf(session.id) == -1;
              break;
            case AccessControlMode.Except:
              obscure = b.accessControlList.indexOf(session.id) != -1;
              break;
          }
          const bCopy: Block<any> = {
            index: b.index,
            session: b.session,
            mode: b.mode,
            accessControlList: b.accessControlList,
            payload: obscure ? null : b.payload,
          };
          session.socket.emit("push", bCopy as Block<any>);
          session.sentBlocksNo += 1;
          // Call again
          this.sendMoreAux(room, session);
        } else {
          session.socketState = SocketState.Idle;
        }
    }
  }

  private emitUpdate(room: Room) {
    for (const id of room.sessions.keys()) {
      const session = room.sessions.get(id);
      if (session.socketState == SocketState.Idle) {
        session.socketState = SocketState.Streaming;
        this.sendMoreAux(room, session);
      }
    }
  }

  join(socket: Socket, j: JoinMessage) {
    let session = this.sockets.get(socket);
    //
    if (session) {
      return socket.emit("err", ErrorMessage.AlreadyJoined);
    }
    //
    let room = this.rooms.get(j.rid);
    if (!room) {
      // Create room
      room = {
        log: new Array(),
        sessions: new Map(),
      };
      this.rooms.set(j.rid, room);
    }
    // Check if session
    session = room.sessions.get(j.session);
    if (session) {
      // Check secret
      if (session.secret != j.secret || session.rid != j.rid) {
        return socket.emit("err", ErrorMessage.WrongSession);
      }
      if (session.socket) {
        // Invalidate previous socket connection
        socket.emit("err", ErrorMessage.OtherConnection);
        socket.disconnect();
      }
      session.socket = socket;
    } else {
      // Create new session
      session = {
        id: j.session,
        rid: j.rid,
        secret: j.secret,
        socket,
        socketState: SocketState.Idle,
        sentBlocksNo: 0,
        recvBlocksNo: 0,
      };
      room.sessions.set(j.session, session);
    }
    this.sockets.set(socket, session);
    session.sentBlocksNo = j.recvdBlocksNo;

    const response: OkayMessage = {
      totalCount: room.log.length,
      yourCount: session.recvBlocksNo,
    };
    return socket.emit("okay", response);
  }

  push(socket: Socket, block: Block<any>) {
    const session = this.sockets.get(socket);
    if (!session) {
      return socket.emit("err", ErrorMessage.MustJoin);
    }
    const room: Room = this.rooms.get(session.rid);
    room.log.push(
      Object.freeze({
        index: room.log.length,
        session: session.id,
        mode: block.mode,
        accessControlList: block.accessControlList,
        payload: block.payload,
      })
    );
    session.recvBlocksNo += 1;
    this.emitUpdate(room);
  }

  disconnect(socket: Socket, reason: string) {
    const session = this.sockets.get(socket);
    if (!session) return;
    switch (session.socketState) {
      case SocketState.Idle:
        this.freeSocket(session);
        break;
      default:
        // Will be deleted by this.sendMore
        session.socketState = SocketState.Delete;
    }
  }

  private freeSocket(session: Session) {
    const socket = session.socket;
    this.sockets.delete(socket);
    if (socket.connected) socket.disconnect();
    session.socket = null;
    session.socketState = null;
  }
}
