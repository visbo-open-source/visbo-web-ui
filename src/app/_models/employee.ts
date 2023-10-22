export interface VtrVisboTracker {
    userId: string;
    vpid: string;
    vcid: string;
    roleId: number;
    date: string;
    time: number;
    notes: string;
    approvalId: string;
    status: string;
    approvalDate: string;
  }

  export interface VtrVisboTrackerExtended extends VtrVisboTracker {
    vcName: string,
    vpName: string,
    timeTrackerId: number
    userName: string,
  }
