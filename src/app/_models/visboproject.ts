export enum VPTYPE {
    'Project' = 0, 'Portfolio' = 1, 'Template' = 2
}

export class VPRestrict {
  _id: string;
  name: string;
  groupid: string;
  inclChildren: boolean;
  user: {
    userId: string;
    email: string;
  };
  elementPath: [string];
  createdAt: Date;
}

export class VPVariant {
  _id: string;
  variantName: string;
  description: string;
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
  restrict: [VPRestrict];
  // eslint-disable-next-line
  capacity: any[];
  vc: {
    name: string;
    deletedAt: Date;
  };
  perm: {system: number, vc: number, vp: number};
  deletedAt: Date;
}

export class VisboProjectResponse {
  state: string;
  message: string;
  vp: [ VisboProject ];
  perm: {system: number, vc: number, vp: number};
}

export class VPVariantResponse {
  state: string;
  message: string;
  variant: [ VPVariant ];
}

export class VisboProjectLockResponse {
  state: string;
  message: string;
  lock: [VPLock];
}

export class VisboRestrictResponse {
  state: string;
  message: string;
  restrict: [ VPRestrict ];
  perm: {system: number, vc: number, vp: number};
}

export class VPParams {
  variantID: string;
  variantName: string;
  vpvid: string;
  deleted: string;
  refDate: string;
  view: string;
  viewKM: string;
  filter: string;
  roleID: number;
  unit: string;
  from: string;
  to: string;
  drillDown: string;
}

export interface CreateProjectProperty {
  vcid: string;
  vpType: number;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  templateID?: string;
  bac?: number;
  rac?: number;
  businessUnit?: string;
}
