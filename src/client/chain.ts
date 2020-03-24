const io = require('socket.io-client');
import "types/messages";

type Callback = (msg: AppendMessage, replay: boolean) => void;


/*
var socket = io('localhost', 8080);
socket.on('connect', function () {
  socket.send('hi');

  socket.on('message', function (msg) {
    // my msg
  });
});
*/

class Chain {
  server: string;
  chainId: string;
  secret: string;
  callback: Callback;
  chain: Array<AppendMessage>;
  socket: SocketIOClient.Socket;

  constructor(server: string, chainId: string, secret: string, callback: Callback) {
    this.server = server;
    this.chainId = chainId;
    this.secret = secret;
    this.callback = callback;
    this.chain = new Array();
    this.fromLocalStorage();
    this.connect();
  }

  fromLocalStorage() {
    let i = 0;
    while (true) {
      const block = localStorage.getItem(this.chainId + "-" + i);
      if (!block) return;
      this.chain.push(JSON.parse(block));
      i = i + 1;
    }
  }

  connect() {
    this.socket = io.connect('http://localhost:8080');
    this.socket.on("connnect", () => {console.log("CONNECTED");})
    this.socket.emit('chat_message', "hello");
    // // TODO: first message:
    // socket.onmessage = function (event) {
    //   this.onmessage(JSON.parse(event.data));
    // };
    // socket. TODO:onopen
  }

  // replay() {
  //   const last = this.chain.length - 1;
  //   // TODO
  // }

  // onmessage(msg: Block) {
  //   const { index, type, payload } = msg;
  //   const length = this.chain.length;
  //   if (index != length) {
  //     // ERROR: reboot connection
  //     // OR: ignore and send first message again
  //     throw new Error("FIXME");
  //   }
  //   // store in the chain
  //   this.chain.push(msg);
  //   // cache in the local storage
  //   localStorage.setItem(this.chainID + "-" + index, JSON.stringify(payload));
  //   this.callback(type, payload);
  // }

  // send(block: Block, callback: (n: number) => void) {
  //   let enc = JSON.stringify(block);
  //   // if ()
  //   this.callbacks.set(enc, callback);
  //   this.socket.send(enc);
  // }
}
