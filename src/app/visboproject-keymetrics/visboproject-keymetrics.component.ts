import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-visboproject-keymetrics',
  templateUrl: './visboproject-keymetrics.component.html'
})
export class VisboProjectKeyMetricsComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];

  vpSelected: string;
  vpActive: VisboProject;
  deleted: boolean = false;
  vpvKeyMetricActive: VPVKeyMetricsCalc;
  qualityCost: number;
  qualityTotalCost: number;
  qualityDeadlines: number;
  qualityDelivery: number;
  delayActualDeadlines: number;
  delayTotalDeadlines: number;
  delayActualDelivery: number;
  delayTotalDelivery: number;
  delayEndDate: number;

  chartButton: string = "View List";
  chart: boolean = true;
  history: boolean = false;
  historyButton: string = "View Trend"
  parentThis: any;

  typeMetricList: any[] = [
    {name: "Total & Actual Cost", metric: "Costs"},
    {name: "Delivery Completion", metric: "Deliveries"},
    {name: "Reached Deadlines", metric: "Deadlines"}
  ];
  typeMetric: string = this.typeMetricList[0].name;
  typeMetricChart: string = this.typeMetricList[0].metric;

  // colors: string[] = ['#FF9900', '#FF9900', '#3399cc', '#FA8258'];
  colors: string[] = ['#F7941E', '#F7941E', '#458CCB', '#458CCB', '#996600', '#996600'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star', lineDashStyle: [4, 8, 8, 4] },
    '1': { lineWidth: 4, pointShape: 'star' },
    '2': { lineWidth: 4, pointShape: 'triangle', lineDashStyle: [8, 4, 4, 8] },
    '3': { lineWidth: 4, pointShape: 'triangle' },
    '4': { lineWidth: 1, pointShape: 'circle', pointSize: 4 },
    '5': { lineWidth: 1, pointShape: 'circle', lineDashStyle: [8, 4, 4, 8], pointSize: 4  }
  };

  graphDataLineChart: any[] = [];
  graphOptionsLineChart: any = undefined;

  sortAscending: boolean = false;
  sortColumn: number = 1;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboProjectVersions();
  }

  onSelect(visboprojectversion: VisboProjectVersion): void {
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm == undefined) return false
    return (this.combinedPerm.vp & perm) > 0
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var i: number;
    this.vpSelected = id;
    this.parentThis = this;
    var chartFlag = this.chart;

    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, "", true)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  // this.sortVPVTable(undefined);
                  this.log(`get VPV Key metrics: Get ${visboprojectversions.length} Project Versions`);

                  this.visboKeyMetricsCalc();
                  if (this.hasVPPerm(this.permVP.ViewAudit)) {
                    this.chart = chartFlag;
                  } else {
                    this.chart = false;
                  }
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status == 403) {
                    this.alertService.error(`Permission Denied for Visbo Project Versions`);
                  } else {
                    this.alertService.error(error.error.message);
                  }
                }
              );
          },
          error => {
            this.log(`get VPV VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status == 403) {
              this.alertService.error(`Permission Denied for Visbo Project`);
            } else {
              this.alertService.error(error.error.message);
            }
        });
    } else {
      this.vpSelected = null;
      this.vpActive = null;
      this.visboprojectversionService.getVisboProjectVersions(id, false, "", true)
        .subscribe(
          visboprojectversions => {
            this.visboprojectversions = visboprojectversions;
            this.log(`get VPF Key metrics: Get ${visboprojectversions.length} Project Versions`);
            this.visboKeyMetricsCalc();
            if (this.hasVPPerm(this.permVP.ViewAudit)) {
              this.chart = chartFlag;
            } else {
              this.chart = false;
            }
          },
          error => {
            this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status == 403) {
              this.alertService.error(`Permission Denied for Visbo Project Versions`);
            } else {
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.visbokeymetrics = [];

    if (!this.visboprojectversions) return;
    this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (this.visboprojectversions[i].keyMetrics) {
        var elementKeyMetric: VPVKeyMetricsCalc = new VPVKeyMetricsCalc();
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.variantName = this.visboprojectversions[i].variantName;
        elementKeyMetric.Risiko = this.visboprojectversions[i].Risiko;
        elementKeyMetric.StrategicFit = this.visboprojectversions[i].StrategicFit;
        elementKeyMetric.leadPerson = this.visboprojectversions[i].leadPerson;
        elementKeyMetric.status = this.visboprojectversions[i].status;
        elementKeyMetric.ampelStatus = this.visboprojectversions[i].ampelStatus;
        elementKeyMetric.ampelErlaeuterung = this.visboprojectversions[i].ampelErlaeuterung;
        elementKeyMetric.VorlagenName = this.visboprojectversions[i].VorlagenName;
        elementKeyMetric.complexity = this.visboprojectversions[i].complexity;
        elementKeyMetric.description = this.visboprojectversions[i].description;
        elementKeyMetric.businessUnit = this.visboprojectversions[i].businessUnit;

        elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;
        // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
        elementKeyMetric.savingCostTotal = Math.round((1 - (elementKeyMetric.keyMetrics.costCurrentTotal || 0) / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
        if (elementKeyMetric.savingCostTotal > 100) elementKeyMetric.savingCostTotal = 100;
        if (elementKeyMetric.savingCostTotal < -100) elementKeyMetric.savingCostTotal = -100;
        elementKeyMetric.savingCostTotal = Math.round(elementKeyMetric.savingCostTotal);
        elementKeyMetric.savingCostActual = ((1 - (elementKeyMetric.keyMetrics.costCurrentActual || 0) / (elementKeyMetric.keyMetrics.costBaseLastActual || 1)) * 100) || 0;

        // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
        elementKeyMetric.savingEndDate = this.helperDateDiff(
          (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()),
          (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()), 'w') || 0;
          elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate);

        // Calculate the Delivery Completion
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal) {
          elementKeyMetric.deliveryCompletionTotal = 100;
        } else {
          elementKeyMetric.deliveryCompletionTotal = Math.round((elementKeyMetric.keyMetrics.deliverableCompletionCurrentTotal || 0) / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal * 100)
        }
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual) {
          elementKeyMetric.deliveryCompletionActual = 100;
        } else {
          elementKeyMetric.deliveryCompletionActual = Math.round((elementKeyMetric.keyMetrics.deliverableCompletionCurrentActual || 0) / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual * 100)
        }

        // Calculate the Deadline Completion
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal) {
          elementKeyMetric.timeCompletionTotal = 100;
        } else {
          elementKeyMetric.timeCompletionTotal = Math.round((elementKeyMetric.keyMetrics.timeCompletionCurrentTotal || 0) / elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal * 100)
        }
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastActual) {
          elementKeyMetric.timeCompletionActual = 100;
        } else {
          elementKeyMetric.timeCompletionActual = Math.round((elementKeyMetric.keyMetrics.timeCompletionCurrentActual || 0) / elementKeyMetric.keyMetrics.timeCompletionBaseLastActual * 100)
        }

        this.visbokeymetrics.push(elementKeyMetric)
      }
    }
    this.log(`calc keyMetrics Result LEN ${this.visbokeymetrics.length}`);
    this.sortKeyMetricsTable(undefined);
    // select latest element
    this.setVpvActive(this.visbokeymetrics[0]);
    this.visboKeyMetricsCostOverTime();
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    var localA = new Date(dateA);
    var localB = new Date(dateB);
    localA.setHours(0,0,0,0);
    localB.setHours(0,0,0,0);
    // return false;
    return localA.getTime() == localB.getTime();
  }

  visboKeyMetricsCostOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        title:'Actual & Total Cost: Plan vs. Base Line',
        animation: {startup: true, duration: 200},
        legend: {position: 'top'},
        explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
        vAxis: {
          title: 'Cost in k\u20AC',
          minorGridlines: {count: 0, color: 'none'}
        },
        hAxis: {
          format: 'MMM YY',
          gridlines: {
            count: -1
          },
          minorGridlines: {count: 0, color: 'none'}
        },
        pointSize: 14,
        curveType: 'function',
        series: this.series,
        colors: this.colors
      };
    var keyMetricsCost: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        // this.visboprojectversions[i].keyMetrics =  new VPVKeyMetrics;
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1 && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i+1].timestamp}`);
        continue;
      }
      // this.log(`visboKeyMetrics Push  ${this.visboprojectversions[i].timestamp}`);
      keyMetricsCost.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastTotal || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastActual || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costCurrentTotal || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costCurrentActual || 0)
      ])
    }
    if (keyMetricsCost.length == 0) {
      this.log(`keyMetricsCost empty`);
      keyMetricsCost.push([new Date(), 0, 0, 0, 0])
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var len = keyMetricsCost.length;
    // this.log(`visboKeyMetrics len ${len} ${JSON.stringify(this.visboprojectversions[len-1])}`);
    if (len == 1) {
      keyMetricsCost.push([
        new Date(),
        keyMetricsCost[len-1][1],
        keyMetricsCost[len-1][2],
        keyMetricsCost[len-1][3],
        keyMetricsCost[len-1][4]
      ])
    }

    keyMetricsCost.push(['Timestamp', 'Total (Base Line)', 'Actual (Base Line)', 'Total (Plan)', 'Actual (Plan)']);
    keyMetricsCost.reverse();
    // this.log(`visboKeyMetrics VP cost budget  ${JSON.stringify(keyMetricsCost)}`);
    this.graphDataLineChart = keyMetricsCost;
  }

  visboKeyMetricsDeliveriesOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        title:'Completion of Deliveries: Plan vs. Base Line',
        animation: {startup: true, duration: 200},

        explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
        legend: {position: 'top'},
        vAxes: [
          {
            title: 'Weighted Number of Deliveries completed',
            minorGridlines: {count: 0, color: 'none'}
          },
          {
            title: 'Ahead/Delay in Days',
            minorGridlines: {count: 0, color: 'none'}
          }
        ],
        // vAxis: {
        //   title: 'Weighted Number of Deliveries completed',
        //   minorGridlines: {count: 0, color: 'none'}
        // },
        hAxis: {
          format: 'MMM YY',
          gridlines: {
            count: -1
          },
          minorGridlines: {count: 0, color: 'none'}
        },
        curveType: 'function',
        pointSize: 14,
        series: this.series,
        colors: this.colors
      };
    // assign to second yAxis
    this.graphOptionsLineChart.series[4].targetAxisIndex = 1;
    this.graphOptionsLineChart.series[5].targetAxisIndex = 1;

    var keyMetrics: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1 && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i+1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentActual || 0) * 100)/100,
        this.visboprojectversions[i].keyMetrics.deliverableDelayCurrentActual || 0,
        this.visboprojectversions[i].keyMetrics.deliverableDelayCurrentTotal || 0
      ])
      // this.log(`visboKeyMetrics push ${JSON.stringify(keyMetrics[keyMetrics.length-1])}`);
    }
    if (keyMetrics.length == 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, 0, 0, 0, 0, 0])
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var len = keyMetrics.length;
    // this.log(`visboKeyMetrics duplicate ${len-1} ${JSON.stringify(this.visboprojectversions[len-1])}`);
    if (len == 1) {
      keyMetrics.push([
        new Date(),
        keyMetrics[len-1][1],
        keyMetrics[len-1][2],
        keyMetrics[len-1][3],
        keyMetrics[len-1][4],
        keyMetrics[len-1][5],
        keyMetrics[len-1][6]
      ])
    }
    this.graphOptionsLineChart.vAxes[0].maxValue = this.calcRangeAxis(keyMetrics, 'Delivery')
    this.graphOptionsLineChart.vAxes[0].minValue = -this.graphOptionsLineChart.vAxes[0].maxValue
    this.graphOptionsLineChart.vAxes[1].maxValue = this.calcRangeAxis(keyMetrics, 'Delay');
    this.graphOptionsLineChart.vAxes[1].minValue  = - this.graphOptionsLineChart.vAxes[1].maxValue
    keyMetrics.push(['Timestamp', 'Total (Base Line)', 'Actual (Base Line)', 'Total', 'Actual Completion', 'Ahead/Delay Actual', 'Ahead/Delay Total']);
    keyMetrics.reverse();
    this.log(`visboKeyMetrics VP Delivery Completion  ${JSON.stringify(this.graphOptionsLineChart)}`);
    this.graphDataLineChart = keyMetrics;
  }

  visboKeyMetricsDeadlinesOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        title:'Achievement of Deadlines current & plan',
        animation: {startup: true, duration: 200},

        explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
        legend: {position: 'top'},
        vAxes: [
          {
            title: 'Number of weighted completed Deadlines',
            minorGridlines: {count: 0, color: 'none'}
          },
          {
            title: 'Ahead/Delay in Days',
            minorGridlines: {count: 0, color: 'none'}
          }
        ],
        hAxis: {
          format: 'MMM YY',
          gridlines: {
            count: -1
          },
          minorGridlines: {count: 0, color: 'none'}
        },
        pointSize: 14,
        curveType: 'function',
        series: this.series,
        colors: this.colors
      };
    // assign to second yAxis
    this.graphOptionsLineChart.series[4].targetAxisIndex = 1;
    this.graphOptionsLineChart.series[5].targetAxisIndex = 1;

    var keyMetrics: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1 && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i+1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentActual || 0) * 100)/100,
        this.visboprojectversions[i].keyMetrics.timeDelayCurrentActual || 0,
        this.visboprojectversions[i].keyMetrics.timeDelayCurrentTotal || 0
      ])
    }
    if (keyMetrics.length == 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, 0, 0, 0, 0, 0])
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var len = keyMetrics.length;
    this.log(`visboKeyMetrics duplicate ${len-1} ${JSON.stringify(this.visboprojectversions[len-1])}`);
    if (len == 1) {
      keyMetrics.push([
        new Date(),
        keyMetrics[len-1][1],
        keyMetrics[len-1][2],
        keyMetrics[len-1][3],
        keyMetrics[len-1][4],
        keyMetrics[len-1][5],
        keyMetrics[len-1][6]
      ])
    }
    this.graphOptionsLineChart.vAxes[0].maxValue = this.calcRangeAxis(keyMetrics, 'Deadline')
    this.graphOptionsLineChart.vAxes[0].minValue = -this.graphOptionsLineChart.vAxes[0].maxValue
    this.graphOptionsLineChart.vAxes[1].maxValue = this.calcRangeAxis(keyMetrics, 'Delay');
    this.graphOptionsLineChart.vAxes[1].minValue  = - this.graphOptionsLineChart.vAxes[1].maxValue

    keyMetrics.push(['Timestamp', 'Total (Base Line)', 'Actual (Base Line)', 'Total Date Completion', 'Actual Date Completion', 'Ahead/Delay Actual', 'Ahead/Delay Total']);
    // keyMetrics.push(['Timestamp', 'All Deadlines', 'Past Deadlines']);
    keyMetrics.reverse();
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
  }

  calcRangeAxis(keyMetrics: [], type: string): number {
    var rangeAxis: number = 0;
    var minSize: number = Infinity, maxSize: number = 0;
    var minDelayRange = 50;

    rangeAxis = 0;
    for (var i=0; i < keyMetrics.length; i++) {
      switch (type) {
        case 'Delay':
          rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][5]), Math.abs(keyMetrics[i][6]), minDelayRange);
          break;
        case 'Delivery':
          rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][1]));
          break;
        case 'Deadline':
          rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][1]));
          break;
      }
    }
    rangeAxis *= 1.1;
    this.log(`RangeAxis for ${type}: ${rangeAxis}`);
    return rangeAxis;
  }

  gotoVisboProjectVersions(): void {
    this.log(`goto VPV All Versions ${this.vpvKeyMetricActive.vpid} `);
    this.router.navigate(['vpv/'.concat(this.vpvKeyMetricActive.vpid)], {});
  }

  gotoViewCost(): void {
    this.log(`goto VPV View Cost ${this.vpvKeyMetricActive.vpid} `);
    var queryParams = { vpvid: this.vpvKeyMetricActive._id };
    this.router.navigate(['vpViewCost/'.concat(this.vpvKeyMetricActive.vpid)], { queryParams: queryParams});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion):void {
    this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], {});
  }

  listSelectRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    this.setVpvActive(vpv);
  }

  chartSelectRow(row: number, col: number, label: string) {
    this.log(`Line Chart: User selected ${row} ${col} ${label} Len ${this.visbokeymetrics.length}`);
    if (row < 0 || row >= this.visbokeymetrics.length) row = 0;
    this.setVpvActive(this.visbokeymetrics[row]);
    this.log(`Line Chart: User selected ${row} ${col} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);
  }

  setVpvActive(vpv: VPVKeyMetricsCalc) : void {
    var keyMetrics = vpv.keyMetrics;
    var index: number;
    let level1 = 0.05;
    let level2 = 0.15;
    let delay1 = 7;
    this.vpvKeyMetricActive = vpv;
    this.log(`VPV Active: vpv: ${vpv._id} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);

    index = keyMetrics.costCurrentActual / (keyMetrics.costBaseLastActual || 1)
    if (index < 1 + level1) this.qualityCost = 1
    else if (index < 1 + level2) this.qualityCost = 2
    else this.qualityCost = 3

    index = keyMetrics.costCurrentTotal / (keyMetrics.costBaseLastTotal || 1)
    if (index < 1 + level1) this.qualityTotalCost = 1
    else if (index < 1 + level2) this.qualityTotalCost = 2
    else this.qualityTotalCost = 3

    index = keyMetrics.timeCompletionCurrentActual / (keyMetrics.timeCompletionBaseLastActual || 1)
    if (index > 1 - level1) this.qualityDeadlines = 1
    else if (index > 1 - level2) this.qualityDeadlines = 2
    else this.qualityDeadlines = 3

    index = keyMetrics.deliverableCompletionCurrentActual / (keyMetrics.deliverableCompletionBaseLastActual || 1)
    if (index > 1 - level1) this.qualityDelivery = 1
    else if (index > 1 - level2) this.qualityDelivery = 2
    else this.qualityDelivery = 3

    index = keyMetrics.deliverableDelayCurrentActual || 0
    if (index <= 0) this.delayActualDelivery = 1
    else if (index > delay1) this.delayActualDelivery = 2
    else this.delayActualDelivery = 3

    index = keyMetrics.deliverableDelayCurrentTotal || 0
    if (index <= 0) this.delayTotalDelivery = 1
    else if (index > delay1) this.delayTotalDelivery = 2
    else this.delayTotalDelivery = 3

    index = keyMetrics.timeDelayCurrentActual || 0
    if (index <= 0) this.delayActualDeadlines = 1
    else if (index > delay1) this.delayActualDeadlines = 2
    else this.delayActualDeadlines = 3

    index = keyMetrics.timeDelayCurrentTotal || 0
    if (index <= 0) this.delayTotalDeadlines = 1
    else if (index > delay1) this.delayTotalDeadlines = 2
    else this.delayTotalDeadlines = 3

    index = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    this.delayEndDate = Math.round(index / 1000 / 60 / 60 / 24) / 7;
    this.log(`Quality End Date ${keyMetrics.endDateCurrent} Cost ${this.qualityCost} Del. ${this.qualityDelivery} Dead. ${this.qualityDeadlines} EndDate ${this.delayEndDate}, Delay Deadlines ${this.delayActualDeadlines} / ${this.delayTotalDeadlines} Delay Deliveries ${this.delayActualDelivery} / ${this.delayTotalDelivery} `);
  }

  gotoVPDetail(visboproject: VisboProject):void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject):void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  changeChart() {
    this.log(`Switch Chart to ${this.typeMetric} `);
    this.typeMetricChart = this.typeMetricList.find(x => x.name == this.typeMetric).metric;
    switch (this.typeMetricChart) {
      case 'Costs':
        this.visboKeyMetricsCostOverTime();
        break;
      case 'Deadlines':
        this.visboKeyMetricsDeadlinesOverTime();
        break;
      case 'Deliveries':
        this.visboKeyMetricsDeliveriesOverTime();
        break;
    }
  }

  switchTo(metric: string) {
    this.log(`Switch Chart from ${this.typeMetricChart} to ${metric} `);
    if (this.typeMetricChart == metric) {
      this.showHistory(!this.history);
      return;
    }
    var newTypeMetric = this.typeMetricList.find(x => x.metric == metric).name;
    // toggle between drop down views
    if (newTypeMetric) {
      this.typeMetricChart = metric;
      this.typeMetric = newTypeMetric;
      this.showHistory(true);
      switch (metric) {
        case 'Costs':
          this.visboKeyMetricsCostOverTime();
          break;
        case 'Deadlines':
          this.visboKeyMetricsDeadlinesOverTime();
          break;
        case 'Deliveries':
          this.visboKeyMetricsDeliveriesOverTime();
          break;
      }
    } else {
      // toggle to vpv Detail View
      switch (metric) {
        case 'DetailCosts':
          break;
        case 'DetailDeadlines':
          break;
        case 'DetailDeliveries':
          break;
      }
    }
  }

  switchChart() {
    this.chart = !this.chart
    this.chartButton = this.chart ? "View List" : "View Chart";
    // this.log(`Toggle Chart to ${this.chart} Graph ${JSON.stringify(this.graphDataLineChart)}`);
  }

  showHistory(newValue: boolean) {
    this.history = newValue;
    this.historyButton = this.history ? "Hide Trend" : "View Trend";
  }

  helperDateDiff(from: string, to: string, unit: string): number {
    var fromDate: Date = new Date(from);
    var toDate: Date = new Date(to);
    var dateDiff: number = fromDate.getTime() - toDate.getTime();
    if (unit == 'w') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24 / 7;
    } else if (unit == 'd') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24;
    } else {
      dateDiff = dateDiff / 1000;
    }
    return dateDiff
  }

  getShortText(text: string, len: number) : string {
    if (!text) return "";
    if (text.length < len) return text;
    if (len < 3) return '...'
    return text.substring(0, len - 3).concat('...')
  }

  sortVPVTable(n) {
    if (!this.visboprojectversions) return
    if (n != undefined) {
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n == 5 ) ? true : false;
      }
      else this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }
    if (this.sortColumn == 1) {
      // sort by VPV Timestamp
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.timestamp > b.timestamp)
          result = 1;
        else if (a.timestamp < b.timestamp)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by VPV endDate
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.endDate > b.endDate)
          result = 1;
        else if (a.endDate < b.endDate)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by VPV ampelStatus
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.ampelStatus > b.ampelStatus)
          result = 1;
        else if (a.ampelStatus < b.ampelStatus)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by VPV Erloes
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.Erloes > b.Erloes)
          result = 1;
        else if (a.Erloes < b.Erloes)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort by VC vpvCount
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.variantName.toLowerCase() > b.variantName.toLowerCase())
          result = 1;
        else if (a.variantName.toLowerCase() < b.variantName.toLowerCase())
          result = -1;
        return result
      })
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
  }

  sortKeyMetricsTable(n) {
    if (!this.visbokeymetrics) return;
    if (n != undefined) {
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n == 1 ) ? true : false;
      }
      else this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }

    this.log(`Sort Key Metrics: Col ${n} Asc ${this.sortAscending}`);

    if (this.sortColumn == 1) {
      // sort by Timestamp
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.timestamp > b.timestamp)
          result = 1;
        else if (a.timestamp < b.timestamp)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by keyMetrics Saving Cost Actual
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.savingCostActual > b.savingCostActual)
          result = 1;
        else if (a.savingCostActual < b.savingCostActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by keyMetrics Saving Cost Total
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.savingCostTotal > b.savingCostTotal)
          result = 1;
        else if (a.savingCostTotal < b.savingCostTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by keyMetrics Base Line Cost Actual
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.costBaseLastActual > b.keyMetrics.costBaseLastActual)
          result = 1;
        else if (a.keyMetrics.costBaseLastActual < b.keyMetrics.costBaseLastActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort by keyMetrics Base Line Cost Total
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.costBaseLastTotal > b.keyMetrics.costBaseLastTotal)
          result = 1;
        else if (a.keyMetrics.costBaseLastTotal < b.keyMetrics.costBaseLastTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 6) {
      // sort by keyMetrics Traffic Light
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.ampelStatus > b.ampelStatus)
          result = 1;
        else if (a.ampelStatus < b.ampelStatus)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 10) {
      // sort by keyMetrics Status
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.timeCompletionActual > b.timeCompletionActual)
          result = 1;
        else if (a.timeCompletionActual < b.timeCompletionActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 11) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.timeCompletionBaseLastActual > b.keyMetrics.timeCompletionBaseLastActual)
          result = 1;
        else if (a.keyMetrics.timeCompletionBaseLastActual < b.keyMetrics.timeCompletionBaseLastActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 12) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.timeCompletionBaseLastTotal > b.keyMetrics.timeCompletionBaseLastTotal)
          result = 1;
        else if (a.keyMetrics.timeCompletionBaseLastTotal < b.keyMetrics.timeCompletionBaseLastTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 13) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.timeDelayCurrentActual > b.keyMetrics.timeDelayCurrentActual)
          result = 1;
        else if (a.keyMetrics.timeDelayCurrentActual < b.keyMetrics.timeDelayCurrentActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 14) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.timeDelayCurrentTotal > b.keyMetrics.timeDelayCurrentTotal)
          result = 1;
        else if (a.keyMetrics.timeDelayCurrentTotal < b.keyMetrics.timeDelayCurrentTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 20) {
      // sort by keyMetrics Status
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.deliveryCompletionActual > b.deliveryCompletionActual)
          result = 1;
        else if (a.deliveryCompletionActual < b.deliveryCompletionActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 21) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.deliverableCompletionCurrentActual > b.keyMetrics.deliverableCompletionCurrentActual)
          result = 1;
        else if (a.keyMetrics.deliverableCompletionCurrentActual < b.keyMetrics.deliverableCompletionCurrentActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 22) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.deliverableCompletionCurrentTotal > b.keyMetrics.deliverableCompletionCurrentTotal)
          result = 1;
        else if (a.keyMetrics.deliverableCompletionCurrentTotal < b.keyMetrics.deliverableCompletionCurrentTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 23) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.deliverableDelayCurrentActual > b.keyMetrics.deliverableDelayCurrentActual)
          result = 1;
        else if (a.keyMetrics.deliverableDelayCurrentActual < b.keyMetrics.deliverableDelayCurrentActual)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 24) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.deliverableDelayCurrentTotal > b.keyMetrics.deliverableDelayCurrentTotal)
          result = 1;
        else if (a.keyMetrics.deliverableDelayCurrentTotal < b.keyMetrics.deliverableDelayCurrentTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 32) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.endDateBaseLast > b.keyMetrics.endDateBaseLast)
          result = 1;
        else if (a.keyMetrics.endDateBaseLast < b.keyMetrics.endDateBaseLast)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 33) {
      // sort by keyMetrics saving EndDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.savingEndDate > b.savingEndDate)
          result = 1;
        else if (a.savingEndDate < b.savingEndDate)
          result = -1;
        return result
      })
    }
    if (!this.sortAscending) {
      this.visbokeymetrics.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectKeyMetrics: ' + message);
  }

}
