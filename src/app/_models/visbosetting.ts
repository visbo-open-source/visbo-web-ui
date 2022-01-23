
export class VisboSetting {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  vcid: string;
  name: string;
  type: string;
  userId: string;
  // eslint-disable-next-line
  value: any;
  timestamp: Date;
}

export class VisboSettingResponse {
  state: string;
  message: string;
  vcsetting: VisboSetting;
}

export class VisboSettingListResponse {
  state: string;
  message: string;
  vcsetting: [ VisboSetting ];
}

export class VisboOrgaResponse {
  state: string;
  message: string;
  // eslint-disable-next-line
  organisation: [ VisboOrganisation ];
}

export class VisboOrganisation {
  _id: string;
  name: string;
  timestamp: Date;
  allRoles: [ VisboRole ];
  allCosts: [ VisboCost ];
  allUnits: VisboReducedOrgaItem[];
}

export class VisboCost {
  name: string;
  uid: number;
}

export class VisboSubRole {
  key: number;
  value: number;
}

export class VisboRole {
  name: string;
  employeeNr: string;
  uid: number;
  subRoleIDs: VisboSubRole[];
  // eslint-disable-next-line
  teamIDs: [any];
  isTeam: boolean;
  isExternRole: boolean;
  entryDate: Date;
  exitDate: Date;
  defaultDayCapa: number;
  defaultKapa: number;
  tagessatz: number;
  timestamp: Date;
  aliases: [string];
  isAggregationRole: boolean;
  isSummaryRole: boolean;
}

export class VisboReducedOrgaItem {
  uid: number;
  pid: number;
  calcid: number;
  name: string;
  type: number;
  path: string;
  level: number;
  employeeNr: string;
  isTeam: string;
  isExternRole: string;
  entryDate: Date;
  exitDate: Date;
  defaultDayCapa: number;
  defaultKapa: number;
  percent: number;
  tagessatz: number;
  aliases: string;
  isAggregationRole: string;
  isSummaryRole: string;
}

export class VisboOrgaTreeLeaf {
  uid: number;
  name: string;
  parent: VisboOrgaTreeLeaf;
  children: VisboOrgaTreeLeaf[];
  showChildren: boolean;
  isSelected: TreeLeafSelection;
  status: number;
}

export enum TreeLeafSelection {
  SELECTED = "SELECTED",
  NOT_SELECTED = "NOT_SELECTED",
  PARENT_SELECTED = "PARENT_SELECTED"
}
