
export class VisboLogLevel {
  VC: string;
  VP: string;
  VPV: string;
  USER: string;
  OTHER: string;
  MAIL: string;
};

export class VisboLogLevelResponse {
  state: string;
  message: string;
  config: VisboLogLevel
}
