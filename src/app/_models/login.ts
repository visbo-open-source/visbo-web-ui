export class Login {
  email: string = "";
  password: string = ""
};

export class VisboUserFlat {
  _id: string;
  updatedAt: string;
  createdAT: string;
  email: string;
  password: string;
  name: string;
  //profile: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    // address: {
      street: string;
      zip: string;
      city: string;
      state: string;
      country: string;
    // };
  // };
  _v: number
};

export class VisboUser {
  _id: string;
  updatedAt: string;
  createdAT: string;
  email: string;
  password: string;
  name: string;
  profile: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    address: {
      street: string;
      zip: string;
      city: string;
      state: string;
      country: string;
    };
  };
  _v: number
};

export class LoginResponse {
  state: string;
  message: string;
  token: string;
  user: VisboUser
}
