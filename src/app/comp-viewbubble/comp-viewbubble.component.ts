import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVKeyMetricsCalc } from '../_models/visboprojectversion';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

class Metric{
  name: string;
  metric: string;
  axis: string;
  bubble: string;
  table: string;
}

@Component({
  selector: 'app-comp-viewbubble',
  templateUrl: './comp-viewbubble.component.html'
})
export class VisboCompViewBubbleComponent implements OnInit, OnChanges {

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  @Input() activeID: string; // either VP ID of Portfolio or VC ID
  @Input() visboprojectversions: VisboProjectVersion[];
  @Input() bubbleMode: boolean;
  @Input() combinedPerm: VGPermission;

  visbokeymetrics: VPVKeyMetricsCalc[] = [];
  currentID: string;
  deleted: boolean;

  colorMetric = [{name: 'Critical', color: 'red'}, {name: 'Warning', color: 'yellow'}, {name: 'Good', color: 'green'} ];

  metricList: Metric[];
  metricX = 0;
  metricY = 1;
  metricListFiltered = false;

  hasKMCost = false;
  hasKMDelivery = false;
  hasKMDeadline = false;
  hasKMEndDate = false;
  hasKMDeadlineDelay = false;
  hasVariant: boolean;
  countKM: number;

  vpFilter: string;
  estimateAtCompletion = 0;
  budgetAtCompletion = 0;
  chart = true;
  parentThis = this;
  graphBubbleData = [];
  graphBubbleOptions = {
      // 'chartArea':{'left':20,'top':0,'width':'100%','height':'100%'},
      'width': '100%',
      // 'title':'Key Metrics: Total Cost vs. End Date Plan vs. Base Line',
      // 'colorAxis': {'colors': ['red', 'yellow', 'green'], 'minValue': 0, 'maxValue': 2, 'legend': {'position': 'none'}},
      'vAxis': {
        'baseline': 0,
        'minValue': 20,
        'maxValue': 200,
        'direction': -1,
        'format': "",
        'title': 'Change in End Date (weeks)',
        'baselineColor': 'blue'
      },
      'hAxis': {
        'minValue': 20,
        'maxValue': 200,
        'baseline': 1,
        'direction': -1,
        'format': "# '%'",
        'title': 'Total Cost',
        'baselineColor': 'blue'
      },
      'sizeAxis': {
        'minValue': 20,
        'maxValue': 200
      },
      // 'chartArea':{'left':20,'top':30,'width':'100%','height':'90%'},
      'explorer': {
        'actions': ['dragToZoom', 'rightClickToReset'],
        'maxZoomIn': .01
      },
      'bubble': {
        'textStyle': {
          'auraColor': 'none',
          'fontSize': 13
        }
      },
      'tooltip': {
        'showColorCode': false
      },
      'series': {
        'Critical': {
          'color': this.colorMetric[0].color
        },
        'Warning': {
          'color': this.colorMetric[1].color
        },
        'Good': {
          'color': this.colorMetric[2].color
        }
      }
    };
  graphBubbleLabelX: string;
  graphBubbleLabelY: string;
  currentLang: string;

  sortAscending: boolean;
  sortColumn = 6;

  permVC = VGPVC;
  permVP = VGPVP;

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.log(`Init KeyMetrics`);
    this.metricList = [
      {
        name: this.translate.instant('compViewBubble.metric.costName'),
        metric: 'Costs',
        axis: this.translate.instant('compViewBubble.metric.costAxis'),
        bubble: this.translate.instant('compViewBubble.metric.costBubble'),
        table: this.translate.instant('compViewBubble.metric.costTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.endDateName'),
        metric: 'EndDate',
        axis: this.translate.instant('compViewBubble.metric.endDateAxis'),
        bubble: this.translate.instant('compViewBubble.metric.endDateBubble'),
        table: this.translate.instant('compViewBubble.metric.endDateTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deadlineName'),
        metric: 'Deadlines',
        axis: this.translate.instant('compViewBubble.metric.deadlineAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deadlineBubble'),
        table: this.translate.instant('compViewBubble.metric.deadlineTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayName'),
        metric: 'DeadlinesFinishedDelay',
        axis: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayBubble'),
        table: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayName'),
        metric: 'DeadlinesUnFinishedDelay',
        axis: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayBubble'),
        table: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deliveryName'),
        metric: 'Deliveries',
        axis: this.translate.instant('compViewBubble.metric.deliveryAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deliveryBubble'),
        table: this.translate.instant('compViewBubble.metric.deliveryTable')
      }
    ];

    const view = JSON.parse(localStorage.getItem('KeyMetrics-view'));
    if (view) {
      if (view.xAxis >= 0 && view.xAxis < this.metricList.length) {
        this.metricX = view.xAxis;
      }
      if (view.yAxis >= 0 && view.yAxis < this.metricList.length) {
        this.metricY = view.yAxis;
      }
      if (view.objectID === this.currentID) {
        this.vpFilter = view.vpFilter || undefined;
        // this.vpvRefDate = view.vpvRefDate ? new Date(view.vpvRefDate) : new Date();
      }
    }
    if (this.chart != this.bubbleMode) {
      this.toggleVisboChart();
    }
    this.visboKeyMetricsCalc();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Delivery on Changes  ${this.activeID}, Changes: ${JSON.stringify(changes)}`);
    if (this.currentID !== undefined) {
      this.visboKeyMetricsCalc();
    }
  }


  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.currentID = this.activeID;

    this.visbokeymetrics = [];
    this.countKM = 0;
    this.budgetAtCompletion = 0;
    this.estimateAtCompletion = 0;

    this.hasKMCost = false;
    this.hasKMDelivery = false;
    this.hasKMDeadline = false;
    this.hasKMDeadlineDelay = false;
    this.hasKMEndDate = false;
    this.hasVariant = false;

    if (!this.visboprojectversions) {
      return;
    }
    // this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    const vpFilter = (this.vpFilter || '').toLowerCase();
    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (!vpFilter
        || this.visboprojectversions[i].name.toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].VorlagenName || '').toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].businessUnit || '').toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].leadPerson || '').toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].description || '').toLowerCase().indexOf(vpFilter) >= 0
      ) {
        const elementKeyMetric = new VPVKeyMetricsCalc();
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric.variantName = this.visboprojectversions[i].variantName;
        elementKeyMetric.ampelStatus = this.visboprojectversions[i].ampelStatus;
        elementKeyMetric.ampelErlaeuterung = this.visboprojectversions[i].ampelErlaeuterung;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        if (this.visboprojectversions[i].keyMetrics) {
          this.countKM += 1;
          elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;

          this.hasKMCost = this.hasKMCost || elementKeyMetric.keyMetrics.costBaseLastTotal >= 0;
          this.hasKMDelivery = this.hasKMDelivery || elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal > 0;
          this.hasKMDeadline = this.hasKMDeadline || elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal > 0;
          this.hasKMDeadlineDelay = this.hasKMDeadlineDelay || elementKeyMetric.keyMetrics.timeDelayFinished != undefined || elementKeyMetric.keyMetrics.timeDelayUnFinished != undefined;
          this.hasKMEndDate = this.hasKMEndDate || elementKeyMetric.keyMetrics.endDateBaseLast.toString().length > 0;

          this.budgetAtCompletion += elementKeyMetric.keyMetrics.costBaseLastTotal || 0;
          this.estimateAtCompletion += elementKeyMetric.keyMetrics.costCurrentTotal || 0;

          // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
          if (elementKeyMetric.keyMetrics.costBaseLastTotal > 0) {
            elementKeyMetric.savingCostTotal = (elementKeyMetric.keyMetrics.costCurrentTotal || 0)
                                              / elementKeyMetric.keyMetrics.costBaseLastTotal;
          } else {
            elementKeyMetric.savingCostTotal = 1;
          }
          if (elementKeyMetric.keyMetrics.costBaseLastActual > 0) {
            elementKeyMetric.savingCostActual = (elementKeyMetric.keyMetrics.costCurrentActual || 0)
                                              / elementKeyMetric.keyMetrics.costBaseLastActual;
          } else {
            elementKeyMetric.savingCostActual = 1;
          }

          // if (elementKeyMetric.savingCostTotal > 2) elementKeyMetric.savingCostTotal = 2;
          // if (elementKeyMetric.savingCostActual > 2) elementKeyMetric.savingCostActual = 2;

          // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
          if (elementKeyMetric.keyMetrics.endDateCurrent && elementKeyMetric.keyMetrics.endDateBaseLast) {
            elementKeyMetric.savingEndDate = this.helperDateDiff(
              (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()),
              (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()), 'w') || 0;
              elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate);
          } else {
            elementKeyMetric.savingEndDate = 0;
          }

          // Calculate the Deadlines Completion
          const km = elementKeyMetric.keyMetrics;
          elementKeyMetric.timeCompletionTotal =
            this.calcPercent(km.timeCompletionCurrentTotal, elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal);
          elementKeyMetric.timeCompletionActual =
            this.calcPercent(km.timeCompletionCurrentActual, elementKeyMetric.keyMetrics.timeCompletionBaseLastActual);

          // Calculate the Delivery Completion
          elementKeyMetric.deliveryCompletionTotal =
            this.calcPercent(km.deliverableCompletionCurrentTotal, km.deliverableCompletionBaseLastTotal);
          elementKeyMetric.deliveryCompletionActual =
            this.calcPercent(km.deliverableCompletionCurrentActual, km.deliverableCompletionBaseLastActual);
        }
        this.visbokeymetrics.push(elementKeyMetric);
        if (this.visboprojectversions[i].variantName) {
          this.hasVariant = true;
        }
      }
    }
    this.sortKeyMetricsTable(undefined);
    this.thinDownMetricList();
    this.visboKeyMetricsCalcBubble();
  }

  thinDownMetricList(): void {
    let index: number;
    if (this.metricListFiltered) {
      // filter the metric list only once in the beginning, but not during filtering projects
      return;
    }
    if (!this.visbokeymetrics || this.visbokeymetrics.length === 0) {
      this.hasKMCost = false;
      this.hasKMDelivery = false;
      this.hasKMDeadline = false;
      this.hasKMDeadlineDelay = false;
      this.hasKMEndDate = false;
    }
    if (!this.hasKMCost) {
      index = this.metricList.findIndex(item => item.metric === 'Costs');
      if (index >= 0) {
        this.metricList.splice(index, 1);
      }
    }
    if (!this.hasKMEndDate) {
      index = this.metricList.findIndex(item => item.metric === 'EndDate');
      if (index >= 0) {
        this.metricList.splice(index, 1);
      }
    }
    if (!this.hasKMDelivery) {
      index = this.metricList.findIndex(item => item.metric === 'Deliveries');
      if (index >= 0) {
        this.metricList.splice(index, 1);
      }
    }
    if (!this.hasKMDeadline) {
      index = this.metricList.findIndex(item => item.metric === 'Deadlines');
      if (index >= 0) {
        this.metricList.splice(index, 1);
      }
    }
    if (!this.hasKMDeadlineDelay) {
      index = this.metricList.findIndex(item => item.metric === 'DeadlinesFinishedDelay');
      if (index >= 0) {
        this.metricList.splice(index, 1);
      }
      index = this.metricList.findIndex(item => item.metric === 'DeadlinesUnFinishedDelay');
      if (index >= 0) {
        this.metricList.splice(index, 1);
      }
    }
    if (this.metricList.length < 2) {
      this.chart = false;
      // set the X & Y Axis to values that are available
      this.metricX = this.metricList.length === 1 ? 0 : undefined;
      this.metricY = undefined;
    } else {
      // set the X & Y Axis to values that are available
      if (this.metricX >= this.metricList.length) {
        this.metricX = this.metricX === 0 ? 1 : 0;
      }
      if (this.metricY >= this.metricList.length) {
        this.metricY = this.metricY === 0 ? 1 : 0;
      }
    }
    this.metricListFiltered = true;
  }

  calcPercent(current: number, baseline: number): number {
    if (baseline === undefined) {
      return undefined;
    } else if (baseline === 0) {
      return 1;
    } else {
      return (current || 0) / baseline;
    }
  }

  isSameDay(dateA: Date, dateB: Date): boolean {
    if (!dateA || !dateB) { return false; }
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    return dateA.toISOString() === dateB.toISOString();
  }

  storeSetting(): void {
    const view = {
      'updatedAt': (new Date()).toISOString(),
      'objectID': this.currentID,
      'xAxis': this.metricX,
      'yAxis': this.metricY,
      // 'vpvRefDate': vpvRefDate ? vpvRefDate.toISOString() : undefined,
      'vpFilter': this.vpFilter
    };
    localStorage.setItem('KeyMetrics-view', JSON.stringify(view));
  }

  toggleVisboChart(): void {
    this.chart = !this.chart;
  }

  changeChart(): void {
    this.log(`Switch Chart to ${this.metricList[this.metricX].metric} vs  ${this.metricList[this.metricY].metric}`);
    this.storeSetting();
    this.visboKeyMetricsCalc();
  }

  calcLevel(value: number, type: string): number {
    let result = 0;
    if (type == "percentOver") {
      result = value <= 1 ? 1 : value > 1.05 ? 3 : 2;
    } else if (type == "percentUnder") {
      result = value >= 1 ? 1 : value < 0.8 ? 3 : 2;
    } else if (type == "delay") {
      result = value <= 0 ? 1 : value > 4 ? 3 : 2;
    }
    return result;
  }

  visboKeyMetricsCalcBubble(): void {
    this.graphBubbleAxis(); // set the Axis Description and properties

    const keyMetrics = [];
    if (!this.visbokeymetrics) {
      return;
    }
    if (this.visbokeymetrics.length > 10) {
      this.graphBubbleOptions.bubble.textStyle.fontSize = 1;
    }
    keyMetrics.push(['ID', this.graphBubbleLabelX, this.graphBubbleLabelY, 'Key Metrics Status', 'Total Cost (Base Line) in k\u20AC']);
    for (let i = 0; i < this.visbokeymetrics.length; i++) {
      if (!this.visbokeymetrics[i].keyMetrics) {
        continue;
      }
      // var colorValue = (this.visbokeymetrics[i].savingCostTotal <= 1 ? 1 : 0) +
      //                   (this.visbokeymetrics[i].savingEndDate <= 0 ? 1 : 0);
      let colorValue = 0;
      let valueX: number;
      let valueY: number;
      switch (this.getMetric('X')) {
        case 'Costs':
          valueX = Math.round(this.visbokeymetrics[i].savingCostTotal * 100);
          colorValue += valueX <= 100 ? 1 : 0;
          break;
        case 'EndDate':
          valueX = this.visbokeymetrics[i].savingEndDate;
          colorValue += valueX <= 0 ? 1 : 0;
          break;
        case 'Deadlines':
          valueX = Math.round(this.visbokeymetrics[i].timeCompletionActual * 100);
          colorValue += valueX >= 100 ? 1 : 0;
          break;
        case 'DeadlinesFinishedDelay':
          valueX = this.visbokeymetrics[i].keyMetrics.timeDelayFinished || 0;
          colorValue += valueX <= 0 ? 1 : 0;
          break;
        case 'DeadlinesUnFinishedDelay':
          valueX = this.visbokeymetrics[i].keyMetrics.timeDelayUnFinished || 0;
          colorValue += valueX <= 0 ? 1 : 0;
          break;
        case 'Deliveries':
          valueX = Math.round(this.visbokeymetrics[i].deliveryCompletionActual * 100);
          colorValue += valueX >= 100 ? 1 : 0;
          break;
      }
      switch (this.getMetric('Y')) {
        case 'Costs':
          valueY = Math.round(this.visbokeymetrics[i].savingCostTotal * 100);
          colorValue += valueY <= 100 ? 1 : 0;
          break;
        case 'EndDate':
          valueY = this.visbokeymetrics[i].savingEndDate;
          colorValue += valueY <= 0 ? 1 : 0;
          break;
        case 'Deadlines':
          valueY = Math.round(this.visbokeymetrics[i].timeCompletionActual * 100);
          colorValue += valueY >= 100 ? 1 : 0;
          break;
        case 'DeadlinesFinishedDelay':
          valueY = this.visbokeymetrics[i].keyMetrics.timeDelayFinished || 0;
          colorValue += valueY <= 0 ? 1 : 0;
          break;
        case 'DeadlinesUnFinishedDelay':
          valueY = this.visbokeymetrics[i].keyMetrics.timeDelayUnFinished || 0;
          colorValue += valueY <= 0 ? 1 : 0;
          break;
        case 'Deliveries':
          valueY = Math.round(this.visbokeymetrics[i].deliveryCompletionActual * 100);
          colorValue += valueY >= 100 ? 1 : 0;
          break;
      }

      keyMetrics.push([
        this.visbokeymetrics[i].name,
        valueX,
        valueY,
        this.colorMetric[colorValue].name,
        Math.round(this.visbokeymetrics[i].keyMetrics.costBaseLastTotal || 1)
      ]);
    }
    this.calcRangeAxis();
    this.graphBubbleData = keyMetrics;
  }

  calcRangeAxis(): void {
    let rangeAxis = 0;
    let minSize = Infinity, maxSize = 0;

    for (let i = 0; i < this.visbokeymetrics.length; i++) {
      if (!this.visbokeymetrics[i].keyMetrics) {
        continue;
      }
      minSize = Math.min(minSize, this.visbokeymetrics[i].keyMetrics.costBaseLastTotal);
      maxSize = Math.max(maxSize, this.visbokeymetrics[i].keyMetrics.costBaseLastTotal);
      switch (this.metricList[this.metricX].metric) {
        case 'Costs':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].savingCostTotal - 1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].savingEndDate));
          break;
        case 'Deadlines':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].timeCompletionActual - 1) * 100));
          break;
        case 'DeadlinesFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].keyMetrics.timeDelayFinished || 0));
          break;
        case 'DeadlinesUnFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].keyMetrics.timeDelayUnFinished || 0));
          break;
        case 'Deliveries':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].deliveryCompletionActual - 1) * 100));
          break;
      }
    }
    // Set the Min/Max Values for the Size of the bubbles decreased/increased by 20%
    // minSize = Math.max(minSize - 100, 0)
    // maxSize += 100;
    minSize *= 0.8;
    maxSize *= 1.2;
    this.graphBubbleOptions.sizeAxis.minValue = minSize;
    this.graphBubbleOptions.sizeAxis.maxValue = maxSize;

    if (this.getMetric('X') === 'EndDate'
    || this.getMetric('X') === 'DeadlinesFinishedDelay'
    || this.getMetric('X') === 'DeadlinesUnFinishedDelay') {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = -rangeAxis;
      this.graphBubbleOptions.hAxis.maxValue = rangeAxis;
    } else {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = 100 - rangeAxis;
      this.graphBubbleOptions.hAxis.maxValue = 100 + rangeAxis;
    }

    rangeAxis = 0;
    for (let i = 0; i < this.visbokeymetrics.length; i++) {
      if (!this.visbokeymetrics[i].keyMetrics) {
        continue;
      }
      switch (this.metricList[this.metricY].metric) {
        case 'Costs':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].savingCostTotal - 1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].savingEndDate));
          break;
        case 'Deadlines':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].timeCompletionActual - 1) * 100));
          break;
        case 'DeadlinesFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].keyMetrics.timeDelayFinished || 0));
          break;
        case 'DeadlinesUnFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].keyMetrics.timeDelayUnFinished || 0));
          break;
        case 'Deliveries':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].deliveryCompletionActual - 1) * 100));
          break;
      }
    }
    if (this.metricList[this.metricY].metric === 'EndDate'
    || this.metricList[this.metricY].metric === 'DeadlinesFinishedDelay'
    || this.metricList[this.metricY].metric === 'DeadlinesUnFinishedDelay') {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.vAxis.minValue = -rangeAxis;
      this.graphBubbleOptions.vAxis.maxValue = rangeAxis;
    } else {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.vAxis.minValue = 100 - rangeAxis;
      this.graphBubbleOptions.vAxis.maxValue = 100 + rangeAxis;
    }
  }

  graphBubbleAxis(): void {
    if (!this.chart) {
      return;
    }
    let metric = this.metricList[this.metricX];
    const weekFormat = '# ' + this.translate.instant('compViewBubble.lbl.weeks');
    const dayFormat = '# ' + this.translate.instant('compViewBubble.lbl.days');

    this.graphBubbleOptions.hAxis.title = metric.axis;
    switch (metric.metric) {
      case 'Costs':
        this.graphBubbleOptions.hAxis.baseline = 100;
        this.graphBubbleOptions.hAxis.direction = -1;
        this.graphBubbleOptions.hAxis.format = "# '%'";
        break;
      case 'EndDate':
        this.graphBubbleOptions.hAxis.baseline = 0;
        this.graphBubbleOptions.hAxis.direction = -1;
        this.graphBubbleOptions.hAxis.format = weekFormat;
        break;
      case 'Deadlines':
        this.graphBubbleOptions.hAxis.baseline = 100;
        this.graphBubbleOptions.hAxis.direction = 1;
        this.graphBubbleOptions.hAxis.format = "# '%'";
        break;
      case 'DeadlinesFinishedDelay':
      case 'DeadlinesUnFinishedDelay':
        this.graphBubbleOptions.hAxis.baseline = 0;
        this.graphBubbleOptions.hAxis.direction = -1;
        this.graphBubbleOptions.hAxis.format = dayFormat;
        break;
      case 'Deliveries':
        this.graphBubbleOptions.hAxis.baseline = 100;
        this.graphBubbleOptions.hAxis.direction = 1;
        this.graphBubbleOptions.hAxis.format = "# '%'";
        break;
    }
    this.graphBubbleLabelX = metric.bubble;

    metric = this.metricList[this.metricY];
    this.graphBubbleOptions.vAxis.title = metric.axis;
    switch (metric.metric) {
      case 'Costs':
        this.graphBubbleOptions.vAxis.baseline = 100;
        this.graphBubbleOptions.vAxis.direction = -1;
        this.graphBubbleOptions.vAxis.format = "# '%'";
        break;
      case 'EndDate':
        this.graphBubbleOptions.vAxis.baseline = 0;
        this.graphBubbleOptions.vAxis.direction = -1;
        this.graphBubbleOptions.vAxis.format = weekFormat;
        break;
      case 'Deadlines':
        this.graphBubbleOptions.vAxis.baseline = 100;
        this.graphBubbleOptions.vAxis.direction = 1;
        this.graphBubbleOptions.vAxis.format = "# '%'";
        break;
      case 'DeadlinesFinishedDelay':
      case 'DeadlinesUnFinishedDelay':
        this.graphBubbleOptions.vAxis.baseline = 0;
        this.graphBubbleOptions.vAxis.direction = -1;
        this.graphBubbleOptions.vAxis.format = dayFormat;
        break;
      case 'Deliveries':
        this.graphBubbleOptions.vAxis.baseline = 100;
        this.graphBubbleOptions.vAxis.direction = 1;
        this.graphBubbleOptions.vAxis.format = "# '%'";
        break;
    }
    this.graphBubbleLabelY = metric.bubble;

    // this.log(`Series: ${JSON.stringify(this.graphBubbleOptions.series)}`)
  }

  gotoClickedRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`goto VP ${vpv.name} (${vpv.vpid}) Deleted? ${this.deleted}`);
    this.storeSetting();
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  chartSelectRow(row: number, label: string): void {
    // this.log(`Bubble Chart: ${row} ${label}`);
    const vpv = this.visbokeymetrics.find(x => x.name === label);

    this.log(`Navigate to: ${vpv.vpid} ${vpv.name}`);
    this.storeSetting();
    let queryParams = {};
    if (this.deleted) { queryParams = {deleted: this.deleted.toString()} }

    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], { queryParams: queryParams });
  }

  selectedMetric(metric: string): boolean {
    let result = false;
    if (this.getMetric('X') === metric
    || this.getMetric('Y') === metric) {
      result = true;
    }
    return result;
  }

  getMetric(axis: string): string {
    let result: string;
    if (axis === 'X' && this.metricX < this.metricList.length) {
      result = this.metricList[this.metricX].name;
    } else if (axis === 'Y' && this.metricY < this.metricList.length) {
      result = this.metricList[this.metricY].name;
    }
    result = result || 'UNKNOWN';
    return result;
  }

  metricLabel(metric: string, label: string): string {
    const newMetric = this.metricList.find(item => item.metric === metric);
    let result = 'UNKNOWN';
    if (newMetric) {
      result = newMetric[label];
    }
    return result;
  }

  getLevel(plan: number, baseline: number): number {
    let percentCalc = 1
    if (baseline) {
      percentCalc = plan/baseline;
    }
    if (percentCalc <= 1) return 1;
    else if (percentCalc <= 1.05) return 2;
    else return 3;
  }

  helperDateDiff(from: string, to: string, unit: string): number {
    const fromDate: Date = new Date(from);
    const toDate: Date = new Date(to);
    let dateDiff = fromDate.getTime() - toDate.getTime();
    if (unit === 'w') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24 / 7;
    } else if (unit === 'd') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24;
    } else {
      dateDiff = dateDiff / 1000;
    }
    return dateDiff;
  }

  sortKeyMetricsTable(n: number): void {
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
      this.sortAscending = true;
    }
    if (this.sortColumn === 1) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpString(a.name, b.name); });
    } else if (this.sortColumn === 2) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.savingCostTotal - b.savingCostTotal;
      });
    } else if (this.sortColumn === 3) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.costBaseLastTotal - b.keyMetrics.costBaseLastTotal;
      });
    } else if (this.sortColumn === 4) {
      this.visbokeymetrics.sort(function(a, b) { return a.savingEndDate - b.savingEndDate; });
    } else if (this.sortColumn === 5) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.keyMetrics.endDateBaseLast, b.keyMetrics.endDateBaseLast); });
    } else if (this.sortColumn === 6) {
      this.visbokeymetrics.sort(function(a, b) { return a.timeCompletionActual - b.timeCompletionActual; });
    } else if (this.sortColumn === 7) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.timeCompletionBaseLastActual - b.keyMetrics.timeCompletionBaseLastActual;
      });
    } else if (this.sortColumn === 8) {
      this.visbokeymetrics.sort(function(a, b) { return a.deliveryCompletionActual - b.deliveryCompletionActual; });
    } else if (this.sortColumn === 9) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.deliverableCompletionBaseLastActual - b.keyMetrics.deliverableCompletionBaseLastActual;
      });
    } else if (this.sortColumn === 10) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics.timeDelayFinished || 0) - (b.keyMetrics.timeDelayFinished || 0); });
    } else if (this.sortColumn === 11) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics.timeDelayUnFinished || 0) - (b.keyMetrics.timeDelayUnFinished || 0);});
    } else if (this.sortColumn === 12) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpString(a.variantName, b.variantName); });
    } else if (this.sortColumn === 13) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortColumn === 14) {
      this.visbokeymetrics.sort(function(a, b) { return (a.ampelStatus || 0) - (b.ampelStatus || 0); });
    }

    if (!this.sortAscending) {
      this.visbokeymetrics.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompViewKeyMetrics: ' + message);
  }
}
