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
  startDate: string;
  endDate: string;
  earliestStart: number;
  earliestStartDate: string;
  latestStart: number;
  latestStartDate: string;
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
  updatedAt: Date;
  createdAt: Date;
}

export class VisboProjectVersionResponse {
  state: string;
  message: string;
  vpv: [ VisboProjectVersion ]
}
