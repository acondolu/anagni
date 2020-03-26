import { Server, Socket } from "../server/server.js";
import {
  JoinMessage,
  MessageTypes,
  ErrorMessage,
  Block,
  AccessControlMode,
} from "messages.js";

// const _ = new SocketIOServer();
import "mocha";

class MockSocket implements Socket {
  connected: boolean;
  callback: (cmd: string, content: any) => void;

  constructor(callback: (cmd: string, content: any) => void) {
    this.connected = true;
    this.callback = callback;
  }
  emit(cmd: string, content: any) {
    this.callback(cmd, content);
  }

  disconnect() {
    this.connected = false;
  }
}

const session1 = new ArrayBuffer(8);
session1[0] = 0x00;
const session2 = new ArrayBuffer(8);
session2[0] = 0xff;
const secret1 = new ArrayBuffer(8);
secret1[0] = 0xa0;
const secret2 = new ArrayBuffer(8);
secret2[0] = 0x0a;
const room = new ArrayBuffer(8);
room[0] = 0xaa;
const unValidJoinMessage: JoinMessage = {
  session: new ArrayBuffer(1),
  rid: new ArrayBuffer(1),
  secret: new ArrayBuffer(1),
  recvdBlocksNo: 0,
};
const validJoinMessage: JoinMessage = {
  session: session1,
  rid: room,
  secret: secret1,
  recvdBlocksNo: 0,
};
const validJoinMessage2: JoinMessage = {
  session: session2,
  rid: room,
  secret: secret2,
  recvdBlocksNo: 0,
};

const validBlock: Block<any> = {
  index: undefined,
  session: undefined,
  mode: AccessControlMode.Except,
  accessControlList: [],
  payload: "hello",
};

describe("Server", function () {
  it("join once", function (done) {
    const srv = new Server();
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "okay") done();
    });
    srv.join(socket, validJoinMessage);
  });

  it("join twice", function (done) {
    const srv = new Server();
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "err" && content == ErrorMessage.AlreadyJoined) done();
    });
    srv.join(socket, validJoinMessage);
    srv.join(socket, validJoinMessage);
  });

  it("push before join", function (done) {
    const srv = new Server();
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "err" && content == ErrorMessage.MustJoin) done();
    });
    srv.push(socket, validBlock);
  });

  it("push one block", function (done) {
    const srv = new Server();
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "push") {
        // Warning: not checking accessControlList
        if (
          content.index == 0 &&
          content.session == validJoinMessage.session &&
          content.mode == validBlock.mode &&
          content.payload == validBlock.payload
        )
          done();
      }
    });
    srv.join(socket, validJoinMessage);
    srv.push(socket, validBlock);
  });

  it("push n blocks", function (done) {
    const srv = new Server();
    let counter: number = 0;
    const N = 10;
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "push") {
        // Warning: not checking accessControlList
        if (
          content.index == counter &&
          content.session == validJoinMessage.session &&
          content.mode == validBlock.mode &&
          content.payload == validBlock.payload
        ) {
          counter += 1;
          if (counter == N) done();
        } else {
          if (counter > 0) done(new Error());
        }
      }
    });
    srv.join(socket, validJoinMessage);
    for (let i = 0; i < N; i++) srv.push(socket, validBlock);
  });

  it("receive n blocks", function (done) {
    const srv = new Server();
    let counter: number = 0;
    const N = 10;
    const socket2 = new MockSocket(function () {});
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "push") {
        // Warning: not checking accessControlList
        if (
          content.index == counter &&
          content.session == validJoinMessage2.session &&
          content.mode == validBlock.mode &&
          content.payload == validBlock.payload
        ) {
          counter += 1;
          if (counter == N) done();
        } else {
          if (counter > 0) done(new Error());
        }
      }
    });
    srv.join(socket, validJoinMessage);
    srv.join(socket2, validJoinMessage2);
    for (let i = 0; i < N; i++) srv.push(socket2, validBlock);
  });
});

// describe("Join", function () {
//   it("should succeed", function () {
//     const srv = new Server();
//     const arr = new Array();
//     const socket1 = new MockSocket();
//     const socket12 = new MockSocket();
//     const j = srv.join(socket1, j);
//   });
// });
