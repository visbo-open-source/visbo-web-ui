import { Component, OnInit } from '@angular/core';

import {TranslateService} from '@ngx-translate/core';

import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVDeadline} from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-viewdeadline',
  templateUrl: './visboproject-viewdeadline.component.html',
  styleUrls: ['./visboproject-viewdeadline.component.css']
})
export class VisboProjectViewDeadlineComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];

  vpSelected: string;
  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  initVPVID: string;
  vpvDeadline: VPVDeadline[];
  vpvAllDeadline: VPVDeadline[];

  filterStatus: string;
  filterPhase: string;
  vpvActualDataUntil: Date;
  deleted = false;

  refDateInterval = 'month';
  vpvRefDate: Date;
  scrollRefDate: Date;
  chartButton = 'View List';
  chart = true;
  history = false;
  historyButton = 'View Trend';
  parentThis: any;

  statusList: string[] = ['Ahead', 'In Time', 'Delay', 'Not Completed', 'Unknown'];

  colors: string[] = ['#005600', 'green', 'orange', 'red'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star', lineDashStyle: [4, 8, 8, 4] }
  };

  graphFinishedDataPieChart: any[] = [];
  graphBeforeFinishedDataPieChart: any[] = [];
  graphFinishedPieLegend: any;
  graphFinishedOptionsPieChart: any = undefined;
  divFinishedPieChart = 'divFinishedPieChart';

  graphUnFinishedDataPieChart: any[] = [];
  graphBeforeUnFinishedDataPieChart: any[] = [];
  graphUnFinishedPieLegend: any;
  graphUnFinishedOptionsPieChart: any = undefined;
  divUnFinishedPieChart = 'divUnFinishedPieChart';

  graphOptionsDeadlinesGantt: any = undefined;
  graphDataDeadlinesGantt: any[] = [];

  sortAscending = false;
  sortColumn = 1;
  sortAscendingDeadline = false;
  sortColumnDeadline = 1;

  today: Date = new Date();

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
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
    this.getVisboProjectVersions();
  }
  onSelect(visboprojectversion: VisboProjectVersion): void {
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vpSelected = id;
    this.parentThis = this;
    const chartFlag = this.chart;

    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, '', false)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.log(`get VPV: Get ${visboprojectversions.length} Project Versions`);
                  if (visboprojectversions.length > 0) {
                    this.sortVPVTable();
                  }
                  let initIndex = 0;
                  if (this.initVPVID) {
                    for (let i = 0; i < visboprojectversions.length; i++) {
                      if (visboprojectversions[i]._id.toString() === this.initVPVID) {
                        initIndex = i;
                        break;
                      }
                    }
                  }
                  this.visboDeadlineCalc(initIndex);
                  if (this.hasVPPerm(this.permVP.ViewAudit)) {
                    this.chart = chartFlag;
                  } else {
                    this.chart = false;
                  }
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    this.alertService.error(`Permission Denied for Visbo Project Versions`);
                  } else {
                    this.alertService.error(error.error.message);
                  }
                }
              );
          },
          error => {
            this.log(`get VPV VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpViewDeadline.msg.errorPerm', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(error.error.message);
            }
        });
    }
  }

  visboDeadlineCalc(index: number): void {
    const chartFlag = this.chart;
    this.chart = false;
    this.vpvActive = this.visboprojectversions[index];
    this.vpvRefDate = this.vpvActive.timestamp;
    if (this.scrollRefDate === undefined) {
      this.scrollRefDate = new Date(this.vpvRefDate);
    }
    if (!this.vpvActive) {
      return;
    }

    this.log(`Deadline Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getDeadline(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].deadlines.length} entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].deadlines) {
            this.log(`get VPV Calc: Reset Deadlines to empty `);
            this.initDeadlines(undefined);
          } else {
            this.log(`Store Deadlines for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].deadlines.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.initDeadlines(visboprojectversions[0].deadlines);
            this.vpvActualDataUntil = visboprojectversions[0].actualDataUntil;
            this.visboprojectversions[index].deadlines = this.vpvDeadline;
            this.visboprojectversions[index].actualDataUntil = visboprojectversions[0].actualDataUntil;
          }

          this.visboViewFinishedDeadlinePie();
          // ur:24.2.2020:nur noch ein Chart anzeigen
          // this.visboViewUnFinishedDeadlinePie();
          if (this.hasVPPerm(this.permVP.ViewAudit)) {
            this.chart = chartFlag;
          } else {
            this.chart = false;
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied for Visbo Project Versions`);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  initDeadlines(deadlines: VPVDeadline[]): void {
    const filterDeadlines: VPVDeadline[] = [];
    const allDeadlines: VPVDeadline[] = [];
    if (deadlines === undefined) {
      this.vpvDeadline = deadlines;
      this.graphDataDeadlinesGantt = [];
      return;
    }
    // generate long Names
    for (let i = 0; i < deadlines.length; i++) {
      deadlines[i].fullName = this.getFullName(deadlines[i], false);
      deadlines[i].status = this.statusList[this.getStatus(deadlines[i])];
      if (!this.filterStatus  || this.filterStatus ===  deadlines[i].status) {
        if (!this.filterPhase  || this.filterPhase ===  deadlines[i].phasePFV) {
          filterDeadlines.push(deadlines[i]);
        }
      }
      allDeadlines.push(deadlines[i]);
    }
    this.vpvDeadline = filterDeadlines;
    this.vpvAllDeadline = allDeadlines;
    this.sortDeadlineTable();
    // ur: 17.03.2020: Now without Gantt-Chart, later choosable with a toggle button 'GANTT'
    // this.visboViewDeadlineGantt();
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    const localA = new Date(dateA);
    const localB = new Date(dateB);
    localA.setHours(0, 0, 0, 0);
    localB.setHours(0, 0, 0, 0);
    // return false;
    return localA.getTime() === localB.getTime();
  }

  getStatus(element: VPVDeadline): number {
    const refDate = this.vpvActive.timestamp;
    let status = 0;
    if (element.endDatePFV <= refDate && element.percentDone < 1) {
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

  visboViewFinishedDeadlinePie(): void {
    // if (!this.vpvDeadline || this.vpvDeadline.length == 0) return;
    this.graphFinishedOptionsPieChart = {
        title: this.translate.instant('keyMetrics.chart.titleFinishedDeadlines'),
        titleTextStyle: {color: 'black', fontSize: '16'} ,
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphFinishedPieLegend = [['string', 'Action Type'],
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

    this.graphBeforeFinishedDataPieChart = this.graphFinishedDataPieChart;
    if (nonEmpty) {
      this.graphFinishedDataPieChart = graphData;
    } else {
      this.graphFinishedDataPieChart = [];
    }
  }

  visboViewUnFinishedDeadlinePie(): void {
    // if (!this.vpvDeadline || this.vpvDeadline.length == 0) return;
    this.graphUnFinishedOptionsPieChart = {
        title: this.translate.instant('keyMetrics.chart.titleUnFinishedDeadlines'),
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphUnFinishedPieLegend = [['string', 'Action Type'],
                        ['number', 'Count']
      ];

    const unFinishedDeadlineStatus: any = [];
    const graphData = [];
    let status;
    const refDate = this.vpvActive.timestamp;
    for (let i = 0; i < this.statusList.length; i++) {
      unFinishedDeadlineStatus[i] = 0;
    }
    let nonEmpty = false;
    for (let i = 0; i < this.vpvDeadline.length; i++) {
      if (this.vpvDeadline[i].percentDone < 1) {
        // unfinished entries
        status = this.getStatus(this.vpvDeadline[i]);
        unFinishedDeadlineStatus[status] += 1;
        nonEmpty = true;
      }
    }
    for (let i = 0; i < unFinishedDeadlineStatus.length; i++) {
      graphData.push([this.statusList[i], unFinishedDeadlineStatus[i]]);
    }
    this.graphBeforeUnFinishedDataPieChart = this.graphUnFinishedDataPieChart;
    if (nonEmpty) {
      this.graphUnFinishedDataPieChart = graphData;
    } else {
      this.graphUnFinishedDataPieChart = [];
    }

  }

  visboViewDeadlineGantt(): void {
    this.graphOptionsDeadlinesGantt = {
        title: this.translate.instant('keyMetrics.chart.titleDeadlinesGantt'),
        // titleTextStyle: {color: 'black', fontSize: '16'},
        gantt: {
          labelStyle: {
            fontName: 'arial',
            fontSize: 18,
            color: 'black'
          },
          trackHeight: 40
        }
        // colors: this.colors
      };

    let graphData = [];
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
    // calculate the necessary height as it has to be defined fixed
    this.graphOptionsDeadlinesGantt.height = graphData.length * (this.graphOptionsDeadlinesGantt.gantt.trackHeight || 40);
    this.graphDataDeadlinesGantt = graphData;
  }


  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (this.filterStatus !== label) {
      this.filterStatus = label;
    } else {
      this.filterStatus = undefined;
    }
    this.initDeadlines(this.vpvActive.deadlines);
  }

  ganttSelectRow(row: number, label: string): void {
    this.log(`gantt Select Row ${row} for Filter ${label}`);
    if (row === undefined || label === '.') {
      this.filterPhase = undefined;
    } else {
      this.filterPhase = label;
    }
    this.initDeadlines(this.vpvActive.deadlines);
  }

  getFullName(deadline: VPVDeadline, replaceRoot: boolean): string {
    let result = '';
    if (deadline.phaseVPV || deadline.phasePFV) {
      if (deadline.type === "Milestone") {
        result = result.concat(deadline.phaseVPV || deadline.phasePFV, ' / ');
        result = result.concat(deadline.name);
      } else if ( deadline.name === '.' && replaceRoot ){
        result = result.concat(this.vpvActive.name);
      } else {
        result = result.concat(deadline.name);
      }
    }
    return result;
  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.scrollRefDate} ${increment} ${this.refDateInterval}`);
    this.filterStatus = undefined;
    const newRefDate = new Date(this.scrollRefDate);
    let i = 0;
    switch (this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        if (increment > 0 || newRefDate.getTime() === this.scrollRefDate.getTime()) {
          newRefDate.setDate(newRefDate.getDate() + increment);
        }
        break;
      case 'week':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        newRefDate.setDate(newRefDate.getDate() + increment * 7);
        break;
      case 'month':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        newRefDate.setDate(1);
        if (increment > 0 || newRefDate.getTime() === this.scrollRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment);
        }
        break;
      case 'quarter':
        let quarter = Math.trunc(newRefDate.getMonth() / 3);
        if (increment > 0) {
          quarter += increment;
        }
        newRefDate.setMonth(quarter * 3);
        newRefDate.setDate(1);
        newRefDate.setHours(0, 0, 0, 0);
        if (newRefDate.getTime() === this.scrollRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3);
        }
        break;
    }
    this.log(`get getRefDateVersions ${newRefDate.toISOString()} ${this.scrollRefDate.toISOString()}`);
    this.scrollRefDate = newRefDate;
    let newVersionIndex;
    if (increment > 0) {
      const refDate = new Date(this.visboprojectversions[0].timestamp);
      if (newRefDate.getTime() >= refDate.getTime()) {
        newVersionIndex = 0;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    } else {
      const refDate = new Date(this.visboprojectversions[this.visboprojectversions.length - 1].timestamp);
      if (newRefDate.getTime() <= refDate.getTime()) {
        newVersionIndex = this.visboprojectversions.length - 1;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    }
    if (newVersionIndex === undefined) {
      this.log(`get getRefDateVersions normalised ${(new Date(newRefDate)).toISOString()}`);
      for (i = 0; i < this.visboprojectversions.length; i++) {
        const cmpDate = new Date(this.visboprojectversions[i].timestamp);
        // this.log(`Compare Date ${cmpDate.toISOString()} ${newRefDate.toISOString()}`);
        if (cmpDate.getTime() <= newRefDate.getTime()) {
          break;
        }
      }
      newVersionIndex = i;
    }
    if (newVersionIndex >= 0) {
      this.visboDeadlineCalc(newVersionIndex);
    }
  }

  gotoVisboProjectVersions(): void {
    // this.log(`goto VPV All Versions ${this.vpvKeyMetricActive.vpid} `);
    // this.router.navigate(['vpv/'.concat(this.vpvKeyMetricActive.vpid)], {});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion): void {
    // this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  listSelectRow(vpv: any): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    // this.setVpvActive(vpv);
  }

  setVpvActive(vpv: any): void {
    this.log(`setVpvActive Not Implemented`);
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVP(visboproject: VisboProject): void {
    this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  inFuture(ref: string): boolean {
    return (ref > this.vpvActive.timestamp.toString());
  }

  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  sortVPVTable(n?: number) {
    if (!this.visboprojectversions) {
      return;
    }
    if (n !== undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n === 5 ) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }
    if (this.sortColumn === 1) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortColumn === 2) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.endDate, b.endDate); });
    } else if (this.sortColumn === 3) {
      this.visboprojectversions.sort(function(a, b) { return a.ampelStatus - b.ampelStatus; });
    } else if (this.sortColumn === 4) {
      this.visboprojectversions.sort(function(a, b) { return a.Erloes - b.Erloes; });
    } else if (this.sortColumn === 5) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase()); });
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
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
    this.messageService.add('VisboViewDeadline: ' + message);
  }

}
