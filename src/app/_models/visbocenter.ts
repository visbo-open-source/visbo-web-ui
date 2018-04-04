export class VisboCenter {
  _id: string;
  updatedAt: string;
  createdAt: string;
  name: string;
  users: [ {email: string, role: string, _id: string} ]
}

export class VisboCenterResponse {
  state: string;
  message: string;
  vc: [ VisboCenter ]
}
