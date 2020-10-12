import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboAudit, QueryAuditType } from '../_models/visboaudit';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboAuditService } from '../_services/visboaudit.service';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

function encodeCSV(source: string): string {
  let result: string;
  if (!source) {
    return source;
  }
  result = source.replace(/\t/g, ' ');
  if (result[0] === '='  || result[0] === '+'  || result[0] === '-' ) {
      result = "'".concat(result);
  }
  return result;
}

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
    graphDataColumnChart = [];
    graphOptionsColumnChart = {
      'title': 'Audit Activity by User',
      'isStacked': true,
      'hAxis': {'direction': -1, 'slantedText': true, 'slantedTextAngle': 45 }
    };

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
            this.groupgraphDataLineChart();
            this.groupgraphDataColumnChart();
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
      let data: string;
      const separator = '\t';
      data = 'sep=' + separator + '\n';  // to force excel to use the separator
      data = data + 'date' + separator
            + 'time UTC' + separator
            + 'email' + separator
            + 'actionDescription' + separator
            + 'action' + separator
            + 'url' + separator
            + 'actionInfo' + separator
            + 'responseTime' + separator
            + 'responseStatus' + separator
            + 'vcid' + separator
            + 'vcname' + separator
            + 'vpid' + separator
            + 'vpname' + separator
            + 'vpvid' + separator
            + 'size' + separator
            + 'ip' + separator
            + 'userId' + separator
            + 'userAgent' + separator
            + 'ttl' + separator
            + 'VC Details' + separator
            + 'VP Details' + '\n';
      for (let i = 0; i < this.audit.length; i++) {
        const createdAt = new Date(this.audit[i].createdAt).toISOString();
        const userAgent = (this.audit[i].userAgent || '').replace(/,/g, ';');
        const lineItem = createdAt.substr(0, 10) + separator
                    + createdAt.substr(11, 12) + separator
                    + encodeCSV(this.audit[i].user.email ) + separator
                    + encodeCSV(this.audit[i].actionDescription) + separator
                    + this.audit[i].action + separator
                    + this.audit[i].url + separator
                    + this.audit[i].actionInfo + separator
                    + (this.audit[i].result ? this.audit[i].result.time : '') + separator
                    + (this.audit[i].result ? this.audit[i].result.status : '') + separator
                    + (this.audit[i].vc ? this.audit[i].vc.vcid : '') + separator
                    + (this.audit[i].vc ? encodeCSV(this.audit[i].vc.name) : '') + separator
                    + (this.audit[i].vp ? this.audit[i].vp.vpid : '') + separator
                    + (this.audit[i].vp ? encodeCSV(this.audit[i].vp.name) : '') + separator
                    + (this.audit[i].vpv ? this.audit[i].vpv.vpvid : '') + separator
                    + (this.audit[i].result ? this.audit[i].result.size : '0') + separator
                    + this.audit[i].ip + separator
                    + this.audit[i].user.userId + separator
                    + encodeCSV(userAgent) + separator
                    + (this.audit[i].ttl || '') + separator
                    + (this.audit[i].vc ? (encodeCSV(this.audit[i].vc.vcjson) || '') : '') + separator
                    + (this.audit[i].vp ? (encodeCSV(this.audit[i].vp.vpjson) || '') : '') + '\n';
        data = data.concat(lineItem);
      }
      this.log(`sysAudit CSV Len ${data.length} `);
      const blob = new Blob([data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.download = 'auditlog.csv';
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

    groupgraphDataLineChart(): void {
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

    groupgraphDataColumnChart(): void {
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
        return firstSum - secondSum;
      });
      graphData.push(['User', 'VC', 'VP', 'VPV', 'System', 'User', 'Other', { role: 'annotation' } ]);
      graphData.reverse();
      this.log(`Group Graph Column Chart Element ${JSON.stringify(graphData[0])}`);
      this.log(`Group Graph Column Chart Element ${JSON.stringify(graphData[1])}`);

      this.graphDataColumnChart = graphData;
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
