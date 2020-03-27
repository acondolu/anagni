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
  session: string;
  rid: string;
  secret: string;
  recvdBlocksNo: number;
};

export type Block<Content> = {
  index: number;
  session: string;
  mode: AccessControlMode;
  accessControlList: Array<string>;
  payload: Content;
};

export type OkayMessage = {
  totalCount: number;
  yourCount: number;
};
export const enum ErrorMessage {
  AlreadyJoined,
  WrongSession,
  OtherConnection,
  MustJoin,
}
