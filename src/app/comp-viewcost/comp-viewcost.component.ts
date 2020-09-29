import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVCost } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import * as moment from 'moment';
import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewcost',
  templateUrl: './comp-viewcost.component.html'
})
export class VisboCompViewCostComponent implements OnInit, OnChanges {

  @Input() vpvActive: VisboProjectVersion;
  @Input() combinedPerm: VGPermission;

  currentVpvId: string;
  vpvCost: VPVCost[];
  vpvActualDataUntil: Date;

  vpvTotalCostBaseLine: number;
  vpvTotalCostCurrent: number;

  parentThis = this;

  colors = ['#F7941E', '#BDBDBD', '#458CCB'];

  graphDataComboChart = [];
  graphOptionsComboChart = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      title: 'Monthly Cost comparison: plan-to-date vs. baseline',
      animation: {startup: true, duration: 200},
      legend: {position: 'top'},
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      // curveType: 'function',
      colors: this.colors,
      seriesType: 'bars',
      series: {0: {type: 'line', lineWidth: 4, pointSize: 0}},
      isStacked: true,
      tooltip: {
        isHtml: true
      },
      vAxis: {
        title: 'Monthly Cost',
        format: "# T\u20AC",
        minorGridlines: {count: 0, color: 'none'}
      },
      hAxis: {
        format: 'MMM YY',
        gridlines: {
          color: '#FFF',
          count: -1
        }
      },
      minorGridlines: {count: 0, color: 'none'}
    };
  currentLang: string;

  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    moment.locale(this.currentLang);
    this.visboCostCalc();
  }

  ngOnChanges(): void {
    this.log(`Cost Changes  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    if (this.currentVpvId !== undefined && this.vpvActive._id !== this.currentVpvId) {
      this.visboCostCalc();
    }
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  visboCostCalc(): void {
    if (!this.vpvActive) {
      return;
    }
    this.currentVpvId = this.vpvActive._id;

    this.log(`Cost Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getCost(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].cost.length} cost entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].cost) {
            this.log(`get VPV Calc: Reset Cost to empty `);
            // this.vpvCost[visboprojectversions[0]._id] = [];
            this.vpvCost = [];
          } else {
            this.log(`Store Cost for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].cost.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.vpvCost = visboprojectversions[0].cost;
            this.vpvActualDataUntil = new Date(visboprojectversions[0].actualDataUntil);
          }
          this.visboViewCostOverTime();
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpViewCost.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  visboViewCostOverTime(): void {
    this.graphOptionsComboChart.title = this.translate.instant('keyMetrics.chart.titleCostOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisCostOverTime');
    const graphDataCost = [];
    if (!this.vpvCost) {
      return;
    }

    const cost = this.vpvCost;
    const actualDataUntilTime = this.vpvActualDataUntil.getTime();

    this.log(`ViewCostOverTime Actual Until ${this.vpvActualDataUntil}`);

    if (cost.length === 0) {
      return;
    }

    this.vpvTotalCostBaseLine = 0;
    this.vpvTotalCostCurrent = 0;

    for (let i = 0; i < cost.length; i++) {
      const currentDate = new Date(cost[i].currentDate);
      // this.log(`ViewCostOverTime Push  ${cost[i].currentDate}`);
      if (currentDate.getTime() < actualDataUntilTime) {
        graphDataCost.push([
          new Date(cost[i].currentDate),
          Math.round(cost[i].baseLineCost * 10) / 10 || 0,
          this.createCustomHTMLContent(cost[i], true),
          Math.round(cost[i].currentCost * 10) / 10  || 0,
          this.createCustomHTMLContent(cost[i], true),
          0,
          ''
        ]);
      } else {
        graphDataCost.push([
          new Date(cost[i].currentDate),
          Math.round(cost[i].baseLineCost * 10) / 10 || 0,
          this.createCustomHTMLContent(cost[i], false),
          0,
          '',
          Math.round(cost[i].currentCost * 10) / 10  || 0,
          this.createCustomHTMLContent(cost[i], false)
        ]);
      }
      this.vpvTotalCostBaseLine += cost[i].baseLineCost || 0;
      this.vpvTotalCostCurrent += cost[i].currentCost || 0;
    }
    if (graphDataCost.length === 0) {
      this.log(`ViewCostOverTime Result empty`);
      graphDataCost.push([new Date(), 0, '', 0, 0]);
    }
    // graphDataCost.sort(function(a, b) { return a[0].getTime() - b[0].getTime(); });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCost.length;
    // this.log(`ViewCostOverTime len ${len} ${JSON.stringify(graphDataCost[len - 1])}`);
    if (len < 1 ) {
      this.log(`ViewCostOverTime Empty`);
    }
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      let currentDate = new Date(graphDataCost[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      graphDataCost.push([
        currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined
      ]);
    }
    // header will be written in the array at the beginning
    graphDataCost.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.baselinePV'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.planAC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.planETC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    // graphDataCost.reverse();
    // this.log(`view Cost VP cost budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCost;
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
  }

  createCustomHTMLContent(cost: VPVCost, actualData: boolean): string {
    const currentDate = moment(cost.currentDate).format('MMM YYYY');
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + currentDate + '</b></div>' + '<div>' +
      '<table>';

    const baselinePV = this.translate.instant('keyMetrics.baselinePV');
    const planAC = this.translate.instant('keyMetrics.planAC');
    const planETC = this.translate.instant('keyMetrics.planETC');

    result = result + '<tr>' + '<td>' + baselinePV + ':</td>'
                    + '<td align="right"><b>' + Math.round(cost.baseLineCost * 10) / 10 + ' T\u20AC</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + (actualData ? planAC : planETC)
                    + ':</td align="right">' + '<td><b>' + Math.round(cost.currentCost * 10) / 10 + ' T\u20AC</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  displayCost(): boolean {
    let result = false;
    if (this.vpvActive                                // the vpv is already available
    && this.hasVPPerm(this.permVP.ViewAudit)          // user has audit permission
    && this.vpvCost && this.vpvCost.length > 0) {     // vpv contains cost data
      result = true;
    }
    if (this.vpvTotalCostBaseLine === 0 && this.vpvTotalCostCurrent === 0) {
      result = false;
    }
    return result;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewCost: ' + message);
  }

}
