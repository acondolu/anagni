import * as SocketIO from "socket.io";
import { Server } from "./server";

class SocketIOServer extends Server {
  constructor(port: number = 8080) {
    super();

    const io: SocketIO.Server = SocketIO({
      "heartbeat interval": 5,
      "heartbeat timeout": 60,
    }).listen(port);

    io.sockets.on("connection", (socket: SocketIO.Socket) => {
      this.connection(socket);
      socket.on("login", (msg: LoginMessage) => this.login(socket, msg));
      socket.on("join", (msg: JoinMessage) => this.join(socket, msg));
      socket.on("append", (msg: AppendMessage) => this.append(socket, msg));
      socket.on("disconnect", (reason) => this.disconnect(socket, reason));
    });
    Object.freeze(this);
  }
}
