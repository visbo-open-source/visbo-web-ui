import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboAudit, VisboAuditXLS, QueryAuditType } from '../_models/visboaudit';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboAuditService } from '../_services/visboaudit.service';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

import * as XLSX from 'xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

@Component({
  selector: 'app-sysaudit',
  templateUrl: './sysaudit.component.html',
  styleUrls: ['./sysaudit.component.css']
})
export class SysauditComponent implements OnInit {

    audit: VisboAudit[];
    auditIndex: number;
    auditFrom: Date;
    auditTo: Date;
    auditCount: number;
    auditText: string;
    showMore: boolean;
    sortAscending: boolean;
    sortColumn: number;
    today: Date;
    auditType: string;
    auditTypeAction: string;
    auditTypeList = [
      {name: 'All', action: ''},
      {name: 'Read', action: 'GET'},
      {name: 'Create', action: 'POST'},
      {name: 'Update', action: 'PUT'},
      {name: 'Delete', action: 'DELETE'}
    ];
    auditArea: string;
    auditAreaAction: string;
    auditAreaList = [
      {name: 'Overview', action: 'other'},
      {name: 'System', action: 'sys'},
      {name: 'Visbo Center', action: 'vc'},
      {name: 'Visbo Project', action: 'vp'},
      {name: 'All', action: ''}
    ];
    sysVCId = '';
    chart = false;
    parentThis = this;
    divBarChart1 = "SysAudit_User_div";
    divBarChart2 = "SysAudit_Browser_div";
    chartButton = 'Chart';
    graphData = [];
    graphLegend = [
      ['string', 'Action Type'],
      ['number', 'Count']
    ];
    graphOptions = {
      'title': 'Audit Activity by Action',
      'sliceVisibilityThreshold': .025
    };
    graphDataLineChart = [];
    graphOptionsLineChart = {
      'title': 'Audit Activity by Time',
      // 'width': '1200',
      'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
      'vAxis': {
        'title': 'Number of Activities',
        'minorGridlines': {'count': 0}
      },
      'hAxis': {
        'format': 'dd.MM.yy',
        'gridlines': {
          'count': -1
        },
        'minorGridlines': {'count': 0}
      },
      'pointSize': 6,
      'curveType': 'function',
      'colors': ['blue', 'red', 'green', 'yellow']
    };
    graphDataUserChart = [];
    graphOptionsUserChart = {
      'title': 'Audit Activity by User',
      'isStacked': true,
      'height': 500,
      'legend': { 'position': 'top', 'maxLines': 3 },
      'hAxis': {'direction': 1}
    };
    graphDataBrowserChart = [];
    graphOptionsBrowserChart = {
      'title': 'Audit Activity by User Agent',
      'isStacked': true,
      'height': 500,
      'legend': { 'position': 'top', 'maxLines': 3 },
      'hAxis': {'direction': 1 }
    };
    listOS = ['Windows', 'Macintosh', 'iPhone', 'iPad', 'Android', 'Linux', 'Unknown']

    constructor(
      private visboauditService: VisboAuditService,
      private visbocenterService: VisboCenterService,
      private messageService: MessageService,
      private alertService: AlertService,
      private route: ActivatedRoute,
      private router: Router
    ) { }

    ngOnInit(): void {
      // this.log(`Audit init Dates ${this.auditFrom} to ${this.auditTo}`);
      this.auditCount = 50;
      this.auditType = this.auditTypeList[0].name;
      this.auditArea = this.auditAreaList[0].name;
      this.today = new Date();
      this.today.setHours(0, 0, 0, 0);
      this.sysVCId = this.visbocenterService.getSysVCId();
      this.getVisboAudits();
    }

    // onSelect(visboaudit: VisboAudit): void {
    //   this.getVisboAudits();
    // }

    getVisboAudits(): void {
      const queryAudit = new QueryAuditType;

      // set date values if not set or adopt to end of day in case of to date
      if (this.auditTo) {
        queryAudit.to = new Date(this.auditTo);
      } else {
        queryAudit.to = new Date();
      }
      if (this.auditFrom) {
        queryAudit.from = new Date(this.auditFrom);
      }
      if (this.auditText) {
        queryAudit.text = this.auditText.trim();
      }
      for (let i = 0; i < this.auditTypeList.length; i++) {
        if (this.auditType === this.auditTypeList[i].name) {
          queryAudit.actionType = this.auditTypeList[i].action;
          break;
        }
      }
      for (let i = 0; i < this.auditAreaList.length; i++) {
        if (this.auditArea === this.auditAreaList[i].name) {
          queryAudit.area = this.auditAreaList[i].action;
          break;
        }
      }
      queryAudit.maxcount = this.auditCount;

      // this.log(`Audit getSystemAudits recalc Query ${JSON.stringify(queryAudit)}`);
      this.visboauditService.getVisboAudits(true, queryAudit)
        .subscribe(
          audit => {
            this.audit = audit;
            this.alertService.success('Successfully accessed Audit', true);
            this.sortTable(undefined);
            this.groupGraphData();
            this.groupgraphDataActivityChart();
            this.groupgraphDataUserChart();
            this.groupgraphDataBrowserChart();
          },
          error => {
            this.log(`get Audit failed: error: ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        );
    }

    gotoDetail(visboaudit: VisboAudit): void {
      // this.log(`navigate to Audit Detail ${visboaudit._id}`);
      this.router.navigate(['sysaudit/' + visboaudit._id]);
    }

    downloadVisboAudit(): void {
      this.log(`sysAudit Download ${this.audit.length} Items`);
      const audit: VisboAuditXLS[] = []
      this.audit.forEach(element => {
        const auditElement = new VisboAuditXLS();
        auditElement.createdAt = new Date(element.createdAt);
        auditElement.email = element.user?.email;
        auditElement.vcName = element.vc?.name;
        auditElement.vcid = element.vc?.vcid;
        auditElement.vpName = element.vp?.name;
        auditElement.vpid = element.vp?.vpid;
        auditElement.vpvid = element.vpv?.vpvid;
        auditElement.action = element.action;
        auditElement.actionDescription = element.actionDescription;
        auditElement.actionInfo = element.actionInfo;
        auditElement.url = element.url;
        auditElement.action = element.action;
        auditElement.ip = element.ip;
        auditElement.host = element.host;
        if (element.ttl) { auditElement.ttl = new Date(element.ttl); }
        auditElement.sysAdmin = element.sysAdmin;
        auditElement.userAgent = element.userAgent;
        auditElement.resultTime = element.result?.time;
        auditElement.resultStatus = element.result?.status;
        auditElement.resultStatusText = element.result?.statusText;
        auditElement.resultSize = element.result?.size;
        auditElement.vcjson = element.vc?.vcjson;
        auditElement.vpjson = element.vp?.vpjson;

        audit.push(auditElement);
      });

      // export to Excel
      const len = audit.length;
      const width = Object.keys(audit[0]).length;
      const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
      const timestamp = new Date();
      const month = (timestamp.getMonth() + 1).toString();
      const day = timestamp.getDate().toString();
      const strTimestamp = '' + timestamp.getFullYear() + '-' +  month.padStart(2, "0") + '-' +  day.padStart(2, "0");
      const name = 'SysAudit_' + strTimestamp;

      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(audit, {header:['createdAt', 'email', 'vcName', 'vpName', 'actionDescription', 'actionInfo', 'resultTime', 'resultSize', 'resultStatus', 'resultStatusText' ]});
      worksheet['!autofilter'] = { ref: matrix };
      // eslint-disable-next-line
      const sheets: any = {};
      sheets[name] = worksheet;
      const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [name] };
      // eslint-disable-next-line
      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.download = name.concat(EXCEL_EXTENSION);
      this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
      a.click();
      window.URL.revokeObjectURL(url);

    }

    switchChart(): void {
      this.chart = !this.chart;
      this.chartButton = this.chart ? 'List' : 'Chart';
      // this.log(`Switch Chart to ${this.chart} Graph ${JSON.stringify(this.graphData)}`);
    }

    groupGraphData(): void {
      const graphSum = [];
      const graphData = [];
      for (const auditElement in this.audit) {
        // this.log(`Group Graph Chart Element ${JSON.stringify(this.audit[auditElement])}`);
        if (this.audit[auditElement].actionDescription) {
          graphSum[this.audit[auditElement].actionDescription] = (graphSum[this.audit[auditElement].actionDescription] || 0) + 1;
          // this.log(`Group Graph Chart Element ${graphSum[this.audit[auditElement].action]} ${this.audit[auditElement].action}`);
        }
      }
      for (const graphElement in graphSum) {
        // this.log(`Group Graph Sum Chart Element ${graphElement}: ${JSON.stringify(graphSum[graphElement])}`);
        graphData.push([graphElement, graphSum[graphElement]]);
      }
      graphData.sort(function(a, b) {
        let result = 0;
        if (a[1] > b[1]) {
          result = -1;
        } else if (a[1] < b[1]) {
          result = 1;
        }
        return result;
      });
      this.graphData = graphData;
      // this.log(`Group Graph Sum Chart Updated`);
    }

    groupgraphDataActivityChart(): void {
      const graphSum = [];
      const graphData = [];
      for (const auditElement in this.audit) {
        if (this.audit[auditElement].createdAt) {
          const activityDay = new Date(this.audit[auditElement].createdAt);
          activityDay.setHours(0, 0, 0, 0);
          const activityIndex = Math.trunc(activityDay.getTime() / 1000 / 60 / 60 / 24);
          // this.log(`Group Graph Time Chart Element ${activityIndex} ${activityDay}`);
          if (graphSum[activityIndex] === undefined) {
            graphSum[activityIndex] = [new Date(activityDay), 0, 0, 0, 0];
          }
          graphSum[activityIndex][1] = graphSum[activityIndex][1] + 1;
          if (this.audit[auditElement].vpv) {
            graphSum[activityIndex][4] = graphSum[activityIndex][4] + 1;
          } else if (this.audit[auditElement].vp) {
            graphSum[activityIndex][3] = graphSum[activityIndex][3] + 1;
          } else if (this.audit[auditElement].vc && this.audit[auditElement].vc.vcid.toString() !== this.sysVCId) {
            graphSum[activityIndex][2] = graphSum[activityIndex][2] + 1;
          }
        }
      }
      for (const graphElement in graphSum) {
        // this.log(`Group Graph Sum Chart Element ${graphElement}: ${JSON.stringify(graphSum[graphElement])}`);
        graphData.push(graphSum[graphElement]);
      }
      if (graphData.length === 1) {
        const dayBefore = new Date(graphData[0][0].toISOString());
        dayBefore.setMinutes(dayBefore.getMinutes() - 1);
        graphData.push([dayBefore, 0, 0, 0, 0]);
      }
      graphData.sort(function(a, b) { return b[0] - a[0]; });
      graphData.push(['Date', 'All', 'VC', 'VP', 'VPV']);
      graphData.reverse();
      this.graphOptionsLineChart.hAxis.gridlines.count = graphData.length - 1;
      this.log(`Group Graph Time Chart Gridlines ${graphData.length - 1} `);
      this.graphDataLineChart = graphData;
    }

    groupgraphDataUserChart(): void {
      const graphSum = [];
      const graphData = [];
      for (const auditElement in this.audit) {
        if (this.audit[auditElement].user && this.audit[auditElement].user.email) {
          const userString = this.audit[auditElement].user.email;
          if (graphSum[userString] === undefined) {
            graphSum[userString] = [userString, 0, 0, 0, 0, 0, 0, ''];
          }
          if (this.audit[auditElement].vpv || this.auditGroup(this.audit[auditElement], '/vpv')) {
            graphSum[userString][3] = graphSum[userString][3] + 1;
          } else if (this.audit[auditElement].vp || this.auditGroup(this.audit[auditElement], '/vp')) {
            graphSum[userString][2] = graphSum[userString][2] + 1;
          } else if (this.audit[auditElement].vc && this.audit[auditElement].vc.vcid.toString() !== this.sysVCId
                || this.auditGroup(this.audit[auditElement], '/vc')) {
            graphSum[userString][1] = graphSum[userString][1] + 1;
          } else if ((this.audit[auditElement].vc && this.audit[auditElement].vc.vcid.toString() === this.sysVCId)
                || this.auditGroup(this.audit[auditElement], '/audit')) {
            graphSum[userString][4] = graphSum[userString][4] + 1;
          } else if (this.auditGroup(this.audit[auditElement], '/token')
                || this.auditGroup(this.audit[auditElement], '/user')) {
            graphSum[userString][5] = graphSum[userString][5] + 1;
          } else {
            graphSum[userString][6] = graphSum[userString][6] + 1;
          }

          // this.log(`Group Graph Time Chart Element ${userString}: ${graphSum[userString]}`);
        }
      }
      for (const graphElement in graphSum) {
        graphData.push(graphSum[graphElement]);
      }

      graphData.sort(function(a, b) {
        const firstSum = a[1] + a[2] + a[3] + a[4] + a[5] + a[6];
        const secondSum = b[1] + b[2] + b[3] + b[4] + b[5] + b[6];
        return secondSum - firstSum;
      });
      // restrict to top 10 Users + others
      const maxUsers = 10;
      if (graphData.length > maxUsers) {
        for (var index = graphData.length - 1; index > maxUsers; index--) {
          graphData[maxUsers][1] += graphData[index][1];
          graphData[maxUsers][2] += graphData[index][2];
          graphData[maxUsers][3] += graphData[index][3];
          graphData[maxUsers][4] += graphData[index][4];
          graphData[maxUsers][5] += graphData[index][5];
          graphData[maxUsers][6] += graphData[index][6];
          graphData[maxUsers][0] = 'Others';
          graphData.pop();
        }
      }
      graphData.unshift(['User', 'VC', 'VP', 'VPV', 'System', 'User', 'Other', { role: 'annotation' } ]);
      this.log(`Group Graph Column Chart Element ${JSON.stringify(graphData[0])}`);
      this.log(`Group Graph Column Chart Element ${JSON.stringify(graphData[1])}`);

      this.graphDataUserChart = graphData;
    }

    getUserAgent(userAgent: string): string {
      const searchList = ['VISBO Projectboard', 'VISBO Smartinfo', 'Chrome', 'Firefox', 'Safari', 'Postman']
      let result = 'Unknown';
      userAgent = userAgent || '';
      for (let i = 0; i < searchList.length; i++) {
        if (userAgent.indexOf(searchList[i]) >= 0) {
          result = searchList[i];
          break;
        }
      }
      return result;
    }

    getOSAgent(userAgent: string): number {
      let result = this.listOS.length - 1;
      userAgent = userAgent || '';
      for (let i = 0; i < this.listOS.length; i++) {
        if (userAgent.indexOf(this.listOS[i]) >= 0) {
          result = i;
          break;
        }
      }
      // if (result == this.listOS.length - 1) {
      //   this.log(`Operating System Unknown ${userAgent}`)
      // }
      return result;
    }

    groupgraphDataBrowserChart(): void {
      const graphSum = [];
      const graphData = [];
      for (const auditElement in this.audit) {
        const userAgent = (this.audit[auditElement].userAgent);
        const browserString = this.getUserAgent(userAgent);
        const osIndex = this.getOSAgent(userAgent);
        if (graphSum[browserString] === undefined) {
          // browserString: ProjectBoard, SmartInfo, Chrome, Firefox, Safari, Postman, Unknown
          // operatingSystem: Mac, Windows, iOS, Android, Unknown
          graphSum[browserString] = [browserString, 0, 0, 0, 0, 0, 0, 0, ''];
        }
        graphSum[browserString][osIndex + 1] += 1;
      }
      for (const graphElement in graphSum) {
        graphData.push(graphSum[graphElement]);
      }

      graphData.sort(function(a, b) {
        const firstSum = a[1] + a[2] + a[3] + a[4] + a[5] + a[6] + a[7];
        const secondSum = b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + b[7];
        return secondSum - firstSum;
      });
      // restrict to top 10 User Agents + others
      const maxAgents = 10;
      if (graphData.length > maxAgents) {
        for (var index = graphData.length - 1; index > maxAgents; index--) {
          graphData[maxAgents][1] += graphData[index][1];
          graphData[maxAgents][2] += graphData[index][2];
          graphData[maxAgents][3] += graphData[index][3];
          graphData[maxAgents][4] += graphData[index][4];
          graphData[maxAgents][5] += graphData[index][5];
          graphData[maxAgents][6] += graphData[index][6];
          graphData[maxAgents][7] += graphData[index][7];
          graphData[maxAgents][0] = 'Others';
          graphData.pop();
        }
      }
      graphData.unshift(['UserAgent', this.listOS[0], this.listOS[1], this.listOS[2], this.listOS[3], this.listOS[4], this.listOS[5], this.listOS[6], { role: 'annotation' } ]);
      this.graphDataBrowserChart = graphData;
    }

    auditGroup(audit: VisboAudit, match: string): boolean {
      let result = false;
      if (audit.url.indexOf(match) === 0) {
        result = true;
      }
      return result;
    }

    helperAuditIndex(auditIndex: number): void {
      // this.log(`Remove User Helper: ${userIndex}`);
      this.auditIndex = auditIndex;
    }

    helperFormatActionDescription(auditentry: VisboAudit): string {
      this.log(`AuditDescription  ${auditentry.actionDescription} `);
      if (auditentry.actionDescription === 'GET'
      || auditentry.actionDescription === 'POST'
      || auditentry.actionDescription === 'PUT'
      || auditentry.actionDescription === 'DELETE') {
        let desc = auditentry.actionDescription.concat(' ', auditentry.url);
        if (desc.length > 20) {
          desc = desc.substring(0, 17) + '...';
        }
        return desc;
      }
      return auditentry.actionDescription;
    }

    helperFormatBytes(a: number, b = 2): string {
      if (0 === a) {
        return '0 B';
      }
      const c = 1024, d = b || 2;
      const e = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const f = Math.floor(Math.log(a) / Math.log(c));
      return parseFloat((a / Math.pow(c, f)).toFixed(d)) + ' ' + e[f];
    }

    pageAuditIndex(increment: number): void {
      let newAuditIndex = this.auditIndex + increment;
      if (newAuditIndex < 0) {
        newAuditIndex = 0;
      }
      if (newAuditIndex >= this.audit.length) {
        newAuditIndex = this.audit.length - 1;
      }
      this.auditIndex = newAuditIndex;
    }

    helperResponseText(visboaudit: VisboAudit): string {
      if (visboaudit.result.statusText) {
        return visboaudit.result.statusText;
      }
      const status = visboaudit.result.status;
      if (status === '200') { return 'Success'; }
      if (status === '304') { return 'Success'; }
      if (status === '400') { return 'Bad Request'; }
      if (status === '401') { return 'Not Authenticated'; }
      if (status === '403') { return 'Permission Denied'; }
      if (status === '404') { return 'URL not found'; }
      if (status === '409') { return 'Conflict'; }
      if (status === '423') { return 'Locked'; }
      if (status === '500') { return 'Server Error'; }
      return status.toString();
    }

    helperShortenText(text: string, len: number): string {
      return visboGetShortText(text, len);
    }

    toggleDetail(): void {
      this.log(`Toggle ShowMore`);
      this.showMore = !this.showMore;
    }

    isToday(checkDate: string): boolean {
      // this.log(`Check Date ${checkDate} ${this.today.toISOString()}`);
      return new Date(checkDate) > this.today;
    }

    sortTable(n?:number): void {
      if (!this.audit) {
        return;
      }
      // change sort order otherwise sort same column same direction
      if (n !== undefined) {
        // sort a different column
        if (n !== this.sortColumn) {
          this.sortColumn = n;
          this.sortAscending = undefined;
        } else if (this.sortAscending !== undefined) {
          this.sortAscending = !this.sortAscending;
        }
      } else {
        this.sortColumn = 1;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = (n === 2 || n === 3 || n === 4) ? true : false;
      }
      if (this.sortColumn === 1) {
        this.audit.sort(function(a, b) { return visboCmpDate(a.createdAt, b.createdAt); });
    } else if (this.sortColumn === 2) {
        this.audit.sort(function(a, b) { return visboCmpString(a.user.email.toLowerCase(), b.user.email.toLowerCase()); });
      } else if (this.sortColumn === 3) {
        this.audit.sort(function(a, b) { return visboCmpString(a.actionDescription, b.actionDescription); });
      } else if (this.sortColumn === 4) {
        this.audit.sort(function(a, b) { return visboCmpString(a.url, b.url); });
      } else if (this.sortColumn === 5) {
        this.audit.sort(function(a, b) { return visboCmpString(a.result.status, b.result.status); });
      } else if (this.sortColumn === 6) {
        this.audit.sort(function(a, b) { return a.result.time - b.result.time; });
      } else if (this.sortColumn === 7) {
        this.audit.sort(function(a, b) { return (a.result.size || 0) - (b.result.size || 0); });
      }
      if (!this.sortAscending) {
        this.audit.reverse();
      }
    }

    /** Log a message with the MessageService */
    private log(message: string) {
      this.messageService.add('Sys Audit: ' + message);
    }
  }
