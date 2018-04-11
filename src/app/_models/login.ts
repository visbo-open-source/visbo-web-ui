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

export class VisboUser {
  _id: string;
  updatedAt: string;
  createdAT: string;
  email: string;
  password: string;
  name: string;
  profile: VisboUserProfile;
  _v: number
};

export class LoginResponse {
  state: string;
  message: string;
  token: string;
  user: VisboUser
}
