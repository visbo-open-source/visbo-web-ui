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

export class VPVKeyMetrics {
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
  Risiko: number;
  StrategicFit: number;
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
// Missing AllPhases
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
