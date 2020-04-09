export class VPVCost {
  currentDate: Date;
  baseLineCost: number;
  currentCost: number;
}

export class VPVDelivery {
  id: number;
  name: string;
  phasePFV: string;
  phaseVPV: string;
  description: string;
  datePFV: Date;
  dateVPV: Date;
  changeDays: number;
  percentDone: number;

  fullName: string;
  statusID: number;
  status: string;
}


export class VPVDeadline {
  id: number;
  name: string;
  phasePFV: string;
  phaseVPV: string;
  type: string;
  startDatePFV: Date;
  startDateVPV: Date;
  endDatePFV: Date;
  endDateVPV: Date;
  changeDays: number;
  percentDone: number;

  fullName: string;
  statusID: number;
  status: string;
}

export class VPVKeyMetrics {
  costCurrentActual: number;
  costCurrentTotal: number;
  costBaseLastActual: number;
  costBaseLastTotal: number;
  timeCompletionCurrentActual: number;
  timeCompletionCurrentTotal: number;
  timeCompletionBaseLastActual: number;
  timeCompletionBaseLastTotal: number;
  timeDelayCurrentActual: number;
  timeDelayCurrentTotal: number;
  endDateCurrent: Date;
  endDateBaseLast: Date;
  deliverableCompletionCurrentActual: number;
  deliverableCompletionCurrentTotal: number;
  deliverableCompletionBaseLastActual: number;
  deliverableCompletionBaseLastTotal: number;
  deliverableDelayCurrentActual: number;
  deliverableDelayCurrentTotal: number;
}

export class VPVKeyMetricsCalc {
  _id: string;
  name: string;
  vpid: string;
  timestamp: Date;
  variantName: string;
  startDate: Date;
  Risiko: number;
  StrategicFit: number;
  leadPerson: string;
  status: string;
  ampelStatus: number;
  ampelErlaeuterung: string;
  VorlagenName: string;
  complexity: number;
  description: string;
  businessUnit: string;

  savingCostTotal: number;
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
  variantName: string;
  variantDescription: string;
  Risiko: number;
  StrategicFit: number;
  Erloes: number;
  leadPerson: string;
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
