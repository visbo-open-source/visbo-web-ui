export class VisboCenter {
  _id: string;
  updatedAt: string;
  createdAt: string;
  name: string;
  users: [ {email: string, role: string, _id: string} ];
  description: string;
  vpCount: number
}

export class VisboCenterResponse {
  state: string;
  message: string;
  vc: [ VisboCenter ]
}

export class VisboCenterUserResponse {
  state: string;
  message: string;
  users: [ VCUser ]
}

export class VCUser {
  _id: string;
  email: string;
  role: string;
  userId: string;
  message: string;
}

export class VCUserResponse {
  state: string;
  message: string;
  users: [ VCUser ]
}
