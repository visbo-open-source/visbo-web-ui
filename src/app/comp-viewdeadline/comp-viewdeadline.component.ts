import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import {TranslateService} from '@ngx-translate/core';

import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVDeadline} from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import * as moment from 'moment';
import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewdeadline',
  templateUrl: './comp-viewdeadline.component.html',
  styleUrls: ['./comp-viewdeadline.component.css']
})
export class VisboCompViewDeadlineComponent implements OnInit, OnChanges {

  @Input() vpvActive: VisboProjectVersion;
  @Input() combinedPerm: VGPermission;

  currentVpvId: string;
  allDeadline: VPVDeadline[];
  hierarchyDeadline: VPVDeadline[];       // deadlines of a filtered hierarchy
  filteredDeadline: VPVDeadline[];      // subItemDeadlines filtered by status
  viewGantt: boolean;
  buttonGantt: "View Gantt";
  filterPath: string[];

  filterStatus: number;
  fullList: boolean;

  deadlineIndex: number;

  listType: any[] = [
    {name: 'PFV', ref: 'pfv', localName: ''},
    {name: 'VPV', ref: 'vpv', localName: ''},
    {name: 'All', ref: undefined, localName: ''}
  ];
  type = this.listType[0].name;
  refType = this.listType[0].ref;
  switchType = true;

  parentThis: any;

  statusList: string[];

  colors: string[] = ['#005600', 'green', 'orange', 'red'];

  graphAllDataPieChart: any[] = [];
  graphBeforeAllDataPieChart: any[] = [];
  graphAllPieLegend: any;
  graphAllOptionsPieChart: any = undefined;
  divAllPieChart = 'divAllDeadLinePieChart';

  graphOptionsDeadlinesGantt: any = undefined;
  graphDataDeadlinesGantt: any[] = [];

  permVC: any = VGPVC;
  permVP: any = VGPVP;

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
    this.parentThis = this;
    this.statusList = [
      this.translate.instant('keyMetrics.chart.statusDeadlineAhead'),
      this.translate.instant('keyMetrics.chart.statusDeadlineInTime'),
      this.translate.instant('keyMetrics.chart.statusDeadlineDelay'),
      this.translate.instant('keyMetrics.chart.statusDeadlineNotCompleted'),
      'Unknown'
    ];
    this.buttonGantt = this.translate.instant('compViewDelivery.btn.buttonGanttOn');
    this.listType.forEach(item => item.localName = this.translate.instant('compViewDelivery.lbl.'.concat(item.name)));
    this.currentVpvId = this.vpvActive._id;
    this.visboDeadlineCalc();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.log(`Deadlines on Changes  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    if (this.currentVpvId !== undefined && this.vpvActive._id !== this.currentVpvId) {
      this.visboDeadlineCalc();
    }
  }

  visboDeadlineCalc(): void {
    if (!this.vpvActive) {
      return;
    }
    this.fullList = this.hasVPPerm(this.permVP.View);
    if (!this.fullList) {
      this.refType = undefined;
    }
    this.currentVpvId = this.vpvActive._id;
    this.log(`Deadline Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp} Reference ${this.refType}`);
    this.visboprojectversionService.getDeadline(this.vpvActive._id, this.refType)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].deadline.length} entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].deadline) {
            this.log(`get VPV Calc: Reset Deadlines to empty `);
            this.allDeadline = undefined;
          } else {
            this.log(`Get Deadlines for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].deadline.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.allDeadline = visboprojectversions[0].deadline;
          }
          this.initDeadlines();
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('compViewDeadline.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  initDeadlines(): void {
    if (this.allDeadline === undefined) {
      this.hierarchyDeadline = [];
      return;
    }

    this.filterPath = this.getFullPath(this.allDeadline[0]);
    this.switchType = (this.refType === 'vpv');
    // generate long Names
    for (let i = 0; i < this.allDeadline.length; i++) {
      this.allDeadline[i].fullName = this.getFullName(this.allDeadline[i]);
      this.allDeadline[i].status = this.statusList[this.getStatus(this.allDeadline[i])];
      this.allDeadline[i].statusID = this.getStatus(this.allDeadline[i]);
      // check if the user can switch between pfv & vpv
      if (this.switchType ||  this.allDeadline[i].endDatePFV) {
        this.switchType = true;
      }
    }
    this.filterDeadlines(true);
  }

  filterDeadlines(change: boolean): void {

    if (this.allDeadline === undefined || this.allDeadline.length === 0) {
      return;
    }
    const strFilterPath = this.filterPath.join(' / ');

    this.hierarchyDeadline = [];
    this.filteredDeadline = [];
    // filter by hierarchy
    for (let i = 0; i < this.allDeadline.length; i++) {
      const path = this.getFullPath(this.allDeadline[i]);
      if (path.join(' / ').indexOf(strFilterPath) == 0) {  // sub item of filtered hierarchy
        this.hierarchyDeadline.push(this.allDeadline[i]);
      }
    }
    for (let i = 0; i < this.hierarchyDeadline.length; i++) {
      if (this.filterStatus === undefined  || this.filterStatus ===  this.hierarchyDeadline[i].statusID) {
        this.filteredDeadline.push(this.hierarchyDeadline[i]);
      }
    }
    this.sortDeadlineTable();
    this.visboViewAllDeadlinePie(change);
    // this.visboViewDeadlineGantt();
    this.visboViewDeadlineTimeline();
  }

  helperDeadline(index: number): void {
    this.deadlineIndex = index;
  }

  getElementPath(index: number, len?: number): string {
    let path = [];
    if (this.refType === 'vpv' || this.refType === undefined) {
      path = this.filteredDeadline[index].fullPathVPV;
    }
    if (this.refType === 'pfv' ) {
       path = this.filteredDeadline[index].fullPathPFV;
    }

    let result = '';
    if (path.length <= 1) {
      result = this.vpvActive.name;
    } else {
      result = path.slice(1).join(' / ');
    }
    if (len > 0) {
      result = visboGetShortText(result, len, 'right');
    }
    return result;
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  canSeeRestriction(): boolean {
      let perm = this.combinedPerm.vp || 0;
      perm = perm & (this.permVP.Modify + this.permVP.ManagePerm);
      return perm > 0;
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

  visboViewAllDeadlinePie(change: boolean): void {
    // if (!this.filteredDeadline || this.filteredDeadline.length == 0) return;
    this.graphAllOptionsPieChart = {
        title: this.translate.instant('compViewDeadline.titleAllDeadlines'),
        titleTextStyle: {color: 'black', fontSize: '16'},
        tooltip : {
          trigger: 'none'
        },
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphAllPieLegend = [
      ['string', this.translate.instant('compViewDeadline.lbl.status')],
      ['number', this.translate.instant('compViewDeadline.lbl.count')]
    ];

    const finishedDeadlineStatus: any = [];
    const graphData = [];
    let status;
    const refDate = this.vpvActive.timestamp;
    for (let i = 0; i < this.statusList.length; i++) {
      finishedDeadlineStatus[i] = 0;
    }
    let nonEmpty = false;
    for (let i = 0; i < this.filteredDeadline.length; i++) {
      // ur:24.2.2020
      // if (this.filteredDeadline[i].percentDone === 1) {
        // all  entries
        status = this.getStatus(this.filteredDeadline[i]);
        finishedDeadlineStatus[status] += 1;
        nonEmpty = true;
      // }
    }
    for (let i = 0; i < finishedDeadlineStatus.length; i++) {
      graphData.push([this.statusList[i], finishedDeadlineStatus[i]]);
    }

    this.graphBeforeAllDataPieChart = change ? this.graphAllDataPieChart : undefined;
    if (nonEmpty) {
      this.graphAllDataPieChart = graphData;
    } else {
      this.graphAllDataPieChart = [];
    }
  }

  visboViewDeadlineGantt(): void {
    this.graphOptionsDeadlinesGantt = {
        gantt: {
          labelStyle: {
            fontName: 'arial',
            fontSize: 18,
            color: '#F7941E'
          },
          percentEnabled: true,
          percentStyle: {
            fill: '#F7941E'
          },
          trackHeight: 30,
          barHeight: 15
        }
        // colors: this.colors
      };

    let graphData: any;
    graphData = [];
    for (let i = 0; i < this.hierarchyDeadline.length; i++) {
      const deadline = this.hierarchyDeadline[i];
      if (deadline.type === "Phase") {
        const startDate = deadline.startDateVPV ? new Date(deadline.startDateVPV) : new Date();
        const endDate = new Date(deadline.endDatePFV);
        const phase = deadline.phasePFV === '.' ? this.vpvActive.name : deadline.phasePFV;
        const path = this.getFullPath(deadline);
        // filter Gantt Chart by Layer
        if ((path.join(' / ').indexOf(this.filterPath.join(' / ')) == 0   // childs of filter Path
        && path.length <= this.filterPath.length + 1)) {  // in same hierarchy
          graphData.push([
            i.toString(),
            phase,
            // 'Level'.concat(path.length.toString()),
            startDate.getTime(),
            endDate.getTime(),
            0,
            deadline.percentDone * 100,
            null
          ]);
        }
      }
    }
    graphData.reverse();
    graphData.push([
      'Task ID',
      'Task Name',
      // 'Resource',
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

  visboViewDeadlineTimeline(): void {
    this.graphOptionsDeadlinesGantt = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      height: 500,
      timeline: {
        showRowLabels: false,
        showBarLabels: true
      },
      tooltip: {
        isHtml: true
      },
      animation: {startup: true, duration: 200}
      // explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01}
      // colors: this.colors,
      // hAxis: {
      //   format: 'MMM YY',
      //   gridlines: {
      //     color: '#FFF',
      //     count: -1
      //   }
      // }
    };

    let graphData: any;
    graphData = [];
    for (let i = 0; i < this.hierarchyDeadline.length; i++) {
      const deadline = this.hierarchyDeadline[i];
      if (deadline.type === "Phase") {
        const startDate = deadline.startDateVPV ? new Date(deadline.startDateVPV) : new Date();
        const endDate = new Date(deadline.endDatePFV);
        const phase = deadline.phasePFV === '.' ? this.vpvActive.name : deadline.phasePFV;
        const path = this.getFullPath(deadline);
        // filter Gantt Chart by Layer
        if ((path.join(' / ').indexOf(this.filterPath.join(' / ')) == 0   // childs of filter Path
        && path.length <= this.filterPath.length + 1)) {  // in same hierarchy
          graphData.push([
            i.toString(),
            phase,
            this.createCustomHTMLContent(deadline),
            startDate.getTime(),
            endDate.getTime()
          ]);
        }
      }
    }
    graphData.reverse();
    graphData.push([
      'Task ID',
      'Task Name',
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      'Start Date',
      'End Date'
    ]);
    graphData.reverse();
    // calculate the necessary height as it has to be defined fixed, legend + number of lines * height
    this.graphOptionsDeadlinesGantt.height = 30 + graphData.length * 40;
    this.graphDataDeadlinesGantt = graphData;
  }

  createCustomHTMLContent(deadline: VPVDeadline): string {
    const startDate = moment(deadline.startDateVPV).format('DD.MM.YY');
    const endDate = moment(deadline.endDateVPV).format('DD.MM.YY');
    let name = deadline.fullName;
    if (name === '.') {
      name = this.vpvActive.name;
    }
    let result = '<div style="padding:5px 5px 5px 5px">' +
      '<div><b>' + name + '</b></div>' + '<div>' +
      '<table>';

    const start = this.translate.instant('compViewDeadline.lbl.startDateVPV');
    const end = this.translate.instant('compViewDeadline.lbl.endDateVPV');
    const percentDone = this.translate.instant('compViewDeadline.lbl.percentDone');
    const trafficlight = this.translate.instant('compViewDeadline.lbl.trafficlight');
    const trafficlightDesc = this.translate.instant('compViewDeadline.lbl.trafficlightDesc');

    result = result + '<tr>' + '<td width="70%">' + start + ':</td>' + '<td><b>' + startDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td width="70%">' + end + ':</td>' + '<td><b>' + endDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td width="70%">' + percentDone + ':</td>' + '<td><b>' + Math.round(deadline.percentDone * 100) + '%</b></td>' + '</tr>';
    if (deadline.trafficlight) {
      result = result + '<tr>' + '<td width="70%">' + trafficlight + ':</td>' + '<td><b>' + deadline.trafficlight + '</b></td>' + '</tr>';
    }
    if (deadline.trafficlightDesc) {
      result = result + '<tr>' + '<td>' + trafficlightDesc + ':</td>' + '<td><b>' + deadline.trafficlightDesc + '</b></td>' + '</tr>';
    }
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (row === undefined) {
      this.filterStatus = undefined;
    } else {
      const index = this.statusList.findIndex(element => element === label);
      if (index < 0 || this.filterStatus === index) {
        this.filterStatus = undefined;
      } else {
        this.filterStatus = index;
      }
    }
    this.filterDeadlines(false);
  }

  timelineSelectRow(row: number, col: number, strIndex: string): void {
    this.log(`timeline Select Row ${row} Col ${col} for Index ${strIndex}`);
    var index = parseInt(strIndex);
    if (row >= 0 && row < this.hierarchyDeadline.length) {
      this.filterPath = this.getFullPath(this.hierarchyDeadline[index]);
    }
    this.filterDeadlines(false);
  }

  ganttSelectPath(item: string, index: number): void {
    this.log(`gantt Select Item ${index} ${item} `);
    const path = this.getFullPath(this.hierarchyDeadline[0]);
    if (index >= 0 && index < path.length) {
      this.filterPath = path.slice(0, index + 1);
    }
    this.log(`gantt Select ${item} Full Path ${this.filterPath.join(' / ')}`);
    this.filterDeadlines(false);
  }

  getFullName(deadline: VPVDeadline): string {
    let result: string;
    if (deadline.fullName) {
       result = deadline.fullName;
    }
    if (this.refType === 'vpv' || this.refType === undefined) {
      if (deadline.fullPathVPV && deadline.fullPathVPV.length > 1) {
        result = deadline.fullPathVPV.slice(1).join(' / ');
      } else if (!deadline.fullPathVPV) {
          if (deadline.fullPathPFV && deadline.fullPathPFV.length > 1) {
            result = deadline.fullPathPFV.slice(1).join(' / ');
          }
      } else { // Root phase
        result = this.vpvActive.name;
      }
      return result;
    }
    if (this.refType === 'pfv') {
      if (deadline.fullPathPFV && deadline.fullPathPFV.length > 1) {
        result = deadline.fullPathPFV.slice(1).join(' / ');
      } else { // Root phase
        result = this.vpvActive.name;
      }
      return result;
    }
  }

  getFullPath(deadline: VPVDeadline): string[] {
    if (!deadline) return undefined;
    return this.refType === 'pfv' ? (deadline.fullPathPFV || deadline.fullPathVPV) : deadline.fullPathVPV;
  }

  getBreadCrumb(): string[] {
    var path = this.getFullPath(this.hierarchyDeadline[0]);
    var result = path.slice(0, path.length - 1);
    if (result.length >= 0) {
      result[0] = this.vpvActive.name;
    }
    return result;
  }

  showBreadCrumb(): boolean {
    return this.getFullPath(this.hierarchyDeadline[0]).length > 1;
  }

  inFuture(ref: string): boolean {
    return (ref > this.vpvActive.timestamp.toString());
  }

  getShortText(text: string, len: number, position?: string): string {
    return visboGetShortText(text, len, position);
  }

  switchView(): void {
    this.log(`Switchinig to ${this.type}`);
    this.refType = this.listType.find( item => item.name === this.type ).ref;
    this.visboDeadlineCalc();
  }

  toggleGantt(): void {
    this.viewGantt = !this.viewGantt;
    this.buttonGantt = this.viewGantt ? this.translate.instant('compViewDelivery.btn.buttonGanttOff')
                                      : this.buttonGantt = this.translate.instant('compViewDelivery.btn.buttonGanttOn');
  }

  hasDeadlines(): boolean {
    let result = false;
    if (this.vpvActive
    && this.allDeadline && this.allDeadline.length > 0) {
      result = true;
    }
    return result;
  }

  displaySwitch(): boolean {
    let result = false;
    if (this.switchType
    && this.hasVPPerm(this.permVP.View)) {
      result = true;
    }
    return result;
  }

  gotoVPRestrict(index: number): void {
    const path = this.getFullPath(this.filteredDeadline[index]);
    const nameID = this.filteredDeadline[index].nameID;
    sessionStorage.setItem('restrict', JSON.stringify({id: nameID, path: path}));

    this.log(`goto VP Restrict: ${this.vpvActive.vpid} ID ${nameID} Path ${path.join(' / ')}`);
    this.router.navigate(['vpRestrict/'.concat(this.vpvActive.vpid)], { queryParams: { id: nameID }});
  }

  sortDeadlineTable(n?: number) {
    if (!this.filteredDeadline) {
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
    if (this.sortColumnDeadline === 2) {
      if (this.refType === 'pfv') {
        this.filteredDeadline.sort(function(a, b) { return visboCmpString(a.fullPathPFV.join(' / '), b.fullPathPFV.join(' / ')); });
      } else {
        this.filteredDeadline.sort(function(a, b) { return visboCmpString(a.fullPathVPV.join(' / '), b.fullPathVPV.join(' / ')); });
      }
    } else if (this.sortColumnDeadline === 3) {
      this.filteredDeadline.sort(function(a, b) {
        return visboCmpString(a.type.toLowerCase(), b.type.toLowerCase());
      });
    } else if (this.sortColumnDeadline === 4) {
      this.filteredDeadline.sort(function(a, b) { return visboCmpDate(a.endDateVPV, b.endDateVPV); });
    } else if (this.sortColumnDeadline === 5) {
      this.filteredDeadline.sort(function(a, b) { return a.changeDays - b.changeDays; });
    } else if (this.sortColumnDeadline === 6) {
      this.filteredDeadline.sort(function(a, b) { return a.percentDone - b.percentDone; });
    } else if (this.sortColumnDeadline === 7) {
      this.filteredDeadline.sort(function(a, b) { return visboCmpDate(a.endDatePFV, b.endDatePFV); });
    }
    if (!this.sortAscendingDeadline) {
      this.filteredDeadline.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompViewDeadline: ' + message);
  }

}
