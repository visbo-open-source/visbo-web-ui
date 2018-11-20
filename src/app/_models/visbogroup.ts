
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

export enum systemPerm1 {
    'View' = 1
};

export class VisboPermission {
    public systemPerm1 : systemPerm1;
}

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

export class VGGroupResponse {
  state: string;
  message: string;
  groups: [ VGGroup ];
}

export class VGUserGroupMix {
  groups: [ VGGroup ];
  users: [VGUserGroup];
}

export class VGUserResponse {
  state: string;
  message: string;
  groups: [ VGGroup ];
  users: [VGUserGroup];
}
