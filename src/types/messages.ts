type UserId = string;
type TableId = string;
type Index = number;

// Access control
enum AccessControlMode {
  Only,
  AllBut,
}

enum MessageTypes {
  Login,
  Enter,
  Exit,
  Append,
  Okay,
  Error,
}
type LoginMessage = {
  uid: UserId;
  secret: string;
  no: number;
};
type EnterMessage = {
  tid: TableId;
  lastKnownMsg: Index;
  no: number;
};
type ExitMessage = { type: MessageTypes.Exit; tid: TableId; no: number };
type AppendMessage = {
  index: Index;
  uid: UserId;
  node: AccessControlMode;
  accessControlList: Array<UserId>;
  payload: string;
};

type OkayLoginMessage = {
  okayType: MessageTypes.Login;
  no: number;
};
type OkayEnterMessage = {
  okayType: MessageTypes.Enter;
  lastYours: Index;
  lastMsg: Index;
  no: number;
};
type OkayExitMessage = {
  okayType: MessageTypes.Exit;
  no: number;
};
type ErrorMessage = {
  errorType: MessageTypes;
  reason: string;
  no: number;
};
