export class VPUser {
  _id: string;
  email: string;
  role: string;
  userId: string;
}

export class VPVariant {
  _id: string;
  variantName: string;
  email: string;
  createdAt: Date;
  vpvCount: number;
}

export class VPLock {
  variantName: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
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
  vpvCount: number;
  variant: [VPVariant];
  lock: [VPLock];
  users: [ VPUser ];
  vc: {
    name: string;
  }
  perm: {system: number, vc: number, vp: number};
}

export class VisboProjectResponse {
  state: string;
  message: string;
  vp: [ VisboProject ];
  perm: {system: number, vc: number, vp: number};
}
