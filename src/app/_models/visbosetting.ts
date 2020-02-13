
export class VisboSetting {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  vcid: string;
  name: string;
  type: string;
  userId: string;
  value: any;
  timestamp: Date;
}

export class VisboSettingResponse {
  state: string;
  message: string;
  vcsetting: VisboSetting;
}

export class VisboSettingListResponse {
  state: string;
  message: string;
  vcsetting: [ VisboSetting ];
}
