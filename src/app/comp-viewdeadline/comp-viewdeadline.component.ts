import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import {TranslateService} from '@ngx-translate/core';

import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVDeadline} from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewdeadline',
  templateUrl: './comp-viewdeadline.component.html',
  styleUrls: ['./comp-viewdeadline.component.css']
})
export class VisboCompViewDeadlineComponent implements OnInit {

  @Input() reducedPage: boolean;
  @Input() vpvActive: VisboProjectVersion;

  initVPVID: string;
  vpvDeadline: VPVDeadline[];
  vpvAllDeadline: VPVDeadline[];

  filterStatus: string;
  filterPhase: string;
  reducedList: boolean;

  parentThis: any;

  statusList: string[] = ['Ahead', 'In Time', 'Delay', 'Not Completed', 'Unknown'];

  colors: string[] = ['#005600', 'green', 'orange', 'red'];

  graphAllDataPieChart: any[] = [];
  graphBeforeAllDataPieChart: any[] = [];
  graphAllPieLegend: any;
  graphAllOptionsPieChart: any = undefined;
  divAllPieChart = 'divAllPieChart';

  graphOptionsDeadlinesGantt: any = undefined;
  graphDataDeadlinesGantt: any[] = [];
  currentLang: string;

  sortAscending = false;
  sortColumn = 1;
  sortAscendingDeadline = false;
  sortColumnDeadline = 1;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.statusList = [
      this.translate.instant('keyMetrics.chart.statusDeadlineAhead'),
      this.translate.instant('keyMetrics.chart.statusDeadlineInTime'),
      this.translate.instant('keyMetrics.chart.statusDeadlineDelay'),
      this.translate.instant('keyMetrics.chart.statusDeadlineNotCompleted'),
      'Unknown'
    ];
    if (this.route.snapshot.queryParams.vpvid) {
      this.initVPVID = this.route.snapshot.queryParams.vpvid;
    }
    this.visboDeadlineCalc();
  }

  ngOnChanges() {
    this.log(`Deadlines on Changes  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboDeadlineCalc();
  }

  visboDeadlineCalc(): void {
    if (!this.vpvActive) {
      return;
    }
    this.log(`Deadline Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getDeadline(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].deadline.length} entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].deadline) {
            this.log(`get VPV Calc: Reset Deadlines to empty `);
            this.initDeadlines(undefined);
          } else {
            this.log(`Store Deadlines for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].deadline.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.initDeadlines(visboprojectversions[0].deadline);
          }
          this.visboViewAllDeadlinePie();
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpViewDeadline.msg.errorPerm', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  initDeadlines(deadline: VPVDeadline[]): void {
    const filterDeadlines: VPVDeadline[] = [];
    const allDeadlines: VPVDeadline[] = [];
    this.reducedList = true;
    if (deadline === undefined) {
      this.vpvDeadline = undefined;
      return;
    }
    // generate long Names
    for (let i = 0; i < deadline.length; i++) {
      if (deadline[i].phasePFV) {
        this.reducedList = false;
      }
      deadline[i].fullName = this.getFullName(deadline[i], false);
      deadline[i].status = this.statusList[this.getStatus(deadline[i])];
      if (!this.filterStatus  || this.filterStatus ===  deadline[i].status) {
        if (!this.filterPhase  || this.filterPhase ===  deadline[i].phasePFV) {
          filterDeadlines.push(deadline[i]);
        }
      }
      allDeadlines.push(deadline[i]);
    }
    this.vpvDeadline = filterDeadlines;
    this.vpvAllDeadline = allDeadlines;
    this.sortDeadlineTable();
    // ur: 17.03.2020: Now without Gantt-Chart, later choosable with a toggle button 'GANTT'
    // this.visboViewDeadlineGantt();
  }

  getStatus(element: VPVDeadline): number {
    const refDate = this.vpvActive.timestamp;
    let status = 0;
    if (!element.endDatePFV) {
      // no comparison with pfv
      status = -1;
    } else  if (element.endDatePFV <= refDate && element.percentDone < 1) {
      status = 3;
    } else if (element.endDatePFV > refDate && element.percentDone === 1) {
      status = 0;
    } else if (element.endDatePFV <= refDate && element.percentDone === 1) {
      if (element.changeDays < 0) { status = 0; }
      if (element.changeDays === 0) { status = 1; }
      if (element.changeDays > 0) { status = 2; }
    } else if  (element.endDatePFV > refDate && element.percentDone < 1) {
      if (element.changeDays < 0) { status = 0; }
      if (element.changeDays === 0) { status = 1; }
      if (element.changeDays > 0) { status = 2; }
    } else {
      status = 4;
    }
    return status;
  }

  visboViewAllDeadlinePie(): void {
    // if (!this.vpvDeadline || this.vpvDeadline.length == 0) return;
    this.graphAllOptionsPieChart = {
        title: this.translate.instant('keyMetrics.chart.titleAllDeadlines'),
        titleTextStyle: {color: 'black', fontSize: '16'},
        tooltip : {
          trigger: 'none'
        },
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphAllPieLegend = [['string', 'Action Type'],
                        ['number', 'Count']
      ];

    const finishedDeadlineStatus: any = [];
    const graphData = [];
    let status;
    const refDate = this.vpvActive.timestamp;
    for (let i = 0; i < this.statusList.length; i++) {
      finishedDeadlineStatus[i] = 0;
    }
    let nonEmpty = false;
    for (let i = 0; i < this.vpvDeadline.length; i++) {
      // ur:24.2.2020
      // if (this.vpvDeadline[i].percentDone === 1) {
        // all  entries
        status = this.getStatus(this.vpvDeadline[i]);
        finishedDeadlineStatus[status] += 1;
        nonEmpty = true;
      // }
    }
    for (let i = 0; i < finishedDeadlineStatus.length; i++) {
      graphData.push([this.statusList[i], finishedDeadlineStatus[i]]);
    }

    this.graphBeforeAllDataPieChart = this.graphAllDataPieChart;
    if (nonEmpty) {
      this.graphAllDataPieChart = graphData;
    } else {
      this.graphAllDataPieChart = [];
    }
  }

  visboViewDeadlineGantt(): void {
    this.graphOptionsDeadlinesGantt = {
        title: this.translate.instant('keyMetrics.chart.titleDeadlinesGantt'),
        // titleTextStyle: {color: 'black', fontSize: '16'},
        tooltip : {
          trigger: 'none'
        },
        gantt: {
          labelStyle: {
            fontName: 'arial',
            fontSize: 18,
            color: 'black'
          },
          trackHeight: 30,
          barHeight: 15
        }
        // colors: this.colors
      };

    let graphData: any;
    graphData = [];
    for (let i = 0; i < this.vpvAllDeadline.length; i++) {
      const deadline = this.vpvAllDeadline[i];
      if (deadline.type === "Phase") {
        const startDate = deadline.startDateVPV ? new Date(deadline.startDateVPV) : new Date();
        const endDate = new Date(deadline.endDatePFV);
        const phase = deadline.phasePFV === '.' ? this.vpvActive.name : deadline.phasePFV;
        graphData.push([
          phase,
          phase,
          startDate.getTime(),
          endDate.getTime(),
          0,
          deadline.percentDone * 100,
          null
        ]);
      }
    }
    graphData.reverse();
    graphData.push([
      'Task ID',
      'Task Name',
      'Start Date',
      'End Date',
      'Duration',
      'Percent Complete',
      'Dependencies'
    ]);
    graphData.reverse();
    // calculate the necessary height as it has to be defined fixed, legend + number of lines * height
    this.graphOptionsDeadlinesGantt.height = 30 + graphData.length * (this.graphOptionsDeadlinesGantt.gantt.trackHeight || 40);
    this.graphDataDeadlinesGantt = graphData;
  }


  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (this.filterStatus !== label) {
      this.filterStatus = label;
    } else {
      this.filterStatus = undefined;
    }
    this.initDeadlines(this.vpvActive.deadline);
  }

  ganttSelectRow(row: number, label: string): void {
    this.log(`gantt Select Row ${row} for Filter ${label}`);
    if (row === undefined || label === '.') {
      this.filterPhase = undefined;
    } else {
      this.filterPhase = label;
    }
    this.initDeadlines(this.vpvActive.deadline);
  }

  getFullName(deadline: VPVDeadline, replaceRoot: boolean): string {
    let result = '';
    if (deadline.phaseVPV || deadline.phasePFV) {
      if (deadline.type === "Milestone") {
        result = result.concat(deadline.phaseVPV || deadline.phasePFV, ' / ');
        result = result.concat(deadline.name);
      } else if ( deadline.name === '.' && replaceRoot ) {
        result = result.concat(this.vpvActive.name);
      } else {
        result = result.concat(deadline.name);
      }
    }
    return result;
  }

  inFuture(ref: string): boolean {
    return (ref > this.vpvActive.timestamp.toString());
  }

  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  sortDeadlineTable(n?: number) {
    if (!this.vpvDeadline) {
      return;
    }
    if (n !== undefined) {
      if (n !== this.sortColumnDeadline) {
        this.sortColumnDeadline = n;
        this.sortAscendingDeadline = undefined;
      }
      if (this.sortAscendingDeadline === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscendingDeadline = ( n === 2 || n === 3 || n === 4 || n === 7 ) ? true : false;
      } else {
        this.sortAscendingDeadline = !this.sortAscendingDeadline;
      }
    } else {
      this.sortColumnDeadline = 2;
      this.sortAscendingDeadline = true;
    }
    if (this.sortColumnDeadline === 1) {
      // sort by Deadline Index
      this.vpvDeadline.sort(function(a, b) {
        return a.id - b.id;
      });
    } else if (this.sortColumnDeadline === 2) {
      this.vpvDeadline.sort(function(a, b) { return visboCmpString(a.fullName, b.fullName); });
    } else if (this.sortColumnDeadline === 3) {
      this.vpvDeadline.sort(function(a, b) {
        return visboCmpString(a.type.toLowerCase(), b.type.toLowerCase());
      });
    } else if (this.sortColumnDeadline === 4) {
      this.vpvDeadline.sort(function(a, b) { return visboCmpDate(a.endDateVPV, b.endDateVPV); });
    } else if (this.sortColumnDeadline === 5) {
      this.vpvDeadline.sort(function(a, b) { return a.changeDays - b.changeDays; });
    } else if (this.sortColumnDeadline === 6) {
      this.vpvDeadline.sort(function(a, b) { return a.percentDone - b.percentDone; });
    } else if (this.sortColumnDeadline === 7) {
      this.vpvDeadline.sort(function(a, b) { return visboCmpDate(a.endDatePFV, b.endDatePFV); });
    }
    if (!this.sortAscendingDeadline) {
      this.vpvDeadline.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompViewDeadline: ' + message);
  }

}
