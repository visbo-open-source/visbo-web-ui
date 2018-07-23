
export class VCUser {
  _id: string;
  email: string;
  role: string;
  userId: string;
}

export class VCUserResponse {
  state: string;
  message: string;
  users: [ VCUser ]
}

export class VisboCenter {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  name: string;
  users: [ VCUser];
  description: string;
  vpCount: number
}

export class VisboCenterResponse {
  state: string;
  message: string;
  vc: [ VisboCenter ]
}
