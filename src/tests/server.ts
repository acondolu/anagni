import { Server, Socket } from "../server/server.js";
import {
  AuthRequest,
  FailureResponse,
  Statement,
  // AccessControlMode,
} from "../types/commands.js";
import { SessionManager } from "../client/session.js";

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

const sm = new SessionManager();
const replica1 = sm.random();
const replica2 = sm.random();
const secret1 = sm.random();
const secret2 = sm.random();
const room = sm.random();
// const unValidJoinMessage: JoinMessage = {
//   session: new ArrayBuffer(1),
//   rid: new ArrayBuffer(1),
//   secret: new ArrayBuffer(1),
//   recvdBlocksNo: 0,
// };
const validJoinMessage: AuthRequest = {
  replica: replica1,
  db: room,
  secret: secret1,
  receivedStatementsNo: 0,
};
const validJoinMessage2: AuthRequest = {
  replica: replica2,
  db: room,
  secret: secret2,
  receivedStatementsNo: 0,
};

const validStatement: Statement<any> = {
  index: undefined as any,
  replica: undefined as any,
  time: undefined as any,
  // mode: AccessControlMode.Except,
  // accessControlList: [],
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
      if (cmd == "err" && content == FailureResponse.AlreadyJoined) done();
    });
    srv.join(socket, validJoinMessage);
    srv.join(socket, validJoinMessage);
  });

  it("push before join", function (done) {
    const srv = new Server();
    const socket = new MockSocket(function (cmd, content) {
      if (cmd == "err" && content == FailureResponse.MustJoin) done();
    });
    srv.push(socket, validStatement);
  });

  it("push one block", function (done) {
    const srv = new Server();
    const socket = new MockSocket(function (cmd, content: Statement<string>) {
      if (cmd == "push") {
        if (
          content.index == 0 &&
          content.replica == validJoinMessage.replica &&
          // Warning: not checking accessControlList
          // content.mode == validStatement.mode &&
          content.payload == validStatement.payload
        )
          done();
      }
    });
    srv.join(socket, validJoinMessage);
    srv.push(socket, validStatement);
  });

  it("push n blocks", function (done) {
    const srv = new Server();
    let counter: number = 0;
    const N = 10;
    const socket = new MockSocket(function (cmd, content: Statement<string>) {
      if (cmd == "push") {
        if (
          content.index == counter &&
          content.replica == validJoinMessage.replica &&
          // content.mode == validStatement.mode &&
          // Warning: not checking accessControlList
          content.payload == validStatement.payload
        ) {
          counter += 1;
          if (counter == N) done();
        } else {
          if (counter > 0) done(new Error());
        }
      }
    });
    srv.join(socket, validJoinMessage);
    for (let i = 0; i < N; i++) srv.push(socket, validStatement);
  });

  it("receive n blocks", function (done) {
    const srv = new Server();
    let counter: number = 0;
    const N = 10;
    const socket2 = new MockSocket(function () {});
    const socket = new MockSocket(function (cmd, content: Statement<string>) {
      if (cmd == "push") {
        if (
          content.index == counter &&
          content.replica == validJoinMessage2.replica &&
          // content.mode == validStatement.mode &&
          // Warning: not checking accessControlList
          content.payload == validStatement.payload
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
    for (let i = 0; i < N; i++) srv.push(socket2, validStatement);
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
