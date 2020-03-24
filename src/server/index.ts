import * as socketio from "socket.io";

type Socket = socketio.Socket;

type UserId = string;
type TableId = string;
type Index = number;

enum TableState { Active, Freed } ;
type Table = {
    state: TableState,
    log: Array<string>,
    lastUserMsg: Map<UserId, Index>
};


enum UserState { Replaying, Streaming, Freed } ;
type User = {
    secret: string,
    activeTables: Map<TableId, {
        state: UserState,
        lastSent: Index,
        socket: Socket
    }>
} ;

// Messages
enum MessageTypes { Login, Enter, Exit, Log, Okay, Error };
type LoginMessage = { type: MessageTypes.Login, uid: UserId, secret: string, no: number };
type EnterMessage = { type: MessageTypes.Enter, tid: TableId, lastKnownMsg: Index, no: number };
type ExitMessage = { type: MessageTypes.Exit, tid: TableId, no: number };
type AppendMessage = { type: MessageTypes.Log, index: Index, uid: UserId, to: Array<UserId>, notTo: Array<UserId>, payload: string };

type OkayLoginMessage = { type: MessageTypes.Okay, okayType: MessageTypes.Login, no: number};
type OkayEnterMessage = { type: MessageTypes.Okay, okayType: MessageTypes.Enter, lastYours: Index, lastMsg: Index, no: number};
type OkayExitMessage = { type: MessageTypes.Okay, okayType: MessageTypes.Exit, no: number};
type ErrorMessage = { type: MessageTypes.Error, errorType: MessageTypes, reason: string, no: number};

const io = socketio(8080);

const tables: Map<TableId, Table> = new Map();
const users: Map<UserId, User> = new Map();

// TODO
function send(uid: UserId) {
    // check that socket not invalidated
}

io.sockets.on('connection', function(socket: Socket) {

    socket.on('login', function(msg: LoginMessage) {
        let uid = msg.uid;
        let user: User = users[uid];
        if (user) {
            if (user.secret != msg.secret) {
                const response: ErrorMessage = {
                    type: MessageTypes.Error,
                    errorType: MessageTypes.Login,
                    reason: "Wrong secret",
                    no: msg.no
                };
                return socket.emit('error', response);
            }
        } else {
            user = {secret: msg.secret, activeTables: new Map()};
            users[uid] = user;
        }
        // Store uid & user in socket
        Object.defineProperty(socket, 'uid', {
            value: uid,
            writable: false
        });
        Object.defineProperty(socket, 'user', {
            value: user,
            writable: false
        });
        const response: OkayLoginMessage = {
            type: MessageTypes.Okay,
            okayType: MessageTypes.Login,
            no: msg.no
        }
        return socket.emit('okay', response);
    });

    socket.on('enter', function(msg: EnterMessage) {
        const {tid, lastKnownMsg} = msg;
        let uid = socket['uid'];
        if (!uid) {
            const response: ErrorMessage = {
                type: MessageTypes.Error,
                errorType: MessageTypes.Login,
                reason: "Must login first",
                no: msg.no
            };
            return socket.emit('error', response);
        }
        let user: User = socket['user'];
        // // also check that user has not been freed
        // // TODO: totally invalidate already open sockets of this
        // // user on the same table, but leave other tables untouched
        // const lastYours: Index = -1; // fixme retreve from users[uid][tid];
        // const lastMsg: Index = tables[tid].log.length - 1;
        // if (lastMsg > lastKnownMsg) {
        //     user.state = UserState.Replaying;
        //     // do replay!
        // } else {
        //     user.state = UserState.Streaming;
        // }
        // let answer: OkayEnterMessage = {
        //     type: MessageTypes.Okay,
        //     okayType: MessageTypes.Enter,
        //     lastYours,
        //     lastMsg,
        //     no: msg.no
        // };
        // socket.emit("welcome", answer);
    });

    socket.on('log', function(msg: AppendMessage) {
        // TODO
    });

    socket.on('exit', function(auth: ExitMessage) {
        // TODO
    });

    socket.on('free', function(_: any) {
        // TODO free this user
    });
});
