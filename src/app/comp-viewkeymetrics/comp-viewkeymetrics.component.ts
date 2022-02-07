import { Component, Input, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VPParams } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { convertDate, visboCmpDate, getPreView } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewkeymetrics',
  templateUrl: './comp-viewkeymetrics.component.html'
})
export class VisboCompViewKeyMetricsComponent implements OnInit, OnChanges {

  @Input() vpvid: string;
  @Input() visboprojectversions: VisboProjectVersion[];
  @Input() combinedPerm: VGPermission;
  @Output() switchViewChild: EventEmitter<VPParams> = new EventEmitter<VPParams>(); //creating an output event

  visbokeymetrics: VPVKeyMetricsCalc[] = [];
  vpvKeyMetricActive: VPVKeyMetricsCalc;

  allViews = ['KeyMetrics', 'Capacity', 'Cost', 'Deadline', 'Delivery', 'All'];
  currentView = 'KeyMetrics';
  currentViewKM = false;

  qualityCost: number;
  qualityTotalCost: number;
  qualityTotalCostPredict: number;
  qualityEndDate: number;
  qualityEndDiffWeeks: number;
  qualityDeadline: number;
  qualityDelivery: number;
  delayActualDeadline: number;
  delayTotalDeadline: number;
  delayActualDelivery: number;
  delayTotalDelivery: number;
  delayEndDate: number;

  refDate = new Date();
  variantID: string;

  chartButton: string;
  chart = true;
  history = false;
  historyButton: string;
  parentThis = this;

  typeMetricList = [
    {name: 'Total & Actual Cost', metric: 'Cost'},
    {name: 'Delivery Completion', metric: 'Delivery'},
    {name: 'Reached Deadlines', metric: 'Deadline'},
    {name: 'Ahead/Delay Deadlines', metric: 'DeadlineDelay'},
    {name: 'Ahead/Delay Deliveries', metric: 'DeliveryDelay'},
    {name: 'Project End Date', metric: 'EndDate'}
  ];
  typeMetric: string = this.typeMetricList[0].name;
  typeMetricChart: string;

  colors = [];
  colorsDefault = ['#458CCB', '#F7941E', '#458CCB', '#F7941E', '#996600', '#996600'];
  colorsDelay = ['#BDBDBD', '#458CCB'];
  colorsEndDate = ['#458CCB', '#F7941E'];
  seriesDefault =  {
    '0': { lineWidth: 4, pointShape: 'star', lineDashStyle: undefined, pointSize: undefined},
    '1': { lineWidth: 4, pointShape: 'triangle', lineDashStyle: undefined, pointSize: undefined},
    '2': { lineWidth: 4, pointShape: 'star', lineDashStyle: [4, 8, 8, 4], pointSize: undefined },
    '3': { lineWidth: 4, pointShape: 'triangle', lineDashStyle: [8, 4, 4, 8], pointSize: undefined  },
    '4': { lineWidth: 4, pointShape: 'circle', lineDashStyle: [6, 2, 2, 6], pointSize: 6 },
    '5': { lineWidth: 1, pointShape: 'circle', lineDashStyle: [8, 4, 4, 8], pointSize: 4 }
  };
  seriesEndDate =  {
    '0': { lineWidth: 4, pointShape: 'star' , lineDashStyle: [4, 8, 8, 4], pointSize: undefined },
    '1': { lineWidth: 4, pointShape: 'triangle' , lineDashStyle: [8, 4, 4, 8], pointSize: undefined }
  };

  graphDataLineChart = [];
  graphOptionsLineChart = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      title: 'Comparison: plan-to-date vs. baseline',
      animation: {startup: true, duration: 200},
      legend: {position: 'top'},
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      tooltip: {
        isHtml: true
      },
      vAxis: {
        minValue: undefined,
        maxValue: undefined,
        direction: 1,
        title: 'KeyMetrics',
        minorGridlines: {count: 0, color: 'none'},
        ticks: undefined
      },
      hAxis: {
        format: 'MMM yy',
        gridlines: {
          count: -1
        },
        minorGridlines: {count: 0, color: 'none'}
      },
      pointSize: 14,
      curveType: 'function',
      series: this.seriesDefault,
      colors: this.colorsDefault
    };

  graphOptionsLineChartEndDate = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      title: 'Comparison: plan-to-date vs. baseline',
      animation: {startup: true, duration: 200},
      legend: {position: 'top'},
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      tooltip: {
        isHtml: true
      },
      vAxis: {
        minValue: undefined,
        maxValue: undefined,
        direction: 1,
        title: 'KeyMetrics',
        minorGridlines: {count: 0, color: 'none'},
        ticks: undefined
      },
      hAxis: {
        format: 'MMM yy',
        gridlines: {
          count: -1
        },
        minorGridlines: {count: 0, color: 'none'}
      },
      pointSize: 14,
      curveType: 'function',
      series: this.seriesEndDate,
      colors: this.colorsEndDate
    };

  sortAscending = false;
  sortColumn = 1;

  currentLang: string;

  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
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
    this.initSettings();
    this.visboKeyMetricsCalc();
  }

  ngOnChanges(): void {
    this.log(`KeyMetrics Changes  ${this.vpvid}`);
    this.initSettings();
    this.visboKeyMetricsCalc();
  }

  initSettings(): void {
    // this.showHistory(false);
    if (this.route.snapshot.queryParams.refDate) {
      this.refDate = new Date(this.route.snapshot.queryParams.refDate);
    } else {
      this.refDate = undefined;
    }
    const newVariantID = this.route.snapshot.queryParams.variantID;
    if (newVariantID != this.variantID) {
      this.typeMetricChart = undefined;
      this.variantID = newVariantID;
    }

  }

  hasKM(km: VPVKeyMetrics, type: string): boolean {
    let result = false;
    if (!km) {
      return false;
    }
    if (type == 'Cost') {
      result = km.costCurrentTotal > 0 || km.costBaseLastTotal > 0;
    } else if (type == 'Deadline') {
      // check for dedline in addition to project end
      result = km.timeCompletionCurrentTotal > 1 || km.timeCompletionBaseLastTotal > 1;
    } else if (type == 'EndDate') {
      result = km.endDateCurrent != undefined || km.endDateBaseLast != undefined;
    } else if (type === 'DeadlineDelay') {
      if (km.timeCompletionCurrentTotal > 1 || km.timeCompletionBaseLastTotal > 1) {
        result = km.timeDelayFinished !== undefined || km.timeDelayUnFinished !== undefined;
      }
    } else if (type == 'Delivery') {
      result = km.deliverableCompletionCurrentTotal > 0 || km.deliverableCompletionBaseLastTotal > 0;
    } else if (type === 'DeliveryDelay') {
      result = km.deliverableDelayFinished !== undefined || km.deliverableDelayUnFinished !== undefined;
    } else if (type === 'PAC') {
      result = km.costCurrentTotalPredict !== undefined;
    }
    return result;
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
        elementKeyMetric.vp = this.visboprojectversions[i].vp;
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.variantName = this.visboprojectversions[i].variantName;
        elementKeyMetric.startDate = this.visboprojectversions[i].startDate;
        elementKeyMetric.Risiko = this.visboprojectversions[i].Risiko;
        elementKeyMetric.StrategicFit = this.visboprojectversions[i].StrategicFit;
        elementKeyMetric.vpStatus = elementKeyMetric.vp.vpStatus;
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
        elementKeyMetric.savingCostTotalPredict = Math.round((1 - (elementKeyMetric.keyMetrics.costCurrentTotalPredict || 0)
                                                      / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;

        // elementKeyMetric.savingCostTotal = Math.round(elementKeyMetric.savingCostTotal);
        elementKeyMetric.savingCostActual = ((1 - (elementKeyMetric.keyMetrics.costCurrentActual || 0)
                                            / (elementKeyMetric.keyMetrics.costBaseLastActual || 1)) * 100) || 0;

        // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
        if (elementKeyMetric.keyMetrics.endDateBaseLast && elementKeyMetric.keyMetrics.endDateCurrent) {
          elementKeyMetric.savingEndDate = this.helperDateDiff(
            (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()),
            (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()), 'w') || 0;
            elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate * 10) / 10;
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
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastActual || elementKeyMetric.keyMetrics.timeCompletionBaseLastActual == 0 ) {
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
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
      let i = 0;
      // search the coresponding version for refDate
      const refDate = this.refDate || new Date();
      for (; i < this.visbokeymetrics.length; i++) {
        if (visboCmpDate(refDate, new Date(this.visbokeymetrics[i].timestamp)) >= 0) {
          break;
        }
      }
      if (i >= this.visbokeymetrics.length) { i = this.visbokeymetrics.length - 1; }
      this.setVpvActive(this.visbokeymetrics[i]);
    } else {
      this.switchView('All');
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
    this.graphOptionsLineChart.vAxis.direction = 1;
    this.graphOptionsLineChart.colors = this.colorsDefault;

    const keyMetricsCost = [];
    if (!this.visboprojectversions) {
      return;
    }
    let predict = false;
    this.visboprojectversions.forEach(vpv => {
      if (vpv.keyMetrics) {
        predict = predict || this.hasKM(vpv.keyMetrics, 'PAC');
      }
    });

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        // this.visboprojectversions[i].keyMetrics =  new VPVKeyMetrics;
        continue;
      }
      // skip multiple versions per day
      if (i > 0
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i - 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i - 1].timestamp}`);
        continue;
      }
      // this.log(`visboKeyMetrics Push  ${this.visboprojectversions[i].timestamp}`);
      const tooltip = this.createTooltipCost(this.visboprojectversions[i]);
      if (predict) {
        keyMetricsCost.push([
          new Date(this.visboprojectversions[i].timestamp),
          Math.round(this.visboprojectversions[i].keyMetrics.costCurrentActual || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costBaseLastActual || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costCurrentTotal || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costBaseLastTotal || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costCurrentTotalPredict || 0),
          tooltip
        ]);
      } else {
        keyMetricsCost.push([
          new Date(this.visboprojectversions[i].timestamp),
          Math.round(this.visboprojectversions[i].keyMetrics.costCurrentActual || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costBaseLastActual || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costCurrentTotal || 0),
          tooltip,
          Math.round(this.visboprojectversions[i].keyMetrics.costBaseLastTotal || 0),
          tooltip
        ]);
      }
    }
    if (keyMetricsCost.length === 0) {
      this.log(`keyMetricsCost empty`);
      if (predict) {
        keyMetricsCost.push([new Date(), 0, undefined, 0, undefined, 0, undefined, 0, undefined, 0, undefined]);
      } else {
        keyMetricsCost.push([new Date(), 0, undefined, 0, undefined, 0, undefined, 0, undefined]);
      }
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetricsCost.length;
    // this.log(`visboKeyMetrics len ${len} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(keyMetricsCost[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      if (predict) {
        keyMetricsCost.push([
          currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
        ]);
      } else {
        keyMetricsCost.push([
          currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
        ]);
      }
    }
    if (predict) {
      keyMetricsCost.unshift([
        'Timestamp',
        this.translate.instant('keyMetrics.shortAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortPV'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortEAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortBAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortPAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}}
      ]);
    } else {
      keyMetricsCost.unshift([
        'Timestamp',
        this.translate.instant('keyMetrics.shortAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortPV'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortEAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('keyMetrics.shortBAC'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}}
      ]);

    }
    this.graphDataLineChart = keyMetricsCost;
  }

  createTooltipCost(vpv: VisboProjectVersion): string {
    const ts = convertDate(new Date(vpv.timestamp), 'fullDateTime', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:220px;">' +
      '<div><b>' + ts + '</b></div>' + '<div>' +
      '<table>';

      const longEAC = this.translate.instant('keyMetrics.longEAC');
      const longPAC = this.translate.instant('keyMetrics.longPAC');
      const longBAC = this.translate.instant('keyMetrics.longBAC');
      const planAC = this.translate.instant('keyMetrics.planAC');
      const baselinePV = this.translate.instant('keyMetrics.baselinePV');

      result = result + '<tr>' + '<td>' + longEAC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.costCurrentTotal || 0) * 10) / 10 + ' T&euro;</b></td>' + '</tr>';
      if (vpv.keyMetrics?.costCurrentTotalPredict !== undefined) {
        result = result + '<tr>' + '<td>' + longPAC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.costCurrentTotalPredict || 0) * 10) / 10 + ' T&euro;</b></td>' + '</tr>';
      }
      result = result + '<tr>' + '<td>' + longBAC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.costBaseLastTotal || 0) * 10) / 10 + ' T&euro;</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + planAC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.costCurrentActual || 0) * 10) / 10 + ' T&euro;</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + baselinePV + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.costBaseLastActual || 0) * 10) / 10 + ' T&euro;</b></td>' + '</tr>';
      result = result + '</table>' + '</div>' + '</div>';

    return result;
  }

  visboKeyMetricsEndDateOverTime(): void {
    this.graphOptionsLineChartEndDate.title = this.translate.instant('keyMetrics.chart.titleEndDateTrend');
    this.graphOptionsLineChartEndDate.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisEndDateTrend');
    this.graphOptionsLineChartEndDate.colors = this.colorsEndDate;

    const keyMetricsEndDate = [];
    if (!this.visboprojectversions) {
      return;
    }
    let minGetTime = Number.MAX_VALUE;
    let maxGetTime = Number.MIN_VALUE;

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        // this.visboprojectversions[i].keyMetrics =  new VPVKeyMetrics;
        continue;
      }
      // skip multiple versions per day
      if (i > 0
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i - 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i - 1].timestamp}`);
        continue;
      }
      // this.log(`visboKeyMetrics Push  ${this.visboprojectversions[i].timestamp}`);
      const endDateCurrent = (new Date(this.visboprojectversions[i].keyMetrics.endDateCurrent)).getTime() || 0;
      const endDateBaseLast = (new Date(this.visboprojectversions[i].keyMetrics.endDateBaseLast)).getTime() || 0;
      minGetTime = Math.min(minGetTime, endDateCurrent);
      minGetTime = Math.min(minGetTime, endDateBaseLast);
      maxGetTime = Math.max(maxGetTime, endDateCurrent);
      maxGetTime = Math.max(maxGetTime, endDateBaseLast);
      const ts = convertDate(new Date(this.visboprojectversions[i].timestamp), 'fullDateTime', this.currentLang);
      const estimatedED = convertDate(new Date(this.visboprojectversions[i].keyMetrics.endDateCurrent), 'fullDate', this.currentLang);
      const baselineED = convertDate(new Date(this.visboprojectversions[i].keyMetrics.endDateBaseLast), 'fullDate', this.currentLang);
      keyMetricsEndDate.push([
        new Date(this.visboprojectversions[i].timestamp),
        endDateCurrent,
        this.createTooltipEndDate(ts, estimatedED, baselineED),
        endDateBaseLast,
        this.createTooltipEndDate(ts, estimatedED, baselineED)
      ]);
    }
    if (keyMetricsEndDate.length === 0) {
      this.log(`keyMetricsEndDate empty`);
      keyMetricsEndDate.push([new Date(), undefined, undefined, undefined, undefined]);
    }
    keyMetricsEndDate.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetricsEndDate.length;
    // this.log(`visboKeyMetrics len ${len} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(keyMetricsEndDate[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetricsEndDate.push([
        currentDate, undefined, undefined, undefined, undefined
      ]);
    }
    const minDate = new Date(minGetTime);
    minDate.setDate(1);
    minDate.setHours(0,0,0,0);
    minDate.setMonth(minDate.getMonth() - 1);
    const maxDate = new Date(maxGetTime);
    maxDate.setDate(1);
    maxDate.setHours(0,0,0,0);
    maxDate.setMonth(maxDate.getMonth() + 2);
    minGetTime = minDate.getTime();
    maxGetTime = maxDate.getTime();

    this.graphOptionsLineChartEndDate.vAxis.ticks = [];
    while (minDate.getTime() <= maxDate.getTime()) {
      this.graphOptionsLineChartEndDate.vAxis.ticks.push(
        {v: minDate.getTime(), f: convertDate(minDate, 'shortDate', this.currentLang)},
      )
      minDate.setMonth(minDate.getMonth() + 1);
    }
    keyMetricsEndDate.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.shortEED'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortBED'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    // this.log(`visboKeyMetrics VP cost budget  ${JSON.stringify(keyMetricsEndDate)}`);
    this.graphDataLineChart = keyMetricsEndDate;
  }

  createTooltipEndDate(timestamp: string, estimatedED: string, baselineED: string): string {
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:220px;">' +
      '<div><b>' + timestamp + '</b></div>' + '<div>' +
      '<table>';

    const longEED = this.translate.instant('keyMetrics.longEED');
    const longBED = this.translate.instant('keyMetrics.longBED');

    result = result + '<tr>' + '<td>' + longEED + ':</td>' + '<td align="right"><b>' + estimatedED + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + longBED + ':</td>' + '<td align="right"><b>' + baselineED + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';

    return result;
  }

  visboKeyMetricsDeliveryOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleDeliveryTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisDeliveryTrend');
    this.graphOptionsLineChart.vAxis.direction = 1;
    this.graphOptionsLineChart.colors = this.colorsDefault;

    const keyMetrics = [];
    if (!this.visboprojectversions) {
      return;
    }

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i > 0
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i - 1].timestamp)) {
        continue;
      }

      const tooltip = this.createTooltipDelivery(this.visboprojectversions[i]);
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentActual || 0) * 100) / 100,
        tooltip,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastActual || 0) * 100) / 100,
        tooltip,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentTotal || 0) * 100) / 100,
        tooltip,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastTotal || 0) * 100) / 100,
        tooltip
        // ,
        // this.visboprojectversions[i].keyMetrics.deliverableDelayFinished || 0,
        // this.visboprojectversions[i].keyMetrics.deliverableDelayUnFinished || 0
      ]);
      // this.log(`visboKeyMetrics push ${JSON.stringify(keyMetrics[keyMetrics.length-1])}`);
    }
    if (keyMetrics.length === 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, undefined, 0, undefined, 0, undefined, 0, undefined
            // , 0, 0
        ]);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetrics.length;
    // this.log(`visboKeyMetrics duplicate ${len - 1} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Delivery');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.shortADV'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortPDV'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortEDVC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortDVAC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
      // ,
      // this.translate.instant('keyMetrics.shortDelayFinished'),
      // this.translate.instant('keyMetrics.shortDelayUnFinished')
    ]);
    this.log(`visboKeyMetrics VP Delivery Completion  ${JSON.stringify(this.graphOptionsLineChart)}`);
    this.graphDataLineChart = keyMetrics;
  }

  createTooltipDelivery(vpv: VisboProjectVersion): string {
    const ts = convertDate(new Date(vpv.timestamp), 'fullDateTime', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:220px;">' +
      '<div><b>' + ts + '</b></div>' + '<div>' +
      '<table>';

    const shortDVAC = this.translate.instant('keyMetrics.shortDVAC');
    const shortEDVC = this.translate.instant('keyMetrics.shortEDVC');
    const planADV = this.translate.instant('keyMetrics.planADV');
    const baselinePDV = this.translate.instant('keyMetrics.baselinePDV');

    result = result + '<tr>' + '<td>' + shortEDVC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.deliverableCompletionCurrentTotal || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + shortDVAC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.deliverableCompletionBaseLastTotal || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + planADV + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.deliverableCompletionCurrentActual || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + baselinePDV + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.deliverableCompletionBaseLastActual || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';

    return result;
  }

  visboKeyMetricsDeadlineOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleDeadlineTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisDeadlineTrend');
    this.graphOptionsLineChart.vAxis.direction = 1;
    this.graphOptionsLineChart.colors = this.colorsDefault;

    const keyMetrics = [];
    if (!this.visboprojectversions) {
      return;
    }

    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i > 0
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i - 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp} ${this.visboprojectversions[i - 1].timestamp}`);
        continue;
      }
      const tooltip = this.createTooltipDeadline(this.visboprojectversions[i]);
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentActual || 0) * 100) / 100,
        tooltip,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastActual || 0) * 100) / 100,
        tooltip,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentTotal || 0) * 100) / 100,
        tooltip,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastTotal || 0) * 100) / 100,
        tooltip
      ]);
    }
    if (keyMetrics.length === 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, undefined, 0, undefined, 0, undefined, 0, undefined]);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetrics.length;
    this.log(`visboKeyMetrics duplicate ${len - 1} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Deadline');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.shortAD'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortPD'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortEDC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.shortDAC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
  }

  createTooltipDeadline(vpv: VisboProjectVersion): string {
    const ts = convertDate(new Date(vpv.timestamp), 'fullDateTime', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:220px;">' +
      '<div><b>' + ts + '</b></div>' + '<div>' +
      '<table>';

    const shortDAC = this.translate.instant('keyMetrics.shortDAC');
    const shortEDC = this.translate.instant('keyMetrics.shortEDC');
    const planAD = this.translate.instant('keyMetrics.planAD');
    const baselinePD = this.translate.instant('keyMetrics.baselinePD');

    result = result + '<tr>' + '<td>' + shortEDC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.timeCompletionCurrentTotal || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + shortDAC + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.timeCompletionBaseLastTotal || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + planAD + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.timeCompletionCurrentActual || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + baselinePD + ':</td>' + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.timeCompletionBaseLastActual || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';

    return result;
  }

  visboKeyMetricsDeadlineDelayOverTime(): void {
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
      if (i > 0
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i - 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp} ${this.visboprojectversions[i - 1].timestamp}`);
        continue;
      }
      const tooltip = this.createTooltipDeadlineDelay(this.visboprojectversions[i]);
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        this.visboprojectversions[i].keyMetrics.timeDelayFinished || 0,
        tooltip,
        this.visboprojectversions[i].keyMetrics.timeDelayUnFinished || 0,
        tooltip
      ]);
    }
    if (keyMetrics.length === 0) {
      this.log(`visboKeyMetrics empty`);
      keyMetrics.push([new Date(), 0, undefined, 0, undefined ]);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0]; });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = keyMetrics.length;
    this.log(`visboKeyMetrics duplicate ${len - 1} ${JSON.stringify(this.visboprojectversions[len - 1])}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, 0, undefined, 0
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Delay');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.finishedDeadlineDelay'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.unfinishedDeadlineDelay'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
  }

  createTooltipDeadlineDelay(vpv: VisboProjectVersion): string {
    const ts = convertDate(new Date(vpv.timestamp), 'fullDateTime', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:220px;">' +
      '<div><b>' + ts + '</b></div>' + '<div>' +
      '<table>';

    const finishedDeadlineDelay = this.translate.instant('keyMetrics.finishedDeadlineDelay');
    const unfinishedDeadlineDelay = this.translate.instant('keyMetrics.unfinishedDeadlineDelay');
    const unitsDelay = this.translate.instant('vpKeyMetric.lbl.unitsDelay');

    result = result + '<tr>' + '<td>' + finishedDeadlineDelay + ':</td>' + unitsDelay + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.timeDelayFinished || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + unfinishedDeadlineDelay + ':</td>' + unitsDelay + '<td align="right"><b>' + Math.round((vpv.keyMetrics?.timeDelayUnFinished || 0) * 10) / 10 + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';

    return result;
  }

  visboKeyMetricsDeliveryDelayOverTime(): void {
    this.graphOptionsLineChart.title = this.translate.instant('keyMetrics.chart.titleDeliveryDelayTrend');
    this.graphOptionsLineChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisDeliveryDelayTrend');
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
      if (i > 0
      && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i - 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp} ${this.visboprojectversions[i - 1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        this.visboprojectversions[i].keyMetrics.deliverableDelayFinished,
        this.visboprojectversions[i].keyMetrics.deliverableDelayUnFinished
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
      const currentDate = new Date(keyMetrics[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      keyMetrics.push([
        currentDate, undefined, undefined
      ]);
    }
    const maxValue = this.calcRangeAxis(keyMetrics, 'Delay');
    this.graphOptionsLineChart.vAxis.maxValue = maxValue;
    this.graphOptionsLineChart.vAxis.minValue = -maxValue;

    keyMetrics.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.finishedDeliveryDelay'),
      this.translate.instant('keyMetrics.unfinishedDeliveryDelay')
    ]);
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

  switchView(newView: string, withKM = false): void {
    newView = this.allViews.find(item => item === newView);
    if (newView) {
      this.typeMetricChart = newView;
    } else {
      newView = this.allViews[0];
    }
    this.currentView = newView;
    this.currentViewKM  = withKM;
    this.showHistory(false);
    this.updateUrlParam(withKM ? 'viewKM' : 'view', newView);
  }

  switchToHistory(metric: string): void {
    this.log(`Switch Chart from ${this.typeMetricChart} to ${metric} `);
    this.currentView = 'KeyMetrics';
    this.updateUrlParam('view', this.currentView);

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
        case 'Cost':
          this.visboKeyMetricsCostOverTime();
          break;
        case 'EndDate':
          this.visboKeyMetricsEndDateOverTime();
          break;
        case 'Deadline':
          this.visboKeyMetricsDeadlineOverTime();
          break;
        case 'DeadlineDelay':
          this.visboKeyMetricsDeadlineDelayOverTime();
          break;
        case 'DeliveryDelay':
          this.visboKeyMetricsDeliveryDelayOverTime();
          break;
        case 'Delivery':
          this.visboKeyMetricsDeliveryOverTime();
          break;
      }
    }
  }

  gotoVisboProjectVersions(): void {
    this.log(`goto VPV All Versions`);
    let vpid;
    const params = {};
    if (this.vpvKeyMetricActive) {
      vpid = this.vpvKeyMetricActive.vpid;
    }
    const url = 'vpv/';
    if (vpid) {
      this.router.navigate([url.concat(vpid)], params);
    }
  }

  updateUrlParam(type: string, value: string, history = false): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPParams();
    if (type == 'view') {
      queryParams.view = value;
    } else if (type == 'viewKM') {
      queryParams.viewKM = value;
    } else if (type == 'refDate') {
      queryParams.refDate = value;
    }
    this.switchViewChild.emit(queryParams); //emmiting the event to update the refDate info in main.
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: !history,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  chartSelectRow(row: number, col: number, label: string): void {
    const len = this.graphDataLineChart.length;
    this.log(`Line Chart: User selected row ${row} col ${col} Label ${label} Len ${len}`);
    const refDate = new Date(label);
    // find version with timestamp
    let indexVPV = this.visbokeymetrics.findIndex(x => x.timestamp.toString() === refDate.toISOString());
    if (indexVPV < 0) { indexVPV = 0; }
    this.setVpvActive(this.visbokeymetrics[indexVPV], true);
    this.log(`Line Chart: User selected ${row} ${col} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);
  }

  listSelectRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    this.setVpvActive(vpv, true);
  }

  setVpvActive(vpv: VPVKeyMetricsCalc, updateParent = false): void {
    if (!vpv) { return; }
    this.refDate = new Date(vpv.timestamp);
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
    if (updateParent) {
      this.updateUrlParam('refDate', vpv.timestamp.toString());
    }
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

    if (keyMetrics.costCurrentTotalPredict) {
      index = keyMetrics.costCurrentTotalPredict / (keyMetrics.costBaseLastTotal || 1);
      if (index < 1 + level1) {
        this.qualityTotalCostPredict = 1;
      } else if (index < 1 + level2) {
        this.qualityTotalCostPredict = 2;
      } else {
        this.qualityTotalCostPredict = 3;
      }
    }

    if (keyMetrics.endDateBaseLast) {
      const currentDate = keyMetrics.endDateCurrent ? new Date(keyMetrics.endDateCurrent) : new Date();
      const baseDate = new Date(keyMetrics.endDateBaseLast);
      index = (currentDate.getTime() - baseDate.getTime()) / 1000 / 3600 / 24 / 7;
      this.qualityEndDiffWeeks = index;
    } else {
      index = undefined;
    }
    if (index <= 0) {
      this.qualityEndDate = 1;
    } else if (index <= 4) {
      this.qualityEndDate = 2;
    } else if (index > 4){
      this.qualityEndDate = 3;
    } else {
      this.qualityEndDate = undefined;
    }

    if (keyMetrics.timeCompletionBaseLastActual) {
      index = keyMetrics.timeCompletionCurrentActual / keyMetrics.timeCompletionBaseLastActual;
    } else {
      index = 1;
    }
    if (index > 1 - level1) {
      this.qualityDeadline = 1;
    } else if (index > 1 - level2) {
      this.qualityDeadline = 2;
    } else {
      this.qualityDeadline = 3;
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
      this.delayActualDeadline = 1;
    } else if (index <= delay1) {
      this.delayActualDeadline = 2;
    } else {
      this.delayActualDeadline = 3;
    }

    index = keyMetrics.timeDelayUnFinished || 0;
    if (index <= 0) {
      this.delayTotalDeadline = 1;
    } else if (index <= delay1) {
      this.delayTotalDeadline = 2;
    } else {
      this.delayTotalDeadline = 3;
    }

    index = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    this.delayEndDate = Math.round(index / 1000 / 60 / 60 / 24) / 7;
    this.log(`Quality End Date ${keyMetrics.endDateCurrent} Cost ${this.qualityCost} Del. ${this.qualityDelivery} Dead. ${this.qualityDeadline} EndDate ${this.delayEndDate}, Delay Deadline ${this.delayActualDeadline} / ${this.delayTotalDeadline} Delay Delivery ${this.delayActualDelivery} / ${this.delayTotalDelivery} `);
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

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
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
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortColumn === 2) {
      this.visbokeymetrics.sort(function(a, b) { return a.savingCostActual - b.savingCostActual; });
    } else if (this.sortColumn === 3) {
      this.visbokeymetrics.sort(function(a, b) { return a.savingCostTotal - b.savingCostTotal; });
    } else if (this.sortColumn === 4) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.costBaseLastActual || 0) - (b.keyMetrics?.costBaseLastActual || 0); });
    } else if (this.sortColumn === 5) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.costBaseLastTotal || 0) - (b.keyMetrics?.costBaseLastTotal || 0); });
    } else if (this.sortColumn === 6) {
      this.visbokeymetrics.sort(function(a, b) { return a.ampelStatus - b.ampelStatus; });
    } else if (this.sortColumn === 7) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.costCurrentActual || 0) - (b.keyMetrics?.costCurrentActual || 0); });
    } else if (this.sortColumn === 8) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.costCurrentTotal || 0) - (b.keyMetrics?.costCurrentTotal || 0); });
    } else if (this.sortColumn === 10) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.timeCompletionCurrentActual || 0) - (b.keyMetrics?.timeCompletionCurrentActual || 0); });
    } else if (this.sortColumn === 11) {
      this.visbokeymetrics.sort(function(a, b) { return a.timeCompletionActual - b.timeCompletionActual; });
    } else if (this.sortColumn === 12) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.timeCompletionBaseLastTotal || 0) - (b.keyMetrics?.timeCompletionBaseLastTotal || 0); });
    } else if (this.sortColumn === 13) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.timeDelayFinished || 0) - (b.keyMetrics?.timeDelayFinished || 0); });
    } else if (this.sortColumn === 14) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.timeDelayUnFinished || 0) - (b.keyMetrics?.timeDelayUnFinished || 0); });
    } else if (this.sortColumn === 20) {
      this.visbokeymetrics.sort(function(a, b) { return a.deliveryCompletionActual - b.deliveryCompletionActual; });
    } else if (this.sortColumn === 21) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.deliverableCompletionCurrentActual || 0) - (b.keyMetrics?.deliverableCompletionCurrentActual || 0); });
    } else if (this.sortColumn === 22) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.deliverableCompletionCurrentTotal || 0) - (b.keyMetrics?.deliverableCompletionCurrentTotal || 0); });
    } else if (this.sortColumn === 23) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.deliverableDelayFinished || 0) - (b.keyMetrics?.deliverableDelayFinished || 0); });
    } else if (this.sortColumn === 24) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.deliverableDelayUnFinished || 0) - (b.keyMetrics?.deliverableDelayUnFinished || 0); });
    } else if (this.sortColumn === 25) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.deliverableCompletionBaseLastTotal || 0) - (b.keyMetrics?.deliverableCompletionBaseLastTotal || 0); });
    } else if (this.sortColumn === 26) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.deliverableCompletionBaseLastActual || 0) - (b.keyMetrics?.deliverableCompletionBaseLastActual || 0); });
    } else if (this.sortColumn === 31) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.keyMetrics?.endDateCurrent, b.keyMetrics?.endDateCurrent); });
    } else if (this.sortColumn === 32) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.keyMetrics?.endDateBaseLast, b.keyMetrics?.endDateBaseLast); });
    } else if (this.sortColumn === 33) {
      this.visbokeymetrics.sort(function(a, b) { return a.savingEndDate - b.savingEndDate; });
    }
    if (!this.sortAscending) {
      this.visbokeymetrics.reverse();
    }
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewCost: ' + message);
    // console.log('CompVisboViewCost: ' + message);
  }

}
