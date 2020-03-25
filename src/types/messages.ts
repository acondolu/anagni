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
  no: number;
};
export type JoinMessage = {
  rid: RoomId;
  lastKnownMsg: Index;
  no: number;
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
  no: number;
};
export type OkayEnterMessage = {
  okay: MessageTypes.Enter;
  totalCount: Index;
  yourCount: Index;
  no: number;
};
export type OkayExitMessage = {
  okay: MessageTypes.Exit;
  no: number;
};
export type ErrorMessage = {
  errorType: MessageTypes;
  reason: string;
  no: number;
};

export type SHA256Message = {
  salt: string;
  payload: string;
};
