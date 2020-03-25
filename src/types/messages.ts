export type UserId = string;
export type RoomId = string;
export type Index = number;

// Access control
export const enum AccessControlMode {
  Only,
  Except,
}

export type LoginMessage = {
  uid: UserId;
  secret: string;
};
export type JoinMessage = {
  rid: RoomId;
  lastKnownMsg: Index;
};
// type LeaveMessage = { rid: RoomId; no: number };
export type AppendMessage = {
  index: Index;
  uid: UserId;
  node: AccessControlMode;
  accessControlList: Array<UserId>;
  payload: string;
};

export enum MessageTypes {
  Login,
  Enter,
  Exit,
  Append,
  Okay,
  Error,
}
export type OkayLoginMessage = {
  okay: MessageTypes.Login;
};
export type OkayEnterMessage = {
  okay: MessageTypes.Enter;
  totalCount: Index;
  yourCount: Index;
};
export type OkayExitMessage = {
  okay: MessageTypes.Exit;
};
export type ErrorMessage = {
  errorType: MessageTypes;
  reason: string;
};

export type SHA256Message = {
  salt: string;
  payload: string;
};
