
export class VisboSetting {
  _id: string;
  vcid: string;
  name: string;
  type: string;
  userId: string;
  value: any;
  timestamp: Date;
};

export class VisboSettingResponse {
  state: string;
  message: string;
  vcsetting: [VisboSetting];
}
