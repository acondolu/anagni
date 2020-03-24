import * as socketio from "socket.io";
import { Server } from "./server";

type Socket = socketio.Socket;

class SocketIOServer extends Server {
  constructor(port: number = 8080) {
    super();

    const io: socketio.Server = socketio({
      "heartbeat interval": 5,
      "heartbeat timeout": 60,
    }).listen(port);

    io.sockets.on("connection", (socket: Socket) => {
      this.connection(socket);
      socket.on("login", (msg: LoginMessage) => this.login(socket, msg));
      socket.on("enter", (msg: EnterMessage) => this.enter(socket, msg));
      socket.on("append", (msg: AppendMessage) => this.append(socket, msg));
      socket.on("disconnect", (reason) => this.disconnect(socket, reason));
    });
  }
}
