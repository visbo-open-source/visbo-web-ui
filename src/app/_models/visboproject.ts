export enum VPTYPE {
    "Project" = 0, "Portfolio" = 1, "Template" = 2
};

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

export class VisboProject {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  vcid: string;
  name: string;
  description: string;
  vpType: number;
  vpPublic: boolean;
  vpvCount: number;
  variant: [VPVariant];
  lock: [VPLock];
  vc: {
    name: string;
    deletedAt: Date;
  }
  perm: {system: number, vc: number, vp: number};
  deletedAt: Date;
}

export class VisboProjectResponse {
  state: string;
  message: string;
  vp: [ VisboProject ];
  perm: {system: number, vc: number, vp: number};
}
