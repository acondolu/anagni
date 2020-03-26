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
  recvdBlocksNo: Index;
};

export type Block<Content> = {
  index: Index;
  uid: UserId;
  mode: AccessControlMode;
  accessControlList: Array<UserId>;
  payload: Content;
};

export enum MessageTypes {
  Login,
  Enter,
  Exit,
  Append,
  Okay,
  Error,
}
export type OkayMessage = {
  okay: MessageTypes.Login;
};
export type OkayEnterMessage = {
  okay: MessageTypes.Enter;
  totalCount: Index;
  yourCount: Index;
};
export type ErrorMessage = {
  errorType: MessageTypes;
  reason: string;
};
