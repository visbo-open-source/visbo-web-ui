import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-keymetrics',
  templateUrl: './visboproject-keymetrics.component.html'
})
export class VisboProjectKeyMetricsComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];

  dropDown: string[] = [];
  dropDownIndex: number;

  vpSelected: string;
  vpActive: VisboProject;
  deleted = false;
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

  vpvRefDate: Date;
  chartButton: string;
  chart = true;
  history = false;
  historyButton: string;
  parentThis = this;

  typeMetricList = [
    {name: 'Total & Actual Cost', metric: 'Costs'},
    {name: 'Delivery Completion', metric: 'Deliveries'},
    {name: 'Reached Deadlines', metric: 'Deadlines'},
    {name: 'Ahead/Delay Deadlines', metric: 'DeadlinesDelay'}
  ];
  typeMetric: string = this.typeMetricList[0].name;
  typeMetricChart: string = this.typeMetricList[0].metric;

  colors = ['#458CCB', '#F7941E', '#458CCB', '#F7941E', '#996600', '#996600'];
  colorsDelay = ['#BDBDBD', '#458CCB'];
  series =  {
    '0': { lineWidth: 4, pointShape: 'star' },
    '1': { lineWidth: 4, pointShape: 'triangle'},
    '2': { lineWidth: 4, pointShape: 'star' , lineDashStyle: [4, 8, 8, 4] },
    '3': { lineWidth: 4, pointShape: 'triangle' , lineDashStyle: [8, 4, 4, 8]  },
    '4': { lineWidth: 1, pointShape: 'circle', pointSize: 4 },
    '5': { lineWidth: 1, pointShape: 'circle', lineDashStyle: [8, 4, 4, 8], pointSize: 4  }
  };

  graphDataLineChart = [];
  graphOptionsLineChart = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      title: 'Comparison: plan-to-date vs. baseline',
      animation: {startup: true, duration: 200},
      legend: {position: 'top'},
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      vAxis: {
        minValue: undefined,
        maxValue: undefined,
        direction: 1,
        title: 'KeyMetrics',
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
  currentLang: string;

  sortAscending = false;
  sortColumn = 1;

  combinedPerm: VGPermission;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.chartButton = this.translate.instant('vpKeyMetric.lbl.viewList');
    this.historyButton = this.translate.instant('vpKeyMetric.lbl.showTrend');

    if (this.route.snapshot.queryParams.refDate) {
      this.vpvRefDate = new Date(this.route.snapshot.queryParams.refDate);
    }
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  dropDownInit(): void {
    this.log(`Init Drop Down List ${this.vpActive.variant.length + 1}`);
    this.dropDown = [];
    this.dropDownIndex = undefined;
    const len = this.vpActive.variant.length;

    for (let i = 0; i < len; i++) {
      if (this.vpActive.variant[i].variantName !== 'pfv' && this.vpActive.variant[i].vpvCount > 0) {
        this.dropDown.push(this.vpActive.variant[i].variantName);
      }
    }
    if (this.dropDown.length > 0 ) {
      this.dropDown.splice(0, 0, 'DEFAULT');
      this.dropDownIndex = 0;
    }
  }

  switchVariant(name: string): void {
    const i = this.dropDown.findIndex(item => item === name);
    if (i <= 0) {
      // not found or the main variant
      this.dropDownIndex = undefined;
    } else {
      // Found
      this.dropDownIndex = i;
    }
    this.log(`switch Variant ${name} index ${this.dropDownIndex}`);
    // fetch the project with Variant
    this.getVisboProjectVersions();
    return;
  }

  hasKM(km: VPVKeyMetrics, type: string): boolean {
    let result = false;
    if (!km) {
      return result;
    }
    if (type === 'DeadlinesDelay') {
      result = km.timeDelayFinished !== undefined && km.timeDelayUnFinished !== undefined;
    }
    return result;
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vpSelected = id;
    const chartFlag = this.chart;

    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            if (!this.vpActive || this.vpActive._id !== visboproject._id) {
              this.vpActive = visboproject;
              this.combinedPerm = visboproject.perm;
              this.dropDownInit();
            }
            const variantName = this.dropDownIndex > 0 ? this.dropDown[this.dropDownIndex] : '';
            let variantID = '';
            if (variantName) {
              const variant = this.vpActive.variant.find(item => item.variantName === variantName);
              variantID = variant ? variant._id.toString() : '';
            }
            this.log(`get VP name if ID is used ${this.vpActive.name} Variant: ${variantName}/${variantID} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, variantID, true)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  // this.sortVPVTable(undefined);
                  this.log(`get VPV Key metrics: Get ${visboprojectversions.length} Project Versions`);

                  this.visboKeyMetricsCalc();
                  if (visboprojectversions[0].keyMetrics) {
                    this.chart = chartFlag;
                  } else {
                    this.chart = false;
                  }
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                    this.alertService.error(message);
                  } else {
                    this.alertService.error(getErrorMessage(error));
                  }
                }
              );
          },
          error => {
            this.log(`get VPV VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    } else {
      this.gotoRoot();
    }
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.visbokeymetrics = [];

    if (!this.visboprojectversions) {
      return;
    }
    this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (this.visboprojectversions[i].keyMetrics) {
        const elementKeyMetric = new VPVKeyMetricsCalc();
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.variantName = this.visboprojectversions[i].variantName;
        elementKeyMetric.startDate = this.visboprojectversions[i].startDate;
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
        elementKeyMetric.savingCostTotal = Math.round((1 - (elementKeyMetric.keyMetrics.costCurrentTotal || 0)
                                                      / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
        if (elementKeyMetric.savingCostTotal > 100) {
          elementKeyMetric.savingCostTotal = 100;
        }
        if (elementKeyMetric.savingCostTotal < -100) {
          elementKeyMetric.savingCostTotal = -100;
        }
        elementKeyMetric.savingCostTotal = Math.round(elementKeyMetric.savingCostTotal);
        elementKeyMetric.savingCostActual = ((1 - (elementKeyMetric.keyMetrics.costCurrentActual || 0)
                                            / (elementKeyMetric.keyMetrics.costBaseLastActual || 1)) * 100) || 0;

        // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
        if (elementKeyMetric.keyMetrics.endDateBaseLast && elementKeyMetric.keyMetrics.endDateCurrent) {
          elementKeyMetric.savingEndDate = this.helperDateDiff(
            (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()),
            (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()), 'w') || 0;
            elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate);
        }

        // Calculate the Delivery Completion
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal) {
          elementKeyMetric.deliveryCompletionTotal = 100;
        } else {
          elementKeyMetric.deliveryCompletionTotal = Math.round((elementKeyMetric.keyMetrics.deliverableCompletionCurrentTotal || 0)
                                                                / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal * 100);
        }
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual) {
          elementKeyMetric.deliveryCompletionActual = 100;
        } else {
          elementKeyMetric.deliveryCompletionActual = Math.round((elementKeyMetric.keyMetrics.deliverableCompletionCurrentActual || 0)
                                                                / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual * 100);
        }

        // Calculate the Deadline Completion
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal) {
          elementKeyMetric.timeCompletionTotal = 100;
        } else {
          elementKeyMetric.timeCompletionTotal = Math.round((elementKeyMetric.keyMetrics.timeCompletionCurrentTotal || 0)
                                                            / elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal * 100);
        }
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastActual) {
          elementKeyMetric.timeCompletionActual = 100;
        } else {
          elementKeyMetric.timeCompletionActual = Math.round((elementKeyMetric.keyMetrics.timeCompletionCurrentActual || 0)
                                                            / elementKeyMetric.keyMetrics.timeCompletionBaseLastActual * 100);
        }

        this.visbokeymetrics.push(elementKeyMetric);
      }
    }
    this.log(`calc keyMetrics Result LEN ${this.visbokeymetrics.length}`);
    if (this.visbokeymetrics.length > 0) {
      this.sortKeyMetricsTable(undefined);
      let i = 0;
      // search the coresponding version for refDate
      if (this.vpvRefDate) {
        for (; i < this.visbokeymetrics.length; i++) {
          if (this.vpvRefDate.toISOString() >= (new Date(this.visbokeymetrics[i].timestamp)).toISOString() ) {
            break;
          }
        }
        if (i >= this.visbokeymetrics.length) { i = this.visbokeymetrics.length - 1; }
      }
      this.setVpvActive(this.visbokeymetrics[i]);
      this.visboKeyMetricsCostOverTime();
    } else {
      this.gotoVisboProjectVersions();
    }
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    const localA = new Date(dateA);
    const localB = new Date(dateB);
    localA.setHours(0, 0, 0, 0);
    localB.setHours(0, 0, 0, 0);
    // return false;
    return localA.getTime() === localB.getTime();
  }

  visboKeyMetricsCostOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleCostTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisCostTrend');
    this.graphOptionsLineChart.colors = this.colors;
    const keyMetricsCost = [];
    if (!this.visboprojectversions) {
      return;
    }

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        // this.visboprojectversions[i].keyMetrics =  new VPVKeyMetrics;
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i + 1].timestamp}`);
        continue;
      }
      // this.log(`visboKeyMetrics Push  ${this.visboprojectversions[i].timestamp}`);
      keyMetricsCost.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round(this.visboprojectversions[i].keyMetrics.costCurrentActual || 0),
        Math.round(this.visboprojectversions[i].keyMetrics.costBaseLastActual || 0),
        Math.round(this.visboprojectversions[i].keyMetrics.costCurrentTotal || 0),
        Math.round(this.visboprojectversions[i].keyMetrics.costBaseLastTotal || 0)
      ]);
    }
    if (keyMetricsCost.length === 0) {
      this.log(`keyMetricsCost empty`);
      keyMetricsCost.push([new Date(), 0, 0, 0, 0]);
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetricsCost.length;
    // this.log(`visboKeyMetrics len ${len} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      let currentDate = new Date(keyMetricsCost[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetricsCost.push([
        currentDate, undefined, undefined, undefined, undefined
      ]);
    }

    keyMetricsCost.push([
      'Timestamp',
      this.translate.instant('keyMetrics.shortAC'),
      this.translate.instant('keyMetrics.shortPV'),
      this.translate.instant('keyMetrics.shortEAC'),
      this.translate.instant('keyMetrics.shortBAC')
    ]);
    keyMetricsCost.reverse();
    // this.log(`visboKeyMetrics VP cost budget  ${JSON.stringify(keyMetricsCost)}`);
    this.graphDataLineChart = keyMetricsCost;
  }

  visboKeyMetricsDeliveriesOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleDeliveryTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisDeliveryTrend');
    this.graphOptionsLineChart.colors = this.colors;

    const keyMetrics = [];
    if (!this.visboprojectversions) {
      return;
    }

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentActual || 0) * 100) / 100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastActual || 0) * 100) / 100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentTotal || 0) * 100) / 100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastTotal || 0) * 100) / 100
        // ,
        // this.visboprojectversions[i].keyMetrics.deliverableDelayFinished || 0,
        // this.visboprojectversions[i].keyMetrics.deliverableDelayUnFinished || 0
      ]);
      // this.log(`visboKeyMetrics push ${JSON.stringify(keyMetrics[keyMetrics.length-1])}`);
    }
    if (keyMetrics.length === 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, 0, 0, 0
            // , 0, 0
        ]);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetrics.length;
    // this.log(`visboKeyMetrics duplicate ${len - 1} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      let currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, undefined, undefined, undefined
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Delivery');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.push([
      'Timestamp',
      this.translate.instant('keyMetrics.shortADV'),
      this.translate.instant('keyMetrics.shortPDV'),
      this.translate.instant('keyMetrics.shortEDVC'),
      this.translate.instant('keyMetrics.shortDVAC')
      // ,
      // this.translate.instant('keyMetrics.shortDelayFinished'),
      // this.translate.instant('keyMetrics.shortDelayUnFinished')
    ]);
    keyMetrics.reverse();
    this.log(`visboKeyMetrics VP Delivery Completion  ${JSON.stringify(this.graphOptionsLineChart)}`);
    this.graphDataLineChart = keyMetrics;
  }

  visboKeyMetricsDeadlinesOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleDeadlineTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisDeadlineTrend');
    this.graphOptionsLineChart.colors = this.colors;

    const keyMetrics = [];
    if (!this.visboprojectversions) {
      return;
    }

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp} ${this.visboprojectversions[i + 1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentActual || 0) * 100) / 100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastActual || 0) * 100) / 100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentTotal || 0) * 100) / 100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastTotal || 0) * 100) / 100
        // ,
        // this.visboprojectversions[i].keyMetrics.timeDelayFinished || 0,
        // this.visboprojectversions[i].keyMetrics.timeDelayUnFinished || 0
      ]);
    }
    if (keyMetrics.length === 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, 0, 0, 0]);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetrics.length;
    this.log(`visboKeyMetrics duplicate ${len - 1} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      let currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, undefined, undefined, undefined
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Deadline');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.push([
      'Timestamp',
      this.translate.instant('keyMetrics.shortAD'),
      this.translate.instant('keyMetrics.shortPD'),
      this.translate.instant('keyMetrics.shortEDC'),
      this.translate.instant('keyMetrics.shortDAC')
      // ,
      // this.translate.instant('keyMetrics.shortDeadlineDelayFinished'),
      // this.translate.instant('keyMetrics.shortDeadlineDelayUnFinished')
    ]);
    keyMetrics.reverse();
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
  }

  visboKeyMetricsDeadlinesDelayOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleDeadlineDelayTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisDeadlineDelayTrend');
    this.graphOptionsLineChart.vAxis.direction = -1;
    this.graphOptionsLineChart.colors = this.colorsDelay;
    const keyMetrics = [];
    if (!this.visboprojectversions) {
      return;
    }

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp} ${this.visboprojectversions[i + 1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        this.visboprojectversions[i].keyMetrics.timeDelayFinished,
        this.visboprojectversions[i].keyMetrics.timeDelayUnFinished
      ]);
    }
    if (keyMetrics.length === 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, 0 ]);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetrics.length;
    this.log(`visboKeyMetrics duplicate ${len - 1} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      let currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, undefined
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Delay');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.push([
      'Timestamp',
      this.translate.instant('keyMetrics.finishedDeadlineDelay'),
      this.translate.instant('keyMetrics.unfinishedDeadlineDelay')
    ]);
    keyMetrics.reverse();
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
  }

  // eslint-disable-next-line
  calcRangeAxis(keyMetrics: any[], type: string): number {
    let rangeAxis = 0;
    // let minDelayRange = 50;

    rangeAxis = 0;
    for (let i = 0; i < keyMetrics.length; i++) {
      switch (type) {
        // case 'Delay':
        //   rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][5]), Math.abs(keyMetrics[i][6]), minDelayRange);
        //   break;
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


  gotoVpView(): void {
    const url = 'vpView/';
    this.log(`goto VP View`);
    let vpid, vpvid;
    let queryParams = new HttpParams();
    if (this.vpvKeyMetricActive) {
      vpid = this.vpvKeyMetricActive.vpid;
      vpvid = this.vpvKeyMetricActive._id;
    } else if (this.vpActive) {
      vpid = this.vpActive._id;
    }
    if (vpid) {
      if (vpvid) { queryParams = queryParams.append('vpvid', vpvid); }
      this.router.navigate([url.concat(vpid)], { queryParams: queryParams});
    }
  }

  gotoVisboProjectVersions(): void {
    this.log(`goto VPV All Versions`);
    let vpid;
    let params = {};
    if (this.vpvKeyMetricActive) {
      vpid = this.vpvKeyMetricActive.vpid;
    }
    let url = 'vpv/';
    if (!vpid && this.vpActive) {
      vpid = this.vpActive._id;
      // no keyMetrics redirect to vpv View and clear history
      params = {replaceUrl: true};
      // if ((this.vpActive.perm.vp & (this.permVP.View + this.permVP.ViewRestricted)) == this.permVP.ViewRestricted) {
        url = 'vpView/';
      // }
    }
    if (vpid) {
      this.router.navigate([url.concat(vpid)], params);
    }
  }

  gotoViewCost(): void {
    this.log(`goto VPV View Cost ${this.vpvKeyMetricActive.vpid} `);
    const queryParams = { vpvid: this.vpvKeyMetricActive._id };
    this.router.navigate(['vpViewCost/'.concat(this.vpvKeyMetricActive.vpid)], { queryParams: queryParams});
  }

  gotoViewDelivery(): void {
    this.log(`goto VPV View Delivery ${this.vpvKeyMetricActive.vpid} `);
    const queryParams = { vpvid: this.vpvKeyMetricActive._id };
    this.router.navigate(['vpViewDelivery/'.concat(this.vpvKeyMetricActive.vpid)], { queryParams: queryParams});
  }

  gotoViewDeadline(): void {
    this.log(`goto VPV View Deadline ${this.vpvKeyMetricActive.vpid} `);
    const queryParams = { vpvid: this.vpvKeyMetricActive._id };
    this.router.navigate(['vpViewDeadline/'.concat(this.vpvKeyMetricActive.vpid)], { queryParams: queryParams});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion): void {
    this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], {});
  }

  gotoRoot(): void {
    this.log(`goto Root as no id is specified`);
    this.router.navigate(['/'], {});
  }

  listSelectRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    this.setVpvActive(vpv);
  }

  chartSelectRow(row: number, col: number, label: string): void {
    const len = this.graphDataLineChart.length;
    this.log(`Line Chart: User selected row ${row} col ${col} Label ${label} Len ${len}`);
    const refDate = new Date(label);
    // find version with timestamp
    let indexVPV = this.visbokeymetrics.findIndex(x => x.timestamp.toString() === refDate.toISOString());
    if (indexVPV < 0) { indexVPV = 0; }
    this.setVpvActive(this.visbokeymetrics[indexVPV]);
    this.log(`Line Chart: User selected ${row} ${col} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);
  }

  setVpvActive(vpv: VPVKeyMetricsCalc): void {
    const keyMetrics = vpv.keyMetrics;
    let index: number;
    // ur:25.02.2020: ohne Relativierung
    // const level1 = 0.05;
    // const level2 = 0.15;
    const level1 = 0.001;
    const level2 = 0.05;
    const delay1 = 7;
    this.vpvKeyMetricActive = vpv;
    this.log(`VPV Active: vpv: ${vpv._id} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);

    index = keyMetrics.costCurrentActual / (keyMetrics.costBaseLastActual || 1);
    if (index < 1 + level1) {
      this.qualityCost = 1;
    } else if (index < 1 + level2) {
      this.qualityCost = 2;
    } else {
      this.qualityCost = 3;
    }

    index = keyMetrics.costCurrentTotal / (keyMetrics.costBaseLastTotal || 1);
    if (index < 1 + level1) {
      this.qualityTotalCost = 1;
    } else if (index < 1 + level2) {
      this.qualityTotalCost = 2;
    } else {
      this.qualityTotalCost = 3;
    }

    if (keyMetrics.timeCompletionBaseLastActual) {
      index = keyMetrics.timeCompletionCurrentActual / keyMetrics.timeCompletionBaseLastActual;
    } else {
      index = 1;
    }
    if (index > 1 - level1) {
      this.qualityDeadlines = 1;
    } else if (index > 1 - level2) {
      this.qualityDeadlines = 2;
    } else {
      this.qualityDeadlines = 3;
    }

    if (keyMetrics.deliverableCompletionBaseLastActual) {
      index = keyMetrics.deliverableCompletionCurrentActual / keyMetrics.deliverableCompletionBaseLastActual;
    } else {
      index = 1;
    }
    if (index > 1 - level1) {
      this.qualityDelivery = 1;
    } else if (index > 1 - level2) {
      this.qualityDelivery = 2;
    } else {
      this.qualityDelivery = 3;
    }

    index = keyMetrics.deliverableDelayFinished || 0;
    if (index <= 0) {
      this.delayActualDelivery = 1;
    } else if (index > delay1) {
      this.delayActualDelivery = 2;
    } else {
      this.delayActualDelivery = 3;
    }

    index = keyMetrics.deliverableDelayUnFinished || 0;
    if (index <= 0) {
      this.delayTotalDelivery = 1;
    } else if (index > delay1) {
      this.delayTotalDelivery = 2;
    } else {
      this.delayTotalDelivery = 3;
    }

    index = keyMetrics.timeDelayFinished || 0;
    if (index <= 0) {
      this.delayActualDeadlines = 1;
    } else if (index <= delay1) {
      this.delayActualDeadlines = 2;
    } else {
      this.delayActualDeadlines = 3;
    }

    index = keyMetrics.timeDelayUnFinished || 0;
    if (index <= 0) {
      this.delayTotalDeadlines = 1;
    } else if (index <= delay1) {
      this.delayTotalDeadlines = 2;
    } else {
      this.delayTotalDeadlines = 3;
    }

    index = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    this.delayEndDate = Math.round(index / 1000 / 60 / 60 / 24) / 7;
    this.log(`Quality End Date ${keyMetrics.endDateCurrent} Cost ${this.qualityCost} Del. ${this.qualityDelivery} Dead. ${this.qualityDeadlines} EndDate ${this.delayEndDate}, Delay Deadlines ${this.delayActualDeadlines} / ${this.delayTotalDeadlines} Delay Deliveries ${this.delayActualDelivery} / ${this.delayTotalDelivery} `);
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  changeChart(): void {
    this.log(`Switch Chart to ${this.typeMetric} `);
    this.typeMetricChart = this.typeMetricList.find(x => x.name === this.typeMetric).metric;
    switch (this.typeMetricChart) {
      case 'Costs':
        this.visboKeyMetricsCostOverTime();
        break;
      case 'Deadlines':
        this.visboKeyMetricsDeadlinesOverTime();
        break;
      case 'DeadlinesDelay':
        this.visboKeyMetricsDeadlinesDelayOverTime();
        break;
      case 'Deliveries':
        this.visboKeyMetricsDeliveriesOverTime();
        break;
    }
  }

  switchTo(metric: string): void {
    this.log(`Switch Chart from ${this.typeMetricChart} to ${metric} `);
    if (this.typeMetricChart === metric) {
      this.showHistory(!this.history);
      return;
    }
    const newTypeMetric = this.typeMetricList.find(x => x.metric === metric).name;
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
        case 'DeadlinesDelay':
          this.visboKeyMetricsDeadlinesDelayOverTime();
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

  switchChart(): void {
    this.chart = !this.chart;
    this.chartButton = this.chart
      ? this.translate.instant('vpKeyMetric.lbl.viewList')
      : this.translate.instant('vpKeyMetric.lbl.viewChart');
  }

  showHistory(newValue: boolean): void {
    this.history = newValue;
    this.historyButton = this.history ? this.translate.instant('vpKeyMetric.lbl.hideTrend') : this.translate.instant('vpKeyMetric.lbl.showTrend');
  }

  helperDateDiff(from: string, to: string, unit: string): number {
    const fromDate: Date = new Date(from);
    const toDate: Date = new Date(to);
    let dateDiff: number = fromDate.getTime() - toDate.getTime();
    if (unit === 'w') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24 / 7;
    } else if (unit === 'd') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24;
    } else {
      dateDiff = dateDiff / 1000;
    }
    return dateDiff;
  }

  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  sortVPVTable(n?: number): void {
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
      this.visboprojectversions.sort(function(a, b) {
        return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase());
      });
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
  }

  sortKeyMetricsTable(n?: number): void {
    if (!this.visbokeymetrics) {
      return;
    }
    if (n !== undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n === 1 ) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }

    this.log(`Sort Key Metrics: Col ${n} Asc ${this.sortAscending}`);

    if (this.sortColumn === 1) {
      // sort by Timestamp
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.timestamp > b.timestamp) {
          result = 1;
        } else if (a.timestamp < b.timestamp) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 2) {
      // sort by keyMetrics Saving Cost Actual
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.savingCostActual > b.savingCostActual) {
          result = 1;
        } else if (a.savingCostActual < b.savingCostActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 3) {
      // sort by keyMetrics Saving Cost Total
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.savingCostTotal > b.savingCostTotal) {
          result = 1;
        } else if (a.savingCostTotal < b.savingCostTotal) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 4) {
      // sort by keyMetrics Base Line Cost Actual
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.costBaseLastActual > b.keyMetrics.costBaseLastActual) {
          result = 1;
        } else if (a.keyMetrics.costBaseLastActual < b.keyMetrics.costBaseLastActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 5) {
      // sort by keyMetrics Base Line Cost Total
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.costBaseLastTotal > b.keyMetrics.costBaseLastTotal) {
          result = 1;
        } else if (a.keyMetrics.costBaseLastTotal < b.keyMetrics.costBaseLastTotal) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 6) {
      // sort by keyMetrics Traffic Light
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.ampelStatus > b.ampelStatus) {
          result = 1;
        } else if (a.ampelStatus < b.ampelStatus) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 10) {
      // sort by keyMetrics Status
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.timeCompletionCurrentActual > b.keyMetrics.timeCompletionCurrentActual) {
          result = 1;
        } else if (a.keyMetrics.timeCompletionCurrentActual < b.keyMetrics.timeCompletionCurrentActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 11) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.timeCompletionActual > b.timeCompletionActual) {
          result = 1;
        } else if (a.timeCompletionActual < b.timeCompletionActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 12) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.timeCompletionBaseLastTotal > b.keyMetrics.timeCompletionBaseLastTotal) {
          result = 1;
        } else if (a.keyMetrics.timeCompletionBaseLastTotal < b.keyMetrics.timeCompletionBaseLastTotal) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 13) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.timeDelayFinished > b.keyMetrics.timeDelayFinished) {
          result = 1;
        } else if (a.keyMetrics.timeDelayFinished < b.keyMetrics.timeDelayFinished) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 14) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.timeDelayUnFinished > b.keyMetrics.timeDelayUnFinished) {
          result = 1;
        } else if (a.keyMetrics.timeDelayUnFinished < b.keyMetrics.timeDelayUnFinished) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 20) {
      // sort by keyMetrics Status
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.deliveryCompletionActual > b.deliveryCompletionActual) {
          result = 1;
        } else if (a.deliveryCompletionActual < b.deliveryCompletionActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 21) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.deliverableCompletionCurrentActual > b.keyMetrics.deliverableCompletionCurrentActual) {
          result = 1;
        } else if (a.keyMetrics.deliverableCompletionCurrentActual < b.keyMetrics.deliverableCompletionCurrentActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 22) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.deliverableCompletionCurrentTotal > b.keyMetrics.deliverableCompletionCurrentTotal) {
          result = 1;
        } else if (a.keyMetrics.deliverableCompletionCurrentTotal < b.keyMetrics.deliverableCompletionCurrentTotal) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 23) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.deliverableDelayFinished > b.keyMetrics.deliverableDelayFinished) {
          result = 1;
        } else if (a.keyMetrics.deliverableDelayFinished < b.keyMetrics.deliverableDelayFinished) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 24) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.deliverableDelayUnFinished > b.keyMetrics.deliverableDelayUnFinished) {
          result = 1;
        } else if (a.keyMetrics.deliverableDelayUnFinished < b.keyMetrics.deliverableDelayUnFinished) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 25) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.deliverableCompletionBaseLastTotal > b.keyMetrics.deliverableCompletionBaseLastTotal) {
          result = 1;
        } else if (a.keyMetrics.deliverableCompletionBaseLastTotal < b.keyMetrics.deliverableCompletionBaseLastTotal) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 26) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.deliverableCompletionBaseLastActual > b.keyMetrics.deliverableCompletionBaseLastActual) {
          result = 1;
        } else if (a.keyMetrics.deliverableCompletionBaseLastActual < b.keyMetrics.deliverableCompletionBaseLastActual) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 32) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.keyMetrics.endDateBaseLast > b.keyMetrics.endDateBaseLast) {
          result = 1;
        } else if (a.keyMetrics.endDateBaseLast < b.keyMetrics.endDateBaseLast) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 33) {
      // sort by keyMetrics saving EndDate
      this.visbokeymetrics.sort(function(a, b) {
        let result = 0;
        if (a.savingEndDate > b.savingEndDate) {
          result = 1;
        } else if (a.savingEndDate < b.savingEndDate) {
          result = -1;
        }
        return result;
      });
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
