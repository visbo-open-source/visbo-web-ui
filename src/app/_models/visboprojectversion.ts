import { VisboProject } from '../_models/visboproject';

export class VisboCapacity {
  name: string;
  vpid: string;
  vp: VisboProject;
  month: Date;
  roleID: number;
  roleName: string;
  variantName: string;
  actualCost_PT: number;
  plannedCost_PT: number;
  otherActivityCost_PT: number;
  internCapa_PT: number;
  externCapa_PT:	number;
  actualCost: number;
  plannedCost: number;
  otherActivityCost: number;
  internCapa: number;
  externCapa: number;
  baselineCost: number;
  baselineCost_PT: number;
}

export class VPVCost {
  currentDate: Date;
  baseLineCost: number;
  currentCost: number;
  baseLineInvoice: number;
  currentInvoice: number;
}

export class VPVPhase {
  // eslint-disable-next-line
  AllRoles: any[];
  // eslint-disable-next-line
	AllCosts: any[];
  AllResults: any [];
	percentDone: number;
	responsible: string;
	deliverables: string[];
	ampelStatus: number;
	ampelErlaeuterung: string;
	startOffsetinDays: number;
	dauerInDays: number;
	name: string;
	shortName: string;
	originalName: string;
}

export class VPVDelivery {
  nameID: string;
  name: string;
  phasePFV: string;
  fullPathPFV: [string];
  phaseVPV: string;
  fullPathVPV: [string];
  description: string;
  endDatePFV: Date;
  endDateVPV: Date;
  changeDays: number;
  percentDone: number;

  fullName: string;
  statusID: number;
  status: string;
}

export class VPVDeadline {
  nameID: string;
  name: string;
  phasePFV: string;
  fullPathPFV: [string];
  phaseVPV: string;
  fullPathVPV: [string];
  type: string;
  startDatePFV: Date;
  startDateVPV: Date;
  endDatePFV: Date;
  endDateVPV: Date;
  changeDays: number;
  percentDone: number;
  trafficlight: number;
  trafficlightDesc: string;
  responsible: string;

  fullName: string;
  statusID: number;
  status: string;
}

export  class VPVDblFields {
  str: string;
  dbl: number;
}

export  class VPVStrFields {
  strkey: string;
  strvalue: string;
}

export class VPVBoolFields {
  str: string;
  bool: boolean;
}

export class VPVKeyMetrics {
  RACBaseLast: number;
  RACCurrent: number;  
  RACBaseLastActual: number;
  RACCurrentActual: number;
  baselineDate: Date;
  costCurrentActual: number;
  costCurrentTotal: number;
  costCurrentTotalPredict: number;
  costBaseLastActual: number;
  costBaseLastTotal: number;
  timeCompletionCurrentActual: number;
  timeCompletionCurrentTotal: number;
  timeCompletionBaseLastActual: number;
  timeCompletionBaseLastTotal: number;
  timeDelayFinished: number;
  timeDelayUnFinished: number;
  endDateCurrent: Date;
  endDateBaseLast: Date;
  deliverableCompletionCurrentActual: number;
  deliverableCompletionCurrentTotal: number;
  deliverableCompletionBaseLastActual: number;
  deliverableCompletionBaseLastTotal: number;
  deliverableDelayFinished: number;
  deliverableDelayUnFinished: number;
}

export class VPVKeyMetricsCalc {
  _id: string;
  name: string;
  vpid: string;
  vp: VisboProject;
  timestamp: Date;
  variantName: string;
  startDate: Date;
  endDate: Date;
  Erloes: number;
  Risiko: number;
  StrategicFit: number;
  customDblFields: VPVDblFields[];
  customStringFields: VPVStrFields[];
  customBoolFields: VPVBoolFields[];
  vpStatus: string;
  vpStatusLocale: string;
  ampelStatus: number;
  ampelErlaeuterung: string;
  VorlagenName: string;
  complexity: number;
  description: string;
  businessUnit: string;

  savingCostTotal: number;
  savingCostTotalPredict: number;
  savingCostActual: number;
  savingEndDate: number;
  savingRAC : number;
  savingRACActual : number;
  timeCompletionTotal: number;
  timeCompletionActual: number;
  deliveryCompletionTotal: number;
  deliveryCompletionActual: number;
  keyMetrics: VPVKeyMetrics;
}

export class VisboProjectVersion {
  _id: string;
  name: string;
  vpid: string;
  vp: VisboProject;
  variantName: string;
  variantDescription: string;
  Risiko: number;
  StrategicFit: number;
  customDblFields: VPVDblFields[];
  customStringFields: VPVStrFields[];
  customBoolFields: VPVBoolFields[];
  Erloes: number;
  startDate: Date;
  endDate: Date;
  earliestStart: number;
  earliestStartDate: Date;
  latestStart: number;
  latestStartDate: Date;
  actualDataUntil: Date;
  status: string;
  ampelStatus: number;
  ampelErlaeuterung: string;
  farbe: number;
  Schrift: number;
  Schriftfarbe: number;
  VorlagenName: string;
  Dauer: number;
  AllPhases: VPVPhase[];
  timestamp: Date;
  volumen: number;
  complexity: number;
  description: string;
  businessUnit: string;

  keyMetrics: VPVKeyMetrics;
  cost: VPVCost[];
  delivery: VPVDelivery[];
  deadline: VPVDeadline[];
  capacity:VisboCapacity[];

  perm: {system: number, vc: number, vp: number};
  updatedAt: Date;
  createdAt: Date;
}

export class VisboProjectVersionResponse {
  state: string;
  message: string;
  vpv: [ VisboProjectVersion ];
  perm: {system: number, vc: number, vp: number};
}


export interface ExportKeyMetric extends Record<`custom${string}`, string> {
  project?: string;
  description?:string;
  timestamp?: Date;
  baselineDate?: Date;
  variant?: string;
  _strategicFit?: number;
  _risk?: number;
  _businessUnit?: string;
  vpStatus?: string;
  lead?: string;
  _PMCommit?: Date;
  startDate?: Date;
  trafficlight?: number;
  trafficlightDesc?: string;
  costCurrentActual?: number;
  costCurrentTotal?: number;
  costCurrentTotalPredict?: number;
  costBaseLastActual?: number;
  costBaseLastTotal?: number;
  racBaseLast?: number;
  racCurrent?: number;
  racBaseLastActual?: number;
  racCurrentActual?: number;
  timeCompletionCurrentActual?: number;
  timeCompletionCurrentTotal?: number;
  timeCompletionBaseLastActual?: number;
  timeCompletionBaseLastTotal?: number;
  timeDelayFinished?: number;
  timeDelayUnFinished?: number;
  endDateCurrent?: Date;
  endDateBaseLast?: Date;
  savingEndDate?: number;
  deliverableCompletionCurrentActual?: number;
  deliverableCompletionCurrentTotal?: number;
  deliverableCompletionBaseLastActual?: number;
  deliverableCompletionBaseLastTotal?: number;
  deliverableDelayFinished?: number;
  deliverableDelayUnFinished?: number;
  savingCostTotal?: number;
  savingCostTotalPredict?: number;
  savingCostActual?: number;
  savingRac?: number;
  savingRacActual?: number;
  timeCompletionTotal?: number;
  timeCompletionActual?: number;
  deliveryCompletionTotal?: number;
  deliveryCompletionActual?: number;
  vpid?: string;
  vpvid?: string;
}
