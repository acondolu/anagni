export type SessionId = ArrayBuffer;
export type RoomId = ArrayBuffer;
export type Binary = ArrayBuffer;
export type Count = number;

export const enum MessageTypes {
  Join,
  Push,
  Okay,
  Error,
}

// Access control
export const enum AccessControlMode {
  All,
  Only,
  Except,
}

export type JoinMessage = {
  session: SessionId;
  rid: RoomId;
  secret: Binary;
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
