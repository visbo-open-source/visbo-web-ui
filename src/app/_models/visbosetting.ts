
export class VisboSetting {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  vcid: string;
  name: string;
  type: string;
  userId: string;
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
  name:  string;
	uid: number;
	farbe: number;
	timestamp: Date;
}

export class VisboRole {
  name: string;
  employeeNr: string;
	uid: number;
	subRoleIDs : any;
	teamIDs: [any];
  isTeam: boolean;
  isTeamParent: boolean;
  isExternRole: boolean;
  entryDate: Date;
  exitDate: Date;
	farbe: number;
	defaultKapa	:number;
	tagessatzIntern	:number;
	kapazitaet : [number];
	timestamp: Date;
	startOfCal: Date;
}