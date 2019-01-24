export class VisboCenter {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  name: string;
  description: string;
  vpCount: number;
  deletedAt:Date;
  perm: {system: number, vc: number, vp: number};
}

export class VisboCenterResponse {
  state: string;
  message: string;
  vc: [ VisboCenter ];
  perm: {system: number, vc: number, vp: number};
}
