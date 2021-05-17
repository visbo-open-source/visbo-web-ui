export class Login {
  email: string;
  password: string;
}

export class VisboUserAddress {
  street: string;
  zip: string;
  city: string;
  state: string;
  country: string;
}

export class VisboUserProfile {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  address: VisboUserAddress;
}

export class VisboUserStatus {
  registeredAt: Date;
  lockedUntil: Date;
  lastLoginAt: Date;
  lastLoginFailedAt: Date;
  loginRetries: number;
  expiresAt: Date;
}

export class VisboUserInvite {
  email: string;
  groupName: string;
  inviteMessage: string;
}

export class VisboUser {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  email: string;
  password: string;
  name: string;
  profile: VisboUserProfile;
  status: VisboUserStatus;
  _v: number;
}

export class LoginResponse {
  state: string;
  message: string;
  token: string;
  user: VisboUser;
}

export class VisboUserResponse {
  state: string;
  message: string;
  user: VisboUser;
}

export class VisboUsersResponse {
  state: string;
  message: string;
  user: [VisboUser];
}

export class VisboOTTResponse {
  state: string;
  message: string;
  ott: string;
}

export class VisboVersion {
  version: Date;
  versionUI: Date;
}

export class VisboVersionResponse {
  state: string;
  message: string;
  status: VisboVersion;
}

export class VisboStatusPWPolicy {
  PWPolicy: string;
  Description: string;
}

export class VisboStatusPWPolicyResponse {
  state: string;
  message: string;
  value: VisboStatusPWPolicy;
}
