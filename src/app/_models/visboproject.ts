export class VisboProject {
  _id: string;
  updatedAt: string;
  createdAt: string;
  vcid: string;
  name: string;
  users: [ {email: string, role: string, _id: string} ]
  vc: {
    name: string;
  }
}

export class VisboProjectResponse {
  state: string;
  message: string;
  vp: [ VisboProject ]
}
