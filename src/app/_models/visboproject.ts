import { VisboUser } from '../_models/visbouser';

export enum VPTYPE {
    PROJECT = 0, PORTFOLIO = 1, TEMPLATE = 2
}

export class VPRestrict {
  _id: string;
  name: string;
  groupid: string;
  inclChildren: boolean;
  user: {
    userId: string;
    email: string;
  };
  elementPath: [string];
  createdAt: Date;
}

export class VPVariant {
  _id: string;
  variantName: string;
  description: string;
  email: string;
  createdAt: Date;
  vpvCount: number;
  vpfCount: number;
}

export class VPLock {
  variantName: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

export class VPCustomString {
  name: string;
  localName: string;
  value: string;
  type: string;
}

export class VPCustomDouble {
  name: string;
  localName: string;
  value: number;
  type: string;
}

export class VPCustomDate {
  name: string;
  localName: string;
  value: Date;
  type: string;
}

export class VisboProject {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
  vcid: string;
  name: string;
  description: string;
  managerId: string;
  kundennummer: string;
  vpType: number;
  vpPublic: boolean;
  vpvCount: number;
  vpfCount: number;
  variant: [VPVariant];
  lock: [VPLock];
  restrict: [VPRestrict];
  vpStatus: string;
  vpStatusLocale: string;
  customFieldDouble: VPCustomDouble[];
	customFieldString: VPCustomString[];
  customFieldDate: VPCustomDate[];
  vc: {
    name: string;
    deletedAt: Date;
  };
  deletedAt: Date;
  // values outside of the ReST VP Definition
  // eslint-disable-next-line
  capacity: any[];
  costtypes: any[];
  manager: VisboUser;
  perm: {system: number, vc: number, vp: number};
}

export class VisboProjectResponse {
  state: string;
  message: string;
  vp: [ VisboProject ];
  perm: {system: number, vc: number, vp: number};
}

export class VPVariantResponse {
  state: string;
  message: string;
  variant: [ VPVariant ];
}

export class VisboProjectLockResponse {
  state: string;
  message: string;
  lock: [VPLock];
}

export class VisboRestrictResponse {
  state: string;
  message: string;
  restrict: [ VPRestrict ];
  perm: {system: number, vc: number, vp: number};
}

export class VPParams {
  variantID: string;
  variantName: string;
  vpvid: string;
  deleted: string;
  refDate: string;
  calcPredict: string;
  view: string;
  viewKM: string;
  filter: string;
  roleID: number;
  unit: string;
  from: string;
  to: string;
  drillDown: string;
}

export interface CreateProjectProperty {
  vcid: string;
  vpType: number;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  templateID?: string;
  bac?: number;
  rac?: number;
  businessUnit?: string;
  // ur: 25.08.2023 added
  customFieldString?: VPCustomString[];
  customFieldDouble?: VPCustomDouble[];
  customFieldDate?: VPCustomDate[];
}

export const constSystemCustomName = ['_businessUnit', '_risk', '_strategicFit', '_PMCommit']
export const constSystemVPStatus = ['initialized', 'proposed', 'ordered', 'paused', 'finished', 'stopped']
export const constSystemVPStatusFrozen = ['paused', 'finished', 'stopped']

export function getCustomFieldString(vp: VisboProject, name: string): VPCustomString {
  let result: VPCustomString = undefined;
  if (vp && vp.customFieldString) {
    result = vp.customFieldString?.find(element => element.name == name)
  }
  return result;
}

export function addCustomFieldString(vp: VisboProject, name: string, value: string): VPCustomString {
  const customField = new VPCustomString();
  customField.name = name;
  customField.value = value;
  if (constSystemCustomName.findIndex(str => str == name) > -1){
    customField.type = "System"
  }
  if (vp?.customFieldString) {
    vp.customFieldString.push(customField);
  }
  return customField;
}

export function addCustomFieldDouble(vp: VisboProject, name: string, value: number): VPCustomDouble {
  const customField = new VPCustomDouble();
  customField.name = name;
  customField.value = value;
  if (constSystemCustomName.findIndex(str => str == name) > -1){
    customField.type = "System"
  }
  if (vp?.customFieldDouble) {
    vp.customFieldDouble.push(customField);
  }
  return customField;
}

export function getCustomFieldDouble(vp: VisboProject, name: string): VPCustomDouble {
  let result: VPCustomDouble = undefined;
  if (vp && vp.customFieldDouble) {
    result = vp.customFieldDouble.find(element => element.name == name)
  }
  return result;
}

export function addCustomFieldDate(vp: VisboProject, name: string, value: Date): VPCustomDate {
  const customField = new VPCustomDate();
  customField.name = name;
  customField.value = new Date(value);  
  if (constSystemCustomName.findIndex(str => str == name) > -1){
    customField.type = "System"
  }
  if (vp?.customFieldDate) {
    vp.customFieldDate.push(customField);
  }
  return customField;
}

export function getCustomFieldDate(vp: VisboProject, name: string): VPCustomDate {
  let result: VPCustomDate = undefined;;
  if (vp && vp.customFieldDate) {
    result = vp.customFieldDate.find(element => element.name == name)
  }
  return result;
}
