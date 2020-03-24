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
  type: MessageTypes.Login;
  uid: UserId;
  secret: string;
  no: number;
};
type EnterMessage = {
  type: MessageTypes.Enter;
  tid: TableId;
  lastKnownMsg: Index;
  no: number;
};
type ExitMessage = { type: MessageTypes.Exit; tid: TableId; no: number };
type AppendMessage = {
  type: MessageTypes.Append;
  index: Index;
  uid: UserId;
  node: AccessControlMode;
  accessControlList: Array<UserId>;
  payload: string;
};

type OkayLoginMessage = {
  type: MessageTypes.Okay;
  okayType: MessageTypes.Login;
  no: number;
};
type OkayEnterMessage = {
  type: MessageTypes.Okay;
  okayType: MessageTypes.Enter;
  lastYours: Index;
  lastMsg: Index;
  no: number;
};
type OkayExitMessage = {
  type: MessageTypes.Okay;
  okayType: MessageTypes.Exit;
  no: number;
};
type ErrorMessage = {
  type: MessageTypes.Error;
  errorType: MessageTypes;
  reason: string;
  no: number;
};
