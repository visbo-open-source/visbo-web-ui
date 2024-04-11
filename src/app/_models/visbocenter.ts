export class VisboCenter {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  name: string;
  description: string;
  vpCount: number;
  // eslint-disable-next-line
  capacity: any[];
  costtypes: any [];
  deletedAt: Date;
  perm: {system: number, vc: number, vp: number};
}

export class VisboCenterResponse {
  state: string;
  message: string;
  vc: [ VisboCenter ];
  perm: {system: number, vc: number, vp: number};
}
