import ServerIO from "socket.io";
import { Server } from "./server.js";
import { JoinMessage, Statement } from "../types/messages.js";

export class SocketIOServer<T> extends Server<T> {
  constructor(port: number) {
    super();

    console.log("Starting Anagni server, listening on port", port);

    const io: SocketIO.Server = ServerIO({
      "heartbeat interval": 5,
      "heartbeat timeout": 60,
    }).listen(port);

    io.sockets.on("connection", (socket: SocketIO.Socket) => {
      socket.on("join", (j: JoinMessage) => this.join(socket, j));
      socket.on("append", (b: Statement<any>) => this.push(socket, b));
      socket.on("disconnect", (reason) => this.disconnect(socket, reason));
    });
    Object.freeze(this);
  }
}
