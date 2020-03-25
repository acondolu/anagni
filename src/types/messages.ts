type UserId = string;
type RoomId = string;
type Index = number;

// Access control
enum AccessControlMode {
  Only,
  Except,
}

type LoginMessage = {
  uid: UserId;
  secret: string;
  no: number;
};
type JoinMessage = {
  rid: RoomId;
  lastKnownMsg: Index;
  no: number;
};
// type LeaveMessage = { rid: RoomId; no: number };
type AppendMessage = {
  index: Index;
  uid: UserId;
  node: AccessControlMode;
  accessControlList: Array<UserId>;
  payload: string;
};

enum MessageTypes {
  Login,
  Enter,
  Exit,
  Append,
  Okay,
  Error,
}
type OkayLoginMessage = {
  okay: MessageTypes.Login;
  no: number;
};
type OkayEnterMessage = {
  okay: MessageTypes.Enter;
  lastYours: Index;
  lastMsg: Index;
  no: number;
};
type OkayExitMessage = {
  okay: MessageTypes.Exit;
  no: number;
};
type ErrorMessage = {
  errorType: MessageTypes;
  reason: string;
  no: number;
};
