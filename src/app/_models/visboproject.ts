export class VPUser {
  _id: string;
  email: string;
  role: string;
  userId: string;
}

export class VPUserResponse {
  state: string;
  message: string;
  users: [ VPUser ]
}

export class VisboProject {
  _id: string;
  updatedAt: string;
  createdAt: string;
  vcid: string;
  name: string;
  description: string;
  vpType: number;
  vpPublic: boolean;
  users: [ VPUser ]
  vc: {
    name: string;
  }
}

export class VisboProjectResponse {
  state: string;
  message: string;
  vp: [ VisboProject ]
}
