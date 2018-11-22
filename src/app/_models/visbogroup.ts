
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

export enum VGPSystem {
    "View" = 1, "ViewAudit" = 2, "ViewLog" = 4, "ManagePerm" = 32, "ViewVC" = 128, "CreateVC" = 256, "ManageVC" = 512, "DeleteVC" = 1024
};

export enum VGPVC {
    "View" = 1, "ViewAudit" = 2, "Modify" = 16, "ManagePerm" = 32, "CreateVP" = 256
};

export enum VGPVP {
    "View" = 1, "ViewAudit" = 2, "Modify" = 16, "ManagePerm" = 32, "CreateVariant" = 256, "DeleteVP" = 1024
};

export class VGGroup {
  _id: string;
  name: string;
  vcid: string;
  groupType: string;
  global: boolean;
  permission: VGPermission;
  users: [VGUser]
}

export class VGUserGroup {
  userId: string;
  email: string;
  groupId: string;
  groupName: string;
}

export class VGUserGroupMix {
  groups: [ VGGroup ];
  users: [VGUserGroup];
}

export class VGResponse {
  state: string;
  message: string;
  groups: [ VGGroup ];
  users: [VGUserGroup];
}
