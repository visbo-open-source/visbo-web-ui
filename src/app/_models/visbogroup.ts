
export class VGUser {
  _id: string;
  email: string;
  userId: string;
}

export class VGPermission {
  system: number;
  vc: number;
  vp: number;
}

export enum VGPSYSTEM {
    'View' = 1, 'ViewAudit' = 2, 'ViewLog' = 4, 'Modify' = 16, 'ManagePerm' = 32, 'CreateVC' = 256, 'DeleteVC' = 1024
}

export enum VGPVC {
    'View' = 1, 'ViewAudit' = 2, 'Modify' = 16, 'ManagePerm' = 32, 'CreateVP' = 256
}

export enum VGPVP {
    'View' = 1, 'ViewAudit' = 2, 'Modify' = 16, 'ManagePerm' = 32, 'CreateVariant' = 256, 'ViewRestricted' = 512, 'DeleteVP' = 1024
}

export class VGGroup {
  _id: string;
  name: string;
  vcid: string;
  vpids: string[];
  groupType: string;
  internal: boolean;
  global: boolean;
  permission: VGPermission;
  users: [VGUser];
}

export class VGGroupExpanded {
  _id: string;
  name: string;
  global: boolean;
  groupType: string;
  internal: boolean;
  checkedSystemView: boolean;
  checkedSystemViewAudit: boolean;
  checkedSystemViewLog: boolean;
  checkedSystemModify: boolean;
  checkedSystemCreateVC: boolean;
  checkedSystemDeleteVC: boolean;
  checkedSystemManagePerm: boolean;
  checkedView: boolean;
  checkedViewAudit: boolean;
  checkedModify: boolean;
  checkedCreateVP: boolean;
  checkedManagePerm: boolean;
  checkedVPView: boolean;
  checkedVPViewRestricted: boolean;
  checkedVPViewAudit: boolean;
  checkedVPModify: boolean;
  checkedCreateVariant: boolean;
  checkedVPManagePerm: boolean;
  checkedVPDelete: boolean;
  users: [VGUser];
}

export class VGUserGroup {
  userId: string;
  email: string;
  groupId: string;
  groupName: string;
  groupType: string;
  internal: boolean;
}

export class VGProjectUserGroup {
  vpid: string;
  users: VGUser;
  groupName: string;
  groupType: string;
  vp: {name: string};
}

export class VGUserGroupMix {
  groups: [ VGGroup ];
  users: [VGUserGroup];
  vpusers: [VGProjectUserGroup];
}

export class VGResponse {
  state: string;
  message: string;
  groups: [ VGGroup ];
  users: [VGUserGroup];
  vpusers: [VGProjectUserGroup];
}
