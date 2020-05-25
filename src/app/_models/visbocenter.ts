import { VisboSetting } from './visbosetting';

export class VisboCenter {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  name: string;
  description: string;
  vpCount: number;
  capacity: any[];
  deletedAt: Date;
  perm: {system: number, vc: number, vp: number};
}

export class VisboCenterResponse {
  state: string;
  message: string;
  vc: [ VisboCenter ];
  perm: {system: number, vc: number, vp: number};
}

