export class Login {
  email: string = "";
  password: string = ""
};
export class VisboUserAddress {
  street: string;
  zip: string;
  city: string;
  state: string;
  country: string;
};

export class VisboUserProfile {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  address: VisboUserAddress;
};

export class VisboUserStatus {
  registeredAt: Date;
  lockedUntil: Date;
  lastLoginAt: Date;
  lastLoginFailedAt: Date;
  loginRetries: number
};

export class VisboUser {
  _id: string;
  updatedAt: string;
  createdAT: string;
  email: string;
  password: string;
  name: string;
  profile: VisboUserProfile;
  status: VisboUserStatus;
  _v: number
};

export class LoginResponse {
  state: string;
  message: string;
  token: string;
  user: VisboUser
}

export class VisboUserResponse {
  state: string;
  message: string;
  user: VisboUser
}

export class VisboUsersResponse {
  state: string;
  message: string;
  user: [VisboUser]
}

export class VisboStatusResponse {
  state: string;
  message: string;
  status: {version: string}
}
