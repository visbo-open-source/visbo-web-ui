
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

export class VisboOrganisationListResponse {
  state: string;
  message: string;
  vcorganisation: [ VisboSetting ];
}

export class VisboOrganisation {
  allCosts: [ VisboCost ];
  allRoles: [ VisboRole ];
}

export class VisboCost {
  name: string;
  uid: number;
  farbe: number;
  timestamp: Date;
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
  isTeamParent: boolean;
  isExternRole: boolean;
  entryDate: Date;
  exitDate: Date;
  farbe: number;
  defaultDayCapa: number;
  defaultKapa: number;
  tagessatzIntern: number;
  kapazitaet: [number];
  timestamp: Date;
  startOfCal: Date;
}

export class VisboOrgaTreeLeaf {
  uid: number;
  name: string;
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
