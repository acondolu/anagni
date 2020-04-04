// Access control
// export const enum AccessControlMode {
//   All,
//   Only,
//   Except,
// }

export type AuthRequest = {
  replica: string;
  db: string;
  secret: string;
  receivedStatementsNo: number;
};

export type Statement<T> = {
  index: number;
  replica: string;
  time: number;
  // mode: AccessControlMode;
  // accessControlList: Array<string>;
  payload: T;
};

export type WelcomeResponse = {
  totalStatementsCount: number;
  yourStatementsCount: number;
};
export const enum FailureResponse {
  AlreadyJoined,
  WrongSession,
  OtherConnection,
  MustJoin,
}
