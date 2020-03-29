export const enum MessageTypes {
  Join,
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
  replica: string;
  db: string;
  secret: string;
  receivedStatementsNo: number;
};

export type Statement<T> = {
  index: number;
  replica: string;
  mode: AccessControlMode;
  accessControlList: Array<string>;
  payload: T;
};

export type OkayMessage = {
  totalStatementsCount: number;
  yourStatementsCount: number;
};
export const enum ErrorMessage {
  AlreadyJoined,
  WrongSession,
  OtherConnection,
  MustJoin,
}
