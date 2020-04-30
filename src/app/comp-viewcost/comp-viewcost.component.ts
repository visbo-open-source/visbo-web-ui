import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVCost } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

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

  parentThis: any;

  colors: string[] = ['#F7941E', '#BDBDBD', '#458CCB'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star' }
  };

  graphDataComboChart: any[] = [];
  graphOptionsComboChart: any = undefined;
  currentLang: string;

  permVC: any = VGPVC;
  permVP: any = VGPVP;

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
    this.currentVpvId = this.vpvActive._id;
    this.visboCostCalc();
  }

  ngOnChanges(changes: SimpleChanges) {
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
    this.graphOptionsComboChart = {
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
        }
      };
    this.graphOptionsComboChart.title = this.translate.instant('keyMetrics.chart.titleCostOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisCostOverTime');
    const graphDataCost: any = [];
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
          Math.trunc(cost[i].baseLineCost || 0),
          Math.trunc(cost[i].currentCost || 0),
          0]);
      } else {
        graphDataCost.push([
          new Date(cost[i].currentDate),
          Math.trunc(cost[i].baseLineCost || 0),
          0,
          Math.trunc(cost[i].currentCost || 0)]);
      }
      this.vpvTotalCostBaseLine += cost[i].baseLineCost || 0;
      this.vpvTotalCostCurrent += cost[i].currentCost || 0;
    }
    if (graphDataCost.length === 0) {
      this.log(`ViewCostOverTime Result empty`);
      graphDataCost.push([new Date(), 0, 0, 0]);
    }
    graphDataCost.sort(function(a, b) { return a[0].getTime() - b[0].getTime(); });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCost.length;
    this.log(`visboKeyMetrics len ${len} ${JSON.stringify(graphDataCost[len - 1])}`);
    if (len === 1) {
      graphDataCost.push([
        new Date(),
        graphDataCost[len - 1][1],
        graphDataCost[len - 1][2],
        graphDataCost[len - 1][3]
      ]);
    }

    graphDataCost.push([
      'Timestamp',
      this.translate.instant('keyMetrics.baselinePV'),
      this.translate.instant('keyMetrics.planAC'),
      this.translate.instant('keyMetrics.planETC')
    ]);
    graphDataCost.reverse();
    // this.log(`view Cost VP cost budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCost;
  }

  displayCost(): boolean {
    let result = false;
    if (this.vpvActive                                // the vpv is already available
    && this.hasVPPerm(this.permVP.ViewAudit)          // user has audit permission
    && this.vpvCost && this.vpvCost.length > 0) {     // vpv contains cost data
      result = true;
    }
    return result;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewCost: ' + message);
  }

}
