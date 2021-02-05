export class VPFItem {
  vpid: string;
  name: string;
  variantName: string;
  Start: Date;
  show: boolean;
  zeile: number;
  reasonToInclude: string;
  reasonToExclude: string;
}

export class VisboPortfolioVersion {
  _id: string;
  vpid: string;
  name: string;
  variantName: string;
  timestamp: Date;
  allItems: [VPFItem];
  sortType: number;
  sortList: [string];
  updatedAt: Date;
  createdAt: Date;
  deleted: {
    deletedAt: Date;
    byParent: boolean;
  };
  perm: {system: number; vc: number; vp: number; };
}

export class VisboPortfolioVersionResponse {
  state: string;
  message: string;
  vpf: [ VisboPortfolioVersion ];
  perm: {system: number; vc: number; vp: number; };
}

export class VPFParams {
  vpfid: string;
  refDate: string;
  view: string;
  filter: string;
  metricX: string;
  metricY: string;
  roleID: number;
  unit: string;
  from: string;
  to: string;
  pfv: string;
}
