export type UserId = string;
export type RoomId = string;
export type Index = number;

// Access control
export const enum AccessControlMode {
  Only,
  Except,
}

export type JoinMessage = {
  session: UserId;
  rid: RoomId;
  secret: string;
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
  Join,
  Push,
  Okay,
  Error,
}
export type OkayMessage = {
  okay: MessageTypes.Okay;
};
export type OkayJoinMessage = {
  okay: MessageTypes.Join;
  totalCount: Index;
  yourCount: Index;
};
export type ErrorMessage = {
  errorType: MessageTypes;
  reason: string;
};
