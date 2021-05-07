import { Component, OnInit, Input, OnChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboSetting } from '../_models/visbosetting';
import { VPFParams } from '../_models/visboportfolioversion';
import { VisboProject, VPParams, getCustomFieldDouble, getCustomFieldString } from '../_models/visboproject';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { visboCmpString, visboCmpDate, visboIsToday, getPreView } from '../_helpers/visbo.helper';

class Metric {
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

  @Input() visboprojectversions: VisboProjectVersion[];
  @Input() customize: VisboSetting;
  @Input() bubbleMode: boolean;
  @Input() combinedPerm: VGPermission;

  refDate: Date;
  filter: string;
  filterStrategicFit: number;
  filterRisk: number;
  filterBU: string;
  dropDownBU: string[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];
  activeID: string; // either VP ID of Portfolio or VC ID
  deleted: boolean;
  timeoutID: number;

  colorMetric = [{name: 'Critical', color: 'red'}, {name: 'Warning', color: 'yellow'}, {name: 'Good', color: 'green'} ];

  metricList: Metric[];
  metricX: string;
  metricY: string;
  metricListFiltered: Metric[];
  metricListSorted: Metric[];

  hasKMCost = false;
  hasKMCostPredict = false;
  hasKMDelivery = false;
  hasKMDeadline = false;
  hasKMEndDate = false;
  hasKMDeadlineDelay = false;
  hasKMDeliveryDelay = false;
  hasVariant: boolean;
  countKM: number;

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
        metric: 'Cost',
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
        name: this.translate.instant('compViewBubble.metric.costActualName'),
        metric: 'ActualCost',
        axis: this.translate.instant('compViewBubble.metric.costActualAxis'),
        bubble: this.translate.instant('compViewBubble.metric.costActualBubble'),
        table: this.translate.instant('compViewBubble.metric.costActualTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.costPredictName'),
        metric: 'CostPredict',
        axis: this.translate.instant('compViewBubble.metric.costPredictAxis'),
        bubble: this.translate.instant('compViewBubble.metric.costPredictBubble'),
        table: this.translate.instant('compViewBubble.metric.costPredictTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deadlineName'),
        metric: 'Deadline',
        axis: this.translate.instant('compViewBubble.metric.deadlineAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deadlineBubble'),
        table: this.translate.instant('compViewBubble.metric.deadlineTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayName'),
        metric: 'DeadlineFinishedDelay',
        axis: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayBubble'),
        table: this.translate.instant('compViewBubble.metric.deadlineFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayName'),
        metric: 'DeadlineUnFinishedDelay',
        axis: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayBubble'),
        table: this.translate.instant('compViewBubble.metric.deadlineUnFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deliveryName'),
        metric: 'Delivery',
        axis: this.translate.instant('compViewBubble.metric.deliveryAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deliveryBubble'),
        table: this.translate.instant('compViewBubble.metric.deliveryTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deliveryFinishedDelayName'),
        metric: 'DeliveryFinishedDelay',
        axis: this.translate.instant('compViewBubble.metric.deliveryFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deliveryFinishedDelayBubble'),
        table: this.translate.instant('compViewBubble.metric.deliveryFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubble.metric.deliveryUnFinishedDelayName'),
        metric: 'DeliveryUnFinishedDelay',
        axis: this.translate.instant('compViewBubble.metric.deliveryUnFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubble.metric.deliveryUnFinishedDelayBubble'),
        table: this.translate.instant('compViewBubble.metric.deliveryUnFinishedDelayTable')
      }
    ];

    this.initSetting();
    if (this.chart != this.bubbleMode) {
      this.toggleVisboChart();
    }
    this.visboKeyMetricsCalc();
  }

  ngOnChanges(): void {
    this.log(`Delivery on Changes  ${this.activeID}`);
    // change event happens before init, ignore
    if (this.metricList) {
      this.initSetting();
      this.visboKeyMetricsCalc();
    }
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.visboKeyMetricsCalc();
      this.timeoutID = undefined;
    }, 500);
  }

  initSetting(): void {
    this.activeID = this.route.snapshot.paramMap.get('id');
    const refDate = this.route.snapshot.queryParams['refDate'];
    const filter = this.route.snapshot.queryParams['filter'] || undefined;
    const filterBU = this.route.snapshot.queryParams['filterBU'] || undefined;
    const filterRisk = (this.route.snapshot.queryParams['filterRisk'] || '0').valueOf() || undefined;
    const filterStrategicFit = (this.route.snapshot.queryParams['filterStrategicFit'] || '0').valueOf() || undefined;
    const metricX = this.route.snapshot.queryParams['metricX'] || undefined;
    let metricY = this.route.snapshot.queryParams['metricY'] || undefined;
    if (metricX === metricY) { metricY = undefined; }

    this.metricX = this.getMetric(metricX, metricY, false).metric;
    this.metricY = this.getMetric(metricY, this.metricX, false).metric;
    this.refDate = refDate ? new Date(refDate) : new Date();
    if (filter) {
      this.filter = filter;
    }
    this.filterBU = filterBU;
    this.filterRisk = filterRisk;
    this.filterStrategicFit = filterStrategicFit;
    this.initBUDropDown();
  }

  initFilter(vpvList: VisboProjectVersion[]): void {
    if (!vpvList && vpvList.length < 1) {
      return;
    }
    vpvList.forEach( item => {
      if (item.vp?.customFieldDouble) {
        if (this.filterStrategicFit === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_strategicFit');
          if (customField) { this.filterStrategicFit = 0; }
        }
        if (this.filterRisk === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_risk');
          if (customField) { this.filterRisk = 0; }
        }
      }
    });
  }

  initBUDropDown(): void {
    const listBU = this.customize?.value?.businessUnitDefinitions;
    if (!listBU) return;
    this.dropDownBU = [];
    listBU.forEach(item => {
      this.dropDownBU.push(item.name);
    });
    if (this.dropDownBU.length > 1) {
      this.dropDownBU.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
      this.dropDownBU.unshift(this.translate.instant('compViewBoard.lbl.all'));
    } else {
      this.dropDownBU = undefined;
    }
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  filterKeyBoardEvent(event: KeyboardEvent): void {
    if (!event) { this.log('No Keyboard Event'); }
    // let keyCode = event.keyCode;
    // if (keyCode == 13) {    // return key
      this.updateUrlParam('filter', undefined)
    // }
    this.visboKeyMetricsCalc();
  }

  filterEventBU(index: number): void {
    if (index <= 0 || index >= this.dropDownBU.length) {
      this.filterBU = undefined;
    } else {
      this.filterBU = this.dropDownBU[index];
    }
    this.updateUrlParam('filter', undefined);
    this.visboKeyMetricsCalc();
  }

  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPFParams();
    if (type == 'filter') {
      queryParams.filter = this.filter;
      localStorage.setItem('vpfFilter', this.filter || '');
      queryParams.filterBU = this.filterBU;
      localStorage.setItem('vpfFilterBU', this.filterBU || '');
      queryParams.filterRisk = this.filterRisk > 0 ? this.filterRisk.toString() : undefined;
      localStorage.setItem('vpfFilterRisk', (this.filterRisk || 0).toString());
      queryParams.filterStrategicFit = this.filterStrategicFit > 0 ? this.filterStrategicFit.toString() : undefined;
      localStorage.setItem('vpfFilterStrategicFit', (this.filterStrategicFit || 0).toString());
    } else if (type == 'metricX' || type == 'metricY') {
      queryParams.metricX = this.metricX;
      queryParams.metricY = this.metricY;
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List

    this.visbokeymetrics = [];
    this.countKM = 0;
    this.budgetAtCompletion = 0;
    this.estimateAtCompletion = 0;

    this.hasKMCost = false;
    this.hasKMCostPredict = false;
    this.hasKMDelivery = false;
    this.hasKMDeadline = false;
    this.hasKMDeadlineDelay = false;
    this.hasKMDeliveryDelay = false;
    this.hasKMEndDate = false;
    this.hasVariant = false;

    if (!this.visboprojectversions) {
      return;
    }
    // this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    const filter = (this.filter || '').toLowerCase();
    this.initFilter(this.visboprojectversions);
    for (let item = 0; item < this.visboprojectversions.length; item++) {
      if (filter
        && !((this.visboprojectversions[item].vp?.name || this.visboprojectversions[item].name).toLowerCase().indexOf(filter) >= 0
          || (this.visboprojectversions[item].VorlagenName || '').toLowerCase().indexOf(filter) >= 0
          || (this.visboprojectversions[item].leadPerson || '').toLowerCase().indexOf(filter) >= 0
          || (this.visboprojectversions[item].description || '').toLowerCase().indexOf(filter) >= 0
          || (this.visboprojectversions[item].status || '').toLowerCase().indexOf(filter) >= 0
        )
      ) {
        continue;
      }
      if (this.filterBU) {
        const setting = getCustomFieldString(this.visboprojectversions[item].vp, '_businessUnit');
        if (setting && setting.value !== this.filterBU) {
          continue;
        }
      }
      if (this.filterRisk >= 0) {
        const setting = getCustomFieldDouble(this.visboprojectversions[item].vp, '_risk');
        if (setting && setting.value < this.filterRisk) {
          continue;
        }
      }
      if (this.filterStrategicFit >= 0) {
        const setting = getCustomFieldDouble(this.visboprojectversions[item].vp, '_strategicFit');
        if (setting && setting.value < this.filterStrategicFit) {
          continue;
        }
      }
      const elementKeyMetric = new VPVKeyMetricsCalc();
      elementKeyMetric.name = this.visboprojectversions[item].name;
      elementKeyMetric.variantName = this.visboprojectversions[item].variantName;
      elementKeyMetric.ampelStatus = this.visboprojectversions[item].ampelStatus;
      elementKeyMetric.ampelErlaeuterung = this.visboprojectversions[item].ampelErlaeuterung;
      elementKeyMetric._id = this.visboprojectversions[item]._id;
      elementKeyMetric.vpid = this.visboprojectversions[item].vpid;
      elementKeyMetric.timestamp = this.visboprojectversions[item].timestamp;
      if (this.visboprojectversions[item].keyMetrics) {
        this.countKM += 1;
        elementKeyMetric.keyMetrics = this.visboprojectversions[item].keyMetrics;

        this.hasKMCost = this.hasKMCost || elementKeyMetric.keyMetrics.costBaseLastTotal >= 0;
        this.hasKMCostPredict = this.hasKMCostPredict || elementKeyMetric.keyMetrics.costCurrentTotalPredict >= 0;
        this.hasKMDelivery = this.hasKMDelivery || elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal > 0;
        this.hasKMDeadline = this.hasKMDeadline || elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal > 1;
        this.hasKMDeadlineDelay = (this.hasKMDeadline || elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal > 1)
                  && (this.hasKMDeadlineDelay || elementKeyMetric.keyMetrics.timeDelayFinished != undefined
                      || elementKeyMetric.keyMetrics.timeDelayUnFinished != undefined);
        this.hasKMDeliveryDelay = this.hasKMDeliveryDelay || elementKeyMetric.keyMetrics.deliverableDelayFinished != undefined
                                  || elementKeyMetric.keyMetrics.deliverableDelayUnFinished != undefined;
        this.hasKMEndDate = this.hasKMEndDate || elementKeyMetric.keyMetrics.endDateBaseLast.toString().length > 0;

        this.budgetAtCompletion += elementKeyMetric.keyMetrics.costBaseLastTotal || 0;
        this.estimateAtCompletion += elementKeyMetric.keyMetrics.costCurrentTotal || 0;

        // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
        if (elementKeyMetric.keyMetrics.costBaseLastTotal > 0) {
          elementKeyMetric.savingCostTotal = (elementKeyMetric.keyMetrics.costCurrentTotal || 0)
                                            / elementKeyMetric.keyMetrics.costBaseLastTotal;
          if (elementKeyMetric.keyMetrics.costCurrentTotalPredict > 0) {
            elementKeyMetric.savingCostTotalPredict = (elementKeyMetric.keyMetrics.costCurrentTotalPredict || 0)
                                              / elementKeyMetric.keyMetrics.costBaseLastTotal;
          }
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
            (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()), 'd') || 0;
            elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate / 7 * 10) / 10;
        } else {
          elementKeyMetric.savingEndDate = 0;
        }

        // Calculate the Deadline Completion
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
      if (this.visboprojectversions[item].variantName) {
        this.hasVariant = true;
      }
    }
    this.sortKeyMetricsTable(undefined);
    this.thinDownMetricList();
    this.visboKeyMetricsCalcBubble();
  }

  thinDownMetricList(): void {
    if (!this.metricList || this.metricListFiltered) {
      // filter the metric list only once in the beginning, but not during filtering projects
      return;
    }
    this.metricListFiltered = [];
    if (this.hasKMCost) {
      let item = this.metricList.find(item => item.metric === 'Cost');
      this.metricListFiltered.push(item);
      item = this.metricList.find(item => item.metric === 'ActualCost');
      this.metricListFiltered.push(item);
      if (this.hasKMCostPredict) {
        item = this.metricList.find(item => item.metric === 'CostPredict');
        this.metricListFiltered.push(item);
      }
    }
    if (this.hasKMEndDate) {
      const item = this.metricList.find(item => item.metric === 'EndDate');
      this.metricListFiltered.push(item);
    }
    if (this.hasKMDelivery) {
      const item = this.metricList.find(item => item.metric === 'Delivery');
      this.metricListFiltered.push(item);
    }
    if (this.hasKMDeadline) {
      const item = this.metricList.find(item => item.metric === 'Deadline');
      this.metricListFiltered.push(item);
    }
    if (this.hasKMDeadlineDelay) {
      let item = this.metricList && this.metricList.find(item => item.metric === 'DeadlineFinishedDelay');
      this.metricListFiltered.push(item);
      item = this.metricList && this.metricList.find(item => item.metric === 'DeadlineUnFinishedDelay');
      this.metricListFiltered.push(item);
    }
    if (this.hasKMDeliveryDelay) {
      let item = this.metricList && this.metricList.find(item => item.metric === 'DeliveryFinishedDelay');
      this.metricListFiltered.push(item);
      item = this.metricList && this.metricList.find(item => item.metric === 'DeliveryUnFinishedDelay');
      this.metricListFiltered.push(item);
    }

    if (this.metricListFiltered.length < 2) {
      this.chart = false;
      // set the X & Y Axis to values that are available
    }

    this.metricListSorted = [];
    this.metricListFiltered.forEach(item => this.metricListSorted.push(item))
    this.metricListSorted.sort(function(a, b) { return visboCmpString(a.name, b.name); });

    // set the X & Y Axis to values that are available
    this.metricX = this.getMetric(this.metricX, this.metricY, true).metric;
    this.metricY = this.getMetric(this.metricY, this.metricX, true).metric;
  }

  // getMetrics returns always a metric
  getMetric(name: string, exclude: string = undefined, filtered = false): Metric {
    const list = filtered ? this.metricListFiltered : this.metricList;
    if (!list) {
      return this.metricList[0];
    }
    let metric = list.find(item => item.metric === name && item.metric !== exclude);
    if (!metric) {
      metric = list.find(item => item.metric !== exclude);
    }
    if (!metric) {
      metric = list[0];
    }
    return metric;
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

  toggleVisboChart(): void {
    this.chart = !this.chart;
  }

  changeChart(): void {
    this.log(`Switch Chart to ${this.metricX} vs  ${this.metricY}`);
    this.metricY = this.getMetric(this.metricY, this.metricX, false).metric;
    this.updateUrlParam('metricX', undefined);

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
    keyMetrics.push(['ID', this.getMetric(this.metricX).bubble, this.getMetric(this.metricY).bubble, 'Key Metrics Status', 'Total Cost (Base Line) in k\u20AC']);
    for (let item = 0; item < this.visbokeymetrics.length; item++) {
      if (!this.visbokeymetrics[item].keyMetrics) {
        continue;
      }
      let colorValue = 0;
      let valueX: number;
      let valueY: number;
      switch (this.metricX) {
        case 'Cost':
          valueX = Math.round(this.visbokeymetrics[item].savingCostTotal * 100);
          colorValue += valueX <= 100 ? 1 : 0;
          break;
        case 'ActualCost':
          valueX = Math.round(this.visbokeymetrics[item].savingCostActual * 100);
          colorValue += valueX <= 100 ? 1 : 0;
          break;
        case 'CostPredict':
          valueX = Math.round(this.visbokeymetrics[item].savingCostTotalPredict * 100);
          colorValue += valueX <= 100 ? 1 : 0;
          break;
        case 'EndDate':
          valueX = Math.round(this.visbokeymetrics[item].savingEndDate / 7 * 10) / 10;
          colorValue += valueX <= 0 ? 1 : 0;
          break;
        case 'Deadline':
          valueX = Math.round(this.visbokeymetrics[item].timeCompletionActual * 100);
          colorValue += valueX >= 100 ? 1 : 0;
          break;
        case 'DeadlineFinishedDelay':
          valueX = Math.round((this.visbokeymetrics[item].keyMetrics.timeDelayFinished || 0) / 7 * 10) / 10;
          colorValue += valueX <= 0 ? 1 : 0;
          break;
        case 'DeadlineUnFinishedDelay':
          valueX = Math.round((this.visbokeymetrics[item].keyMetrics.timeDelayUnFinished || 0) / 7 * 10) / 10;
          colorValue += valueX <= 0 ? 1 : 0;
          break;
        case 'Delivery':
          valueX = Math.round(this.visbokeymetrics[item].deliveryCompletionActual * 100);
          colorValue += valueX >= 100 ? 1 : 0;
          break;
      }
      switch (this.metricY) {
        case 'Cost':
          valueY = Math.round(this.visbokeymetrics[item].savingCostTotal * 100);
          colorValue += valueY <= 100 ? 1 : 0;
          break;
        case 'ActualCost':
          valueY = Math.round(this.visbokeymetrics[item].savingCostActual * 100);
          colorValue += valueY <= 100 ? 1 : 0;
          break;
        case 'CostPredict':
          valueY = Math.round(this.visbokeymetrics[item].savingCostTotalPredict * 100);
          colorValue += valueY <= 100 ? 1 : 0;
          break;
        case 'EndDate':
          valueY = Math.round(this.visbokeymetrics[item].savingEndDate / 7 * 10) / 10;
          colorValue += valueY <= 0 ? 1 : 0;
          break;
        case 'Deadline':
          valueY = Math.round(this.visbokeymetrics[item].timeCompletionActual * 100);
          colorValue += valueY >= 100 ? 1 : 0;
          break;
        case 'DeadlineFinishedDelay':
          valueY = Math.round((this.visbokeymetrics[item].keyMetrics.timeDelayFinished || 0) / 7 * 10) / 10;
          colorValue += valueY <= 0 ? 1 : 0;
          break;
        case 'DeadlineUnFinishedDelay':
          valueY = Math.round((this.visbokeymetrics[item].keyMetrics.timeDelayUnFinished || 0) / 7 * 10) / 10;
          colorValue += valueY <= 0 ? 1 : 0;
          break;
        case 'Delivery':
          valueY = Math.round(this.visbokeymetrics[item].deliveryCompletionActual * 100);
          colorValue += valueY >= 100 ? 1 : 0;
          break;
      }

      keyMetrics.push([
        this.combineName(this.visbokeymetrics[item].name, this.visbokeymetrics[item].variantName),
        valueX,
        valueY,
        this.colorMetric[colorValue].name,
        Math.round(this.visbokeymetrics[item].keyMetrics.costBaseLastTotal || 1)
      ]);
    }
    this.calcRangeAxis();
    this.graphBubbleData = keyMetrics;
  }

  calcRangeAxis(): void {
    let rangeAxis = 0;
    let minSize = Infinity, maxSize = 0;

    for (let item = 0; item < this.visbokeymetrics.length; item++) {
      if (!this.visbokeymetrics[item].keyMetrics) {
        continue;
      }
      minSize = Math.min(minSize, this.visbokeymetrics[item].keyMetrics.costBaseLastTotal);
      maxSize = Math.max(maxSize, this.visbokeymetrics[item].keyMetrics.costBaseLastTotal);
      switch (this.metricX) {
        case 'Cost':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].savingCostTotal - 1) * 100));
          break;
        case 'ActualCost':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].savingCostActual - 1) * 100));
          break;
        case 'CostPredict':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].savingCostTotalPredict - 1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[item].savingEndDate)  / 7);
          break;
        case 'Deadline':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].timeCompletionActual - 1) * 100));
          break;
        case 'DeadlineFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].keyMetrics.timeDelayFinished || 0) / 7));
          break;
        case 'DeadlineUnFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].keyMetrics.timeDelayUnFinished || 0) / 7));
          break;
        case 'Delivery':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].deliveryCompletionActual - 1) * 100));
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

    if (this.metricX === 'EndDate'
    || this.metricX === 'DeadlineFinishedDelay'
    || this.metricX === 'DeadlineUnFinishedDelay') {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = -rangeAxis;
      this.graphBubbleOptions.hAxis.maxValue = rangeAxis;
    } else {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = 100 - rangeAxis;
      this.graphBubbleOptions.hAxis.maxValue = 100 + rangeAxis;
    }

    rangeAxis = 0;
    for (let item = 0; item < this.visbokeymetrics.length; item++) {
      if (!this.visbokeymetrics[item].keyMetrics) {
        continue;
      }
      switch (this.metricY) {
        case 'Cost':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].savingCostTotal - 1) * 100));
          break;
        case 'ActualCost':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].savingCostActual - 1) * 100));
          break;
        case 'CostPredict':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].savingCostTotalPredict - 1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[item].savingEndDate) / 7);
          break;
        case 'Deadline':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].timeCompletionActual - 1) * 100));
          break;
        case 'DeadlineFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].keyMetrics.timeDelayFinished || 0) / 7));
          break;
        case 'DeadlineUnFinishedDelay':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].keyMetrics.timeDelayUnFinished || 0) / 7));
          break;
        case 'Delivery':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[item].deliveryCompletionActual - 1) * 100));
          break;
      }
    }
    if (this.metricY === 'EndDate'
    || this.metricY === 'DeadlineFinishedDelay'
    || this.metricY === 'DeadlineUnFinishedDelay') {
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
    const weekFormat = '# ' + this.translate.instant('compViewBubble.lbl.weeks');

    this.graphBubbleOptions.hAxis.title = this.getMetric(this.metricX).axis;
    switch (this.metricX) {
      case 'Cost':
      case 'ActualCost':
      case 'CostPredict':
        this.graphBubbleOptions.hAxis.baseline = 100;
        this.graphBubbleOptions.hAxis.direction = -1;
        this.graphBubbleOptions.hAxis.format = "# '%'";
        break;
      case 'EndDate':
      case 'DeadlineFinishedDelay':
      case 'DeadlineUnFinishedDelay':
        this.graphBubbleOptions.hAxis.baseline = 0;
        this.graphBubbleOptions.hAxis.direction = -1;
        this.graphBubbleOptions.hAxis.format = weekFormat;
        break;
      case 'Deadline':
      case 'Delivery':
        this.graphBubbleOptions.hAxis.baseline = 100;
        this.graphBubbleOptions.hAxis.direction = 1;
        this.graphBubbleOptions.hAxis.format = "# '%'";
        break;
    }

    this.graphBubbleOptions.vAxis.title = this.getMetric(this.metricY).axis;
    switch (this.metricY) {
      case 'Cost':
      case 'ActualCost':
      case 'CostPredict':
        this.graphBubbleOptions.vAxis.baseline = 100;
        this.graphBubbleOptions.vAxis.direction = -1;
        this.graphBubbleOptions.vAxis.format = "# '%'";
        break;
      case 'EndDate':
      case 'DeadlineFinishedDelay':
      case 'DeadlineUnFinishedDelay':
        this.graphBubbleOptions.vAxis.baseline = 0;
        this.graphBubbleOptions.vAxis.direction = -1;
        this.graphBubbleOptions.vAxis.format = weekFormat;
        break;
      case 'Deadline':
      case 'Delivery':
        this.graphBubbleOptions.vAxis.baseline = 100;
        this.graphBubbleOptions.vAxis.direction = 1;
        this.graphBubbleOptions.vAxis.format = "# '%'";
        break;
    }

    // this.log(`Series: ${JSON.stringify(this.graphBubbleOptions.series)}`)
  }

  gotoClickedRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`goto VP ${vpv.name} (${vpv.vpid}) Deleted? ${this.deleted}`);
    const queryParams = new VPParams();
    if (this.deleted) {
      queryParams.deleted = '1';
    }
    if (vpv.variantName) {
      queryParams.variantName = vpv.variantName;
    }
    if (this.refDate && !visboIsToday(this.refDate)) {
      queryParams.refDate = this.refDate.toISOString();
    }

    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], {
      queryParams: queryParams
    });
  }


  chartSelectRow(row: number, label: string): void {
    this.log(`Bubble Chart: ${row} ${label} ${this.visbokeymetrics[row].name}`);
    let vpv = this.visbokeymetrics.find(x => x.name === label);
    if (!vpv) {
      // label contains a variantName
      const index = label.lastIndexOf(' ( ');
      if (index) {
        const name = label.substr(0, index);
        vpv = this.visbokeymetrics.find(x => x.name === name);
      }
    }
    if (vpv) {
      this.gotoClickedRow(vpv);
    } else {
      this.log(`VP not found ${label}`)
    }
  }

  selectedMetric(metric: string): boolean {
    let result = false;
    if (this.metricX === metric
    || this.metricY === metric) {
      result = true;
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

  combineName(vpName: string, variantName: string): string {
    let result = vpName || '';
    if (variantName) {
      result = result.concat(' ( ', variantName, ' ) ')
    }
    return result;
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
        return (a.keyMetrics?.costBaseLastTotal || 0) - (b.keyMetrics?.costBaseLastTotal || 0);
      });
    } else if (this.sortColumn === 4) {
      this.visbokeymetrics.sort(function(a, b) { return a.savingEndDate - b.savingEndDate; });
    } else if (this.sortColumn === 5) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.keyMetrics?.endDateBaseLast, b.keyMetrics?.endDateBaseLast); });
    } else if (this.sortColumn === 6) {
      this.visbokeymetrics.sort(function(a, b) { return a.timeCompletionActual - b.timeCompletionActual; });
    } else if (this.sortColumn === 7) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.keyMetrics?.timeCompletionBaseLastActual || 0) - (b.keyMetrics?.timeCompletionBaseLastActual || 0);
      });
    } else if (this.sortColumn === 8) {
      this.visbokeymetrics.sort(function(a, b) { return a.deliveryCompletionActual - b.deliveryCompletionActual; });
    } else if (this.sortColumn === 9) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.keyMetrics?.deliverableCompletionBaseLastActual || 0) - (b.keyMetrics?.deliverableCompletionBaseLastActual || 0);
      });
    } else if (this.sortColumn === 10) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.timeDelayFinished || 0) - (b.keyMetrics?.timeDelayFinished || 0); });
    } else if (this.sortColumn === 11) {
      this.visbokeymetrics.sort(function(a, b) { return (a.keyMetrics?.timeDelayUnFinished || 0) - (b.keyMetrics?.timeDelayUnFinished || 0);});
    } else if (this.sortColumn === 12) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpString(a.variantName, b.variantName); });
    } else if (this.sortColumn === 13) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortColumn === 14) {
      this.visbokeymetrics.sort(function(a, b) { return (a.ampelStatus || 0) - (b.ampelStatus || 0); });
    } else if (this.sortColumn === 15) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.savingCostActual - b.savingCostActual;
      });
    } else if (this.sortColumn === 16) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.keyMetrics?.costBaseLastActual || 0) - (b.keyMetrics?.costBaseLastActual || 0);
      });
    } else if (this.sortColumn === 17) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.savingCostTotalPredict - b.savingCostTotalPredict;
      });
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
    this.messageService.add('CompViewBubble: ' + message);
  }
}
