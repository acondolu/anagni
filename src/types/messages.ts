export type SessionId = string;
export type RoomId = string;
export type Count = number;

export const enum MessageTypes {
  Join,
  Push,
  Okay,
  Error,
}

// Access control
export const enum AccessControlMode {
  Only,
  Except,
}

export type JoinMessage = {
  session: SessionId;
  rid: RoomId;
  secret: string;
  recvdBlocksNo: Count;
};

export type Block<Content> = {
  index: Count;
  session: SessionId;
  mode: AccessControlMode;
  accessControlList: Array<SessionId>;
  payload: Content;
};

export type OkayMessage = {
  totalCount: Count;
  yourCount: Count;
};
export const enum ErrorMessage {
  AlreadyJoined,
  WrongSession,
  OtherConnection,
  MustJoin,
}
