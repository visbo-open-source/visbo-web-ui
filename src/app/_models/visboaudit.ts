export class VisboAudit {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  user: {
    userId: string;
    email: string;
  };
  vc: {
    vcid: string;
    name: string;
    vcjson: string;
  };
  vp: {
    vpid: string;
    name: string;
    vpjson: string;
  };
  vpv: {
    vpvid: string;
    name: string;
  };
  action: string;
  actionDescription: string;
  actionInfo: string;
  url: string;
  ip: string;
  ttl: Date;
  sysAdmin: boolean;
  userAgent: string;
  result: {
    time: number;
    status: string;
    statusText: string;
    size: number;
  }
}

export class VisboAuditResponse {
  state: string;
  message: string;
  audit: [ VisboAudit ]
}

export class VisboAuditActionType {
  "name": string;
  "action": string
}

export class QueryAuditType {
  "from": Date;
  "to": Date;
  "text": string;
  "actionType": string;
  "area": string;
  "maxcount": number;
}
