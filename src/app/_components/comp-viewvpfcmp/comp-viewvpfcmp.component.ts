import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VisboProjectVersion, VPVKeyMetricsCalc, VPVKeyMetrics } from '../../_models/visboprojectversion';
import { VisboSetting } from '../../_models/visbosetting';
import { VPParams, getCustomFieldDouble, getCustomFieldString, constSystemVPStatus } from '../../_models/visboproject';
import { VisboPortfolioVersion, VPFParams } from '../../_models/visboportfolio';
import { VisboCenter } from '../../_models/visbocenter';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { visboCmpString, visboCmpDate, visboIsToday, getPreView, visboGetShortText } from '../../_helpers/visbo.helper';

import {BarChartOptions} from '../../_models/_chart'

import * as XLSX from 'xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

class exportKeyMetric {
  name: string;
  timestamp: Date;
  baselineDate: Date;
  variantName: string;
  startDate: Date;
  ampelStatus: number;
  costCurrentActual: number;
  costCurrentTotal: number;
  costCurrentTotalPredict: number;
  costBaseLastActual: number;
  costBaseLastTotal: number;
  timeCompletionCurrentActual: number;
  timeCompletionCurrentTotal: number;
  timeCompletionBaseLastActual: number;
  timeCompletionBaseLastTotal: number;
  timeDelayFinished: number;
  timeDelayUnFinished: number;
  endDateCurrent: Date;
  endDateBaseLast: Date;
  deliverableCompletionCurrentActual: number;
  deliverableCompletionCurrentTotal: number;
  deliverableCompletionBaseLastActual: number;
  deliverableCompletionBaseLastTotal: number;
  deliverableDelayFinished: number;
  deliverableDelayUnFinished: number;
  savingCostTotal: number;
  savingCostTotalPredict: number;
  savingCostActual: number;
  savingEndDate: number;
  timeCompletionTotal: number;
  timeCompletionActual: number;
  deliveryCompletionTotal: number;
  deliveryCompletionActual: number;

  cmp_timestamp: Date;
  cmp_baselineDate: Date;
  cmp_variantName: string;
  cmp_startDate: Date;
  cmp_ampelStatus: number;
  cmp_costCurrentActual: number;
  cmp_costCurrentTotal: number;
  cmp_costCurrentTotalPredict: number;
  cmp_costBaseLastActual: number;
  cmp_costBaseLastTotal: number;
  cmp_timeCompletionCurrentActual: number;
  cmp_timeCompletionCurrentTotal: number;
  cmp_timeCompletionBaseLastActual: number;
  cmp_timeCompletionBaseLastTotal: number;
  cmp_timeDelayFinished: number;
  cmp_timeDelayUnFinished: number;
  cmp_endDateCurrent: Date;
  cmp_endDateBaseLast: Date;
  cmp_deliverableCompletionCurrentActual: number;
  cmp_deliverableCompletionCurrentTotal: number;
  cmp_deliverableCompletionBaseLastActual: number;
  cmp_deliverableCompletionBaseLastTotal: number;
  cmp_deliverableDelayFinished: number;
  cmp_deliverableDelayUnFinished: number;
  cmp_savingCostTotal: number;
  cmp_savingCostTotalPredict: number;
  cmp_savingCostActual: number;
  cmp_savingEndDate: number;
  cmp_timeCompletionTotal: number;
  cmp_timeCompletionActual: number;
  cmp_deliveryCompletionTotal: number;
  cmp_deliveryCompletionActual: number;

  vpid: string;
  vpvid: string;
  cmp_vpvid: string;
  ampelErlaeuterung: string;
  cmp_ampelErlaeuterung: string;
}

class Metric {
  name: string;
  metric: string;
  axis: string;
  bubble: string;
  table: string;
}

class CompareVPV {
  source: VPVKeyMetricsCalc;
  compare: VPVKeyMetricsCalc;
}

class DropDownStatus {
  name: string;
  localName: string;
}

@Component({
  selector: 'app-comp-viewvpfcmp',
  templateUrl: './comp-viewvpfcmp.component.html'
})
export class VisboCompViewVpfCmpComponent implements OnInit, OnChanges {

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private datePipe: DatePipe
  ) { }

  @Input() vcActive: VisboCenter;
  @Input() vpfActive: VisboPortfolioVersion[];
  @Input() vpvList: VisboProjectVersion[][];
  @Input() customize: VisboSetting;
  @Input() bubbleMode: boolean;
  @Input() combinedPerm: VGPermission;

  refDate: Date;
  filter: string;
  filterStrategicFit: number;
  filterRisk: number;
  filterBU: string;
  filterVPStatusIndex: number;
  dropDownVPStatus: DropDownStatus[];
  dropDownBU: string[];
  visbokeymetrics: CompareVPV[] = [];
  activeID: string; // either VP ID of Portfolio or VC ID
  deleted: boolean;
  timeoutID: NodeJS.Timeout;

  colorMetric = [{name: 'Critical', color: 'red'}, {name: 'Warning', color: 'yellow'}, {name: 'Good', color: 'green'} ];

  metricList: Metric[];
  metricX: string;
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

  countKM0: number;
  countKM1: number;
  estimateAtCompletion0 = 0;
  estimateAtCompletion1 = 0;
  budgetAtCompletion0 = 0;
  budgetAtCompletion1 = 0;
  RACSum0 = 0;
  RACSum1 = 0;
  emptyVPV = new VPVKeyMetricsCalc();

  chart = true;
  parentThis = this;

  colors = ['#458CCB', '#BDBDBD', '#F7941E'];
  graphBarData = [];
  graphBarOptions: BarChartOptions;
  defaultBarOptions: BarChartOptions = {
    // height is calculated dynamically (also in chartArea)
    // height: 800,
    chartArea: {
      left:400,
      top:40,
      // height: '80%',
      width: '90%'
    },
    // width: '100%',
    // title: 'Comparison',
    animation: {startup: true, duration: 200},
    legend: {position: 'top'},
    explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
    // curveType: 'function',
    colors: this.colors,
    seriesType: 'bars',
    isStacked: false,
    tooltip: {
      isHtml: true
    },
    vAxis: {
      format: "#"
      // ,
      // minorGridlines: {count: 0, color: 'none'}
    },
    hAxis: {
      format: '#'
      // ,
      // gridlines: {
      //   color: '#FFF',
      //   count: -1
      // }
    },
    minorGridlines: {count: 0, color: 'none'}
  };

  currentLang: string;
  orgVersion: string;
  cmpVersion: string;

  sortAscending: boolean;
  sortColumn = 6;

  permVC = VGPVC;
  permVP = VGPVP;

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.log(`Init KeyMetrics`);
    this.metricList = [
      {
        name: this.translate.instant('compViewBubbleCmp.metric.costName'),
        metric: 'Cost',
        axis: this.translate.instant('compViewBubbleCmp.metric.costAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.costBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.costTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.endDateName'),
        metric: 'EndDate',
        axis: this.translate.instant('compViewBubbleCmp.metric.endDateAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.endDateBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.endDateTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.costActualName'),
        metric: 'ActualCost',
        axis: this.translate.instant('compViewBubbleCmp.metric.costActualAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.costActualBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.costActualTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.costPredictName'),
        metric: 'CostPredict',
        axis: this.translate.instant('compViewBubbleCmp.metric.costPredictAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.costPredictBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.costPredictTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.deadlineName'),
        metric: 'Deadline',
        axis: this.translate.instant('compViewBubbleCmp.metric.deadlineAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.deadlineBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.deadlineTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.deadlineFinishedDelayName'),
        metric: 'DeadlineFinishedDelay',
        axis: this.translate.instant('compViewBubbleCmp.metric.deadlineFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.deadlineFinishedDelayBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.deadlineFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.deadlineUnFinishedDelayName'),
        metric: 'DeadlineUnFinishedDelay',
        axis: this.translate.instant('compViewBubbleCmp.metric.deadlineUnFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.deadlineUnFinishedDelayBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.deadlineUnFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.deliveryName'),
        metric: 'Delivery',
        axis: this.translate.instant('compViewBubbleCmp.metric.deliveryAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.deliveryBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.deliveryTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.deliveryFinishedDelayName'),
        metric: 'DeliveryFinishedDelay',
        axis: this.translate.instant('compViewBubbleCmp.metric.deliveryFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.deliveryFinishedDelayBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.deliveryFinishedDelayTable')
      },
      {
        name: this.translate.instant('compViewBubbleCmp.metric.deliveryUnFinishedDelayName'),
        metric: 'DeliveryUnFinishedDelay',
        axis: this.translate.instant('compViewBubbleCmp.metric.deliveryUnFinishedDelayAxis'),
        bubble: this.translate.instant('compViewBubbleCmp.metric.deliveryUnFinishedDelayBubble'),
        table: this.translate.instant('compViewBubbleCmp.metric.deliveryUnFinishedDelayTable')
      }
    ];
    this.orgVersion = this.translate.instant('compViewBubbleCmp.lbl.orgVersion');
    this.cmpVersion = this.translate.instant('compViewBubbleCmp.lbl.cmpVersion');
    this.emptyVPV.keyMetrics = new VPVKeyMetrics();

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
    const filterVPStatus = this.route.snapshot.queryParams['filterVPStatus'] || '';
    const filterVPStatusIndex = constSystemVPStatus.findIndex(item => item == filterVPStatus);
    const filterBU = this.route.snapshot.queryParams['filterBU'] || undefined;
    let filterParam = this.route.snapshot.queryParams['filterRisk'];
    const filterRisk = filterParam ? filterParam.valueOf() : undefined;
    filterParam = this.route.snapshot.queryParams['filterStrategicFit'];
    const filterStrategicFit = filterParam ? filterParam.valueOf() : undefined;
    const metricX = this.route.snapshot.queryParams['metricX'] || undefined;

    this.metricX = this.getMetric(metricX, undefined, false).metric;
    this.refDate = refDate ? new Date(refDate) : new Date();
    if (filter) {
      this.filter = filter;
    }
    this.filterBU = filterBU;
    this.filterRisk = filterRisk;
    this.filterStrategicFit = filterStrategicFit;
    this.filterVPStatusIndex = filterVPStatusIndex >= 0 ? filterVPStatusIndex + 1: undefined;
    this.initBUDropDown();
    this.initVPStateDropDown();
  }

  initFilter(vpvList: VisboProjectVersion[][]): void {
    let lastValueRisk: number;
    let lastValueSF: number;
    let lastValueVPStatus: string;
    let lastValueBU: string;
    if (!vpvList) {
      return;
    }
    vpvList.forEach(
      element => { element.forEach(item => {
        if (item.vp?.customFieldDouble) {
          if (this.filterStrategicFit === undefined) {
            const customField = getCustomFieldDouble(item.vp, '_strategicFit');
            if (customField) {
              if ( this.filterStrategicFit == undefined && lastValueSF >= 0 && customField.value != lastValueSF) {
                this.filterStrategicFit = 0;
              }
              lastValueSF = customField.value
            }
          }
          if (this.filterRisk === undefined) {
            const customField = getCustomFieldDouble(item.vp, '_risk');
            if (customField) {
              if ( this.filterRisk == undefined && lastValueRisk >= 0 && customField.value != lastValueRisk) {
                this.filterRisk = 0;
              }
              lastValueRisk = customField.value
            }
          }
        }
        if (item.vp?.customFieldString) {
          if (this.filterBU === undefined) {
            const customField = getCustomFieldString(item.vp, '_businessUnit');
            if (customField) {
              if ( this.filterBU == undefined && lastValueBU && customField.value != lastValueBU) {
                this.filterBU = '';
              }
              lastValueBU = customField.value
            }
          }
        }
        const vpStatus = item.vp?.vpStatus;
        if (vpStatus) {
          if ( this.filterVPStatusIndex == undefined && lastValueVPStatus && vpStatus != lastValueVPStatus) {
            this.filterVPStatusIndex = 0;
          }
          lastValueVPStatus = vpStatus
        }
      });
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

  initVPStateDropDown(): void {
    this.dropDownVPStatus = [];
    constSystemVPStatus.forEach(item => {
      this.dropDownVPStatus.push({name: item, localName: this.translate.instant('vpStatus.' + item)});
    });
    if (this.dropDownVPStatus.length > 1) {
      // this.dropDownVPStatus.sort(function(a, b) { return visboCmpString(a.localName.toLowerCase(), b.localName.toLowerCase()); });
      this.dropDownVPStatus.unshift({name: undefined, localName: this.translate.instant('compViewBoard.lbl.all')});
    } else {
      this.dropDownVPStatus = undefined;
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

  filterEventVPStatus(index: number): void {
    if (index <= 0 || index >= this.dropDownVPStatus.length) {
      this.filterVPStatusIndex = 0;
    } else {
      this.filterVPStatusIndex = index;
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
      queryParams.filterVPStatus = this.getVPStatus(false);
      localStorage.setItem('vpfFilterVPSStatus', this.getVPStatus(false) || '');
      queryParams.filterBU = this.filterBU;
      localStorage.setItem('vpfFilterBU', this.filterBU || '');
      queryParams.filterRisk = this.filterRisk > 0 ? this.filterRisk.toString() : undefined;
      localStorage.setItem('vpfFilterRisk', (this.filterRisk || 0).toString());
      queryParams.filterStrategicFit = this.filterStrategicFit > 0 ? this.filterStrategicFit.toString() : undefined;
      localStorage.setItem('vpfFilterStrategicFit', (this.filterStrategicFit || 0).toString());
    } else if (type == 'metricX') {
      queryParams.metricX = this.metricX;
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  calcVPVKeyMetric(vpv: VisboProjectVersion): VPVKeyMetricsCalc {
    const elementKeyMetric = new VPVKeyMetricsCalc();
    if (vpv.vp?.vpType != 0) {
      return undefined;
    }
    const filter = (this.filter || '').toLowerCase();
    if (filter
      && !((vpv.vp?.name || vpv.name).toLowerCase().indexOf(filter) >= 0
        || (vpv.VorlagenName || '').toLowerCase().indexOf(filter) >= 0
      )
    ) {
      return undefined;
    }
    if (this.filterVPStatusIndex > 0) {
      const setting = vpv.vp.vpStatus;
      if (setting !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
        return undefined;
      }
    }
    if (this.filterBU) {
      const setting = getCustomFieldString(vpv.vp, '_businessUnit');
      if (setting && setting.value !== this.filterBU) {
        return undefined;
      }
    }
    if (this.filterRisk >= 0) {
      const setting = getCustomFieldDouble(vpv.vp, '_risk');
      if (setting && setting.value < this.filterRisk) {
        return undefined;
      }
    }
    if (this.filterStrategicFit >= 0) {
      const setting = getCustomFieldDouble(vpv.vp, '_strategicFit');
      if (setting && setting.value < this.filterStrategicFit) {
        return undefined;
      }
    }
    elementKeyMetric.name = vpv.name;
    elementKeyMetric.vp = vpv.vp;
    elementKeyMetric.variantName = vpv.variantName;
    elementKeyMetric.ampelStatus = vpv.ampelStatus;
    elementKeyMetric.ampelErlaeuterung = vpv.ampelErlaeuterung;
    elementKeyMetric._id = vpv._id;
    elementKeyMetric.vpid = vpv.vpid;
    elementKeyMetric.timestamp = vpv.timestamp;
    elementKeyMetric.Erloes = vpv.Erloes;
    if (vpv.keyMetrics) {
      elementKeyMetric.keyMetrics = vpv.keyMetrics;

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
          elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate * 10) / 10;
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
    if (vpv.variantName) {
      this.hasVariant = true;
    }
    return elementKeyMetric;
  }

  convertMinVPVKeyMetric(element: VPVKeyMetricsCalc): VPVKeyMetricsCalc {
    const elementKeyMetric = new VPVKeyMetricsCalc();
    elementKeyMetric.name = element.name;
    elementKeyMetric.vp = element.vp;
    elementKeyMetric.variantName = element.variantName;
    elementKeyMetric.vpid = element.vpid;
    return elementKeyMetric;
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List

    this.visbokeymetrics = [];
    this.countKM0 = 0;
    this.countKM1 = 0;
    this.budgetAtCompletion0 = 0;
    this.budgetAtCompletion1 = 0;
    this.estimateAtCompletion0 = 0;
    this.estimateAtCompletion1 = 0;
    this.RACSum0 = 0;
    this.RACSum1 = 0;

    this.hasKMCost = false;
    this.hasKMCostPredict = false;
    this.hasKMDelivery = false;
    this.hasKMDeadline = false;
    this.hasKMDeadlineDelay = false;
    this.hasKMDeliveryDelay = false;
    this.hasKMEndDate = false;
    this.hasVariant = false;

    if (!this.vpvList) {
      return;
    }
    // this.log(`calc keyMetrics LEN ${this.vpvList[0].length}`);
    const refList: number[] = []
    this.initFilter(this.vpvList);
    // add all original vpvs with calculated KeyMetrics to the list
    for (let index = 0; index < this.vpvList[0].length; index++) {
      const item = this.vpvList[0][index];
      const element = this.calcVPVKeyMetric(item);
      if (element) {
        const itemMin = new CompareVPV();
        itemMin.source = element;
        itemMin.compare = this.convertMinVPVKeyMetric(element);
        this.visbokeymetrics.push(itemMin);
        refList[element.vpid] = this.visbokeymetrics.length - 1;
        this.RACSum0 += element.Erloes || 0;
      }
      if (item.keyMetrics) {
        this.countKM0 += 1;
        this.estimateAtCompletion0 += item.keyMetrics.costCurrentTotal || 0;
        this.budgetAtCompletion0 += item.keyMetrics.costBaseLastTotal || 0;
      }
    }
    // merge all compare vpvs with calculated KeyMetrics to the list
    for (let index = 0; index < this.vpvList[1].length; index++) {
      const item = this.vpvList[1][index];
      const element = this.calcVPVKeyMetric(item);
      if (element) {
        const indexVP = refList[element.vpid];
        if (indexVP >= 0) {
          // element exists from original VPF update the second part
          this.visbokeymetrics[indexVP].compare = element;
        } else {
          // element does not exists in original VPF add empty part and the element
          const itemMin = new CompareVPV();
          itemMin.source = this.convertMinVPVKeyMetric(element);
          itemMin.compare = element;
          this.visbokeymetrics.push(itemMin);
          refList[element.vpid] = this.visbokeymetrics.length - 1;
          this.RACSum1 += element.Erloes || 0;
        }
      }
      if (item.keyMetrics) {
        this.countKM1 += 1;
        this.estimateAtCompletion1 += item.keyMetrics.costCurrentTotal || 0;
        this.budgetAtCompletion1 += item.keyMetrics.costBaseLastTotal || 0;
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
    this.metricX = this.getMetric(this.metricX, undefined, true).metric;
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
    this.log(`Switch Chart to ${this.metricX} `);
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
    let vpv: VPVKeyMetricsCalc;
    let costBaseLastTotal = 0;

    const keyMetricsBar = [];
    if (!this.visbokeymetrics || this.visbokeymetrics.length == 0) {
      return;
    }
    for (let item = 0; item < this.visbokeymetrics.length; item++) {
      if (!this.visbokeymetrics[item].source.keyMetrics) {
        vpv = this.emptyVPV;
      } else {
        vpv = this.visbokeymetrics[item].source;
      }
      let valueX: number;
      let valueY: number;
      costBaseLastTotal = Math.max(costBaseLastTotal, Math.round(vpv.keyMetrics?.costBaseLastTotal || 0) || 1);
      switch (this.metricX) {
        case 'Cost':
          valueX = Math.round((vpv.savingCostTotal || 1) * 100);
          break;
        case 'ActualCost':
          valueX = Math.round((vpv.savingCostActual || 1) * 100);
          break;
        case 'CostPredict':
          valueX = Math.round((vpv.savingCostTotalPredict || 1) * 100);
          break;
        case 'EndDate':
          valueX = Math.round((vpv.savingEndDate || 0) / 7 * 10) / 10;
          break;
        case 'Deadline':
          valueX = Math.round((vpv.timeCompletionActual || 1) * 100);
          break;
        case 'DeadlineFinishedDelay':
          valueX = Math.round((vpv.keyMetrics?.timeDelayFinished || 0) / 7 * 10) / 10;
          break;
        case 'DeadlineUnFinishedDelay':
          valueX = Math.round((vpv.keyMetrics?.timeDelayUnFinished || 0) / 7 * 10) / 10;
          break;
        case 'Delivery':
          valueX = Math.round((vpv.deliveryCompletionActual || 1) * 100);
          break;
      }

      if (!this.visbokeymetrics[item].compare.keyMetrics) {
        vpv = this.emptyVPV;
      } else {
        vpv = this.visbokeymetrics[item].compare;
      }
      switch (this.metricX) {
        case 'Cost':
          valueY = Math.round((vpv.savingCostTotal || 1) * 100);
          break;
        case 'ActualCost':
          valueY = Math.round((vpv.savingCostActual || 1) * 100);
          break;
        case 'CostPredict':
          valueY = Math.round((vpv.savingCostTotalPredict || 1) * 100);
          break;
        case 'EndDate':
          valueY = Math.round((vpv.savingEndDate || 0) / 7 * 10) / 10;
          break;
        case 'Deadline':
          valueY = Math.round((vpv.timeCompletionActual || 1) * 100);
          break;
        case 'DeadlineFinishedDelay':
          valueY = Math.round((vpv.keyMetrics?.timeDelayFinished || 0) / 7 * 10) / 10;
          break;
        case 'DeadlineUnFinishedDelay':
          valueY = Math.round((vpv.keyMetrics?.timeDelayUnFinished || 0) / 7 * 10) / 10;
          break;
        case 'Delivery':
          valueY = Math.round((vpv.deliveryCompletionActual || 1) * 100);
          break;
      }

      costBaseLastTotal = Math.max(costBaseLastTotal, Math.round(vpv.keyMetrics?.costBaseLastTotal || 0) || 1);
      let name: string;
      if (this.visbokeymetrics[item].source) {
        name = this.combineName(this.visbokeymetrics[item].source.name, this.visbokeymetrics[item].source.variantName);
      } else {
        name = this.combineName(this.visbokeymetrics[item].compare.name, this.visbokeymetrics[item].compare.variantName);
      }
      const tooltip = this.createCustomHTMLContent(name, valueX, valueY);
      keyMetricsBar.push([
        name,
        valueX,
        tooltip,
        valueY,
        tooltip
      ]);
    }
    keyMetricsBar.unshift([
      'Project',
      this.getMetric(this.metricX).table,
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.cmpVersion + ' ' + this.getMetric(this.metricX).table,
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);

    this.graphBarOptions = this.copyGraphBarOptions(this.defaultBarOptions);
    this.graphBarAxis(keyMetricsBar.length - 1); // set the Axis Description and height
    this.graphBarData = keyMetricsBar;
  }

  createCustomHTMLContent(name: string, valueX: number, valueY: number): string {

    let format = '';
    switch (this.metricX) {
      case 'Cost':
      case 'ActualCost':
      case 'CostPredict':
        format = '&nbsp' + '%';
        break;
      case 'EndDate':
      case 'DeadlineFinishedDelay':
      case 'DeadlineUnFinishedDelay':
        format = '&nbsp' + this.translate.instant('compViewBubbleCmp.lbl.weeks');
        break;
      case 'Deadline':
      case 'Delivery':
        format = '&nbsp' + '%';
        break;
    }

    let result = '<div style="padding:5px 5px 5px 5px;">' +
      '<div><b>' + name + '</b></div>' + '<div>' +
      '<table>';

    result = result + '<tr>' + '<td>' +
                this.getMetric(this.metricX).table.replace(/ /g, "&nbsp") +
                ':</td>' + '<td><b>' +
                valueX + format +
                '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' +
                this.cmpVersion +
                ':</td>' + '<td><b>' +
                valueY + format +
                '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  copyGraphBarOptions(source: BarChartOptions): BarChartOptions {
    const result = Object.assign({}, source);
    // copy also child structures
    result.chartArea = Object.assign({}, source.chartArea);
    result.hAxis = Object.assign({}, source.hAxis);
    return result;
  }

  graphBarAxis(len: number): void {
    if (!this.chart) {
      return;
    }
    const weekFormat = '# ' + this.translate.instant('compViewBubbleCmp.lbl.weeks');
    if (len > 0) {
      this.graphBarOptions.height = 100 + len * 40;
      let height = '80%'
      if (len < 3) {
        height = '30%'
      } else if (len < 6) {
        height = '50%'
      } else if (len < 12) {
        height = '60%'
      } else if (len < 24) {
        height = '70%'
      } else {
        height = '90%'
      }
      this.graphBarOptions.chartArea.height = height;
    }

    this.graphBarOptions.hAxis.title = this.getMetric(this.metricX).axis;
    switch (this.metricX) {
      case 'Cost':
      case 'ActualCost':
      case 'CostPredict':
        this.graphBarOptions.hAxis.baseline = 100;
        this.graphBarOptions.hAxis.direction = -1;
        this.graphBarOptions.hAxis.format = "# '%'";
        break;
      case 'EndDate':
      case 'DeadlineFinishedDelay':
      case 'DeadlineUnFinishedDelay':
        this.graphBarOptions.hAxis.baseline = 0;
        this.graphBarOptions.hAxis.direction = -1;
        this.graphBarOptions.hAxis.format = weekFormat;
        break;
      case 'Deadline':
      case 'Delivery':
        this.graphBarOptions.hAxis.baseline = 100;
        this.graphBarOptions.hAxis.direction = 1;
        this.graphBarOptions.hAxis.format = "# '%'";
        break;
    }

    // this.log(`Series: ${JSON.stringify(this.graphBarOptions.series)}`)
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
    const calcPredict = this.route.snapshot.queryParams['calcPredict'] ? true : false;
    if (calcPredict) {
      queryParams.calcPredict = '1';
    }

    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], {
      queryParams: queryParams
    });
  }


  chartSelectRow(row: number, label: string): void {
    this.log(`Bar Chart: ${row} ${label} ${this.visbokeymetrics[row].source.name}`);
    let vpv = this.visbokeymetrics.find(x => x.source.name === label);
    if (!vpv) {
      // label contains a variantName
      const index = label.lastIndexOf(' ( ');
      if (index) {
        const name = label.substr(0, index);
        vpv = this.visbokeymetrics.find(x => x.source.name === name);
      }
    }
    if (vpv) {
      this.gotoClickedRow(vpv.source);
    } else {
      this.log(`VP not found ${label}`)
    }
  }

  selectedMetric(metric: string): boolean {
    let result = false;
    if (this.metricX === metric) {
      result = true;
    }
    return result;
  }

  changeMetric(item: Metric): void {
    if (item) {
      this.metricX = item.metric;
    }
    this.changeChart();
  }

  copyKeyMetrics(compareVPV: CompareVPV): exportKeyMetric {
    const element = new exportKeyMetric();
    let vpv = compareVPV.source;
    element.name = vpv.name;
    element.timestamp = vpv.timestamp;
    element.variantName = vpv.variantName;
    element.startDate = vpv.startDate;
    element.ampelStatus = vpv.ampelStatus;
    if (vpv.keyMetrics) {
      element.baselineDate = vpv.keyMetrics.baselineDate;
      element.costCurrentActual = vpv.keyMetrics.costCurrentActual && Math.round(vpv.keyMetrics.costCurrentActual * 1000) / 1000;
      element.costCurrentTotal = vpv.keyMetrics.costCurrentTotal && Math.round(vpv.keyMetrics.costCurrentTotal * 1000) / 1000;
      element.costCurrentTotalPredict = vpv.keyMetrics.costCurrentTotalPredict && Math.round(vpv.keyMetrics.costCurrentTotalPredict * 1000) / 1000;
      element.costBaseLastActual = vpv.keyMetrics.costBaseLastActual && Math.round(vpv.keyMetrics.costBaseLastActual * 1000) / 1000;
      element.costBaseLastTotal = vpv.keyMetrics.costBaseLastTotal && Math.round(vpv.keyMetrics.costBaseLastTotal * 1000) / 1000;
      element.timeCompletionCurrentActual = vpv.keyMetrics.timeCompletionCurrentActual && Math.round(vpv.keyMetrics.timeCompletionCurrentActual * 1000) / 1000;
      element.timeCompletionCurrentTotal = vpv.keyMetrics.timeCompletionCurrentTotal;
      element.timeCompletionBaseLastActual = vpv.keyMetrics.timeCompletionBaseLastActual && Math.round(vpv.keyMetrics.timeCompletionBaseLastActual * 1000) / 1000;
      element.timeCompletionBaseLastTotal = vpv.keyMetrics.timeCompletionBaseLastTotal;
      element.timeDelayFinished = vpv.keyMetrics.timeDelayFinished && Math.round(vpv.keyMetrics.timeDelayFinished * 1000) / 1000;
      element.timeDelayUnFinished = vpv.keyMetrics.timeDelayUnFinished && Math.round(vpv.keyMetrics.timeDelayUnFinished * 1000) / 1000;
      element.endDateCurrent = vpv.keyMetrics.endDateCurrent;
      element.endDateBaseLast = vpv.keyMetrics.endDateBaseLast;
      element.deliverableCompletionCurrentActual = vpv.keyMetrics.deliverableCompletionCurrentActual && Math.round(vpv.keyMetrics.deliverableCompletionCurrentActual * 1000) / 1000;
      element.deliverableCompletionCurrentTotal = vpv.keyMetrics.deliverableCompletionCurrentTotal;
      element.deliverableCompletionBaseLastActual = vpv.keyMetrics.deliverableCompletionBaseLastActual && Math.round(vpv.keyMetrics.deliverableCompletionBaseLastActual * 1000) / 1000;
      element.deliverableCompletionBaseLastTotal = vpv.keyMetrics.deliverableCompletionBaseLastTotal;
      element.deliverableDelayFinished = vpv.keyMetrics.deliverableDelayFinished && Math.round(vpv.keyMetrics.deliverableDelayFinished * 1000) / 1000;
      element.deliverableDelayUnFinished = vpv.keyMetrics.deliverableDelayUnFinished && Math.round(vpv.keyMetrics.deliverableDelayUnFinished * 1000) / 1000;
    }
    element.savingCostTotal = vpv.savingCostTotal && Math.round(vpv.savingCostTotal * 100) / 100;
    element.savingCostTotalPredict = vpv.savingCostTotalPredict && Math.round(vpv.savingCostTotalPredict * 100) / 100;
    element.savingCostActual = vpv.savingCostActual && Math.round(vpv.savingCostActual * 100) / 100;
    element.savingEndDate = vpv.savingEndDate && Math.round(vpv.savingEndDate * 100) / 100;
    element.timeCompletionTotal = vpv.timeCompletionTotal && Math.round(vpv.timeCompletionTotal * 100) / 100;
    element.timeCompletionActual = vpv.timeCompletionActual && Math.round(vpv.timeCompletionActual * 100) / 100;
    element.deliveryCompletionTotal = vpv.deliveryCompletionTotal && Math.round(vpv.deliveryCompletionTotal * 100) / 100;
    element.deliveryCompletionActual = vpv.deliveryCompletionActual && Math.round(vpv.deliveryCompletionActual * 100) / 100;
    // element.vpid = vpv.vpid;
    // element.vpvid = vpv._id;
    element.ampelErlaeuterung = vpv.ampelErlaeuterung;

    vpv = compareVPV.compare;
    element.cmp_timestamp = vpv.timestamp;
    element.cmp_variantName = vpv.variantName;
    element.cmp_startDate = vpv.startDate;
    element.cmp_ampelStatus = vpv.ampelStatus;
    if (vpv.keyMetrics) {
      element.cmp_baselineDate = vpv.keyMetrics.baselineDate;
      element.cmp_costCurrentActual = vpv.keyMetrics.costCurrentActual && Math.round(vpv.keyMetrics.costCurrentActual * 1000) / 1000;
      element.cmp_costCurrentTotal = vpv.keyMetrics.costCurrentTotal && Math.round(vpv.keyMetrics.costCurrentTotal * 1000) / 1000;
      element.cmp_costCurrentTotalPredict = vpv.keyMetrics.costCurrentTotalPredict && Math.round(vpv.keyMetrics.costCurrentTotalPredict * 1000) / 1000;
      element.cmp_costBaseLastActual = vpv.keyMetrics.costBaseLastActual && Math.round(vpv.keyMetrics.costBaseLastActual * 1000) / 1000;
      element.cmp_costBaseLastTotal = vpv.keyMetrics.costBaseLastTotal && Math.round(vpv.keyMetrics.costBaseLastTotal * 1000) / 1000;
      element.cmp_timeCompletionCurrentActual = vpv.keyMetrics.timeCompletionCurrentActual && Math.round(vpv.keyMetrics.timeCompletionCurrentActual * 1000) / 1000;
      element.cmp_timeCompletionCurrentTotal = vpv.keyMetrics.timeCompletionCurrentTotal;
      element.cmp_timeCompletionBaseLastActual = vpv.keyMetrics.timeCompletionBaseLastActual && Math.round(vpv.keyMetrics.timeCompletionBaseLastActual * 1000) / 1000;
      element.cmp_timeCompletionBaseLastTotal = vpv.keyMetrics.timeCompletionBaseLastTotal;
      element.cmp_timeDelayFinished = vpv.keyMetrics.timeDelayFinished && Math.round(vpv.keyMetrics.timeDelayFinished * 1000) / 1000;
      element.cmp_timeDelayUnFinished = vpv.keyMetrics.timeDelayUnFinished && Math.round(vpv.keyMetrics.timeDelayUnFinished * 1000) / 1000;
      element.cmp_endDateCurrent = vpv.keyMetrics.endDateCurrent;
      element.cmp_endDateBaseLast = vpv.keyMetrics.endDateBaseLast;
      element.cmp_deliverableCompletionCurrentActual = vpv.keyMetrics.deliverableCompletionCurrentActual && Math.round(vpv.keyMetrics.deliverableCompletionCurrentActual * 1000) / 1000;
      element.cmp_deliverableCompletionCurrentTotal = vpv.keyMetrics.deliverableCompletionCurrentTotal;
      element.cmp_deliverableCompletionBaseLastActual = vpv.keyMetrics.deliverableCompletionBaseLastActual && Math.round(vpv.keyMetrics.deliverableCompletionBaseLastActual * 1000) / 1000;
      element.cmp_deliverableCompletionBaseLastTotal = vpv.keyMetrics.deliverableCompletionBaseLastTotal;
      element.cmp_deliverableDelayFinished = vpv.keyMetrics.deliverableDelayFinished && Math.round(vpv.keyMetrics.deliverableDelayFinished * 1000) / 1000;
      element.cmp_deliverableDelayUnFinished = vpv.keyMetrics.deliverableDelayUnFinished && Math.round(vpv.keyMetrics.deliverableDelayUnFinished * 1000) / 1000;
    }
    element.cmp_savingCostTotal = vpv.savingCostTotal && Math.round(vpv.savingCostTotal * 100) / 100;
    element.cmp_savingCostTotalPredict = vpv.savingCostTotalPredict && Math.round(vpv.savingCostTotalPredict * 100) / 100;
    element.cmp_savingCostActual = vpv.savingCostActual && Math.round(vpv.savingCostActual * 100) / 100;
    element.cmp_savingEndDate = vpv.savingEndDate && Math.round(vpv.savingEndDate * 100) / 100;
    element.cmp_timeCompletionTotal = vpv.timeCompletionTotal && Math.round(vpv.timeCompletionTotal * 100) / 100;
    element.cmp_timeCompletionActual = vpv.timeCompletionActual && Math.round(vpv.timeCompletionActual * 100) / 100;
    element.cmp_deliveryCompletionTotal = vpv.deliveryCompletionTotal && Math.round(vpv.deliveryCompletionTotal * 100) / 100;
    element.cmp_deliveryCompletionActual = vpv.deliveryCompletionActual && Math.round(vpv.deliveryCompletionActual * 100) / 100;
    // element.cmp_vpid = vpv.vpid;
    // element.cmp_vpvid = vpv._id;
    element.cmp_ampelErlaeuterung = vpv.ampelErlaeuterung;

    return element;
  }

  exportExcel(): void {
    this.log(`Export Data to Excel ${this.visbokeymetrics?.length}`);

    const excel: exportKeyMetric[] = [];

    if (this.visbokeymetrics) {
      this.visbokeymetrics.forEach(element => {
        excel.push(this.copyKeyMetrics(element));
      });
    }
    const len = excel.length;
    const width = Object.keys(excel[0]).length;
    let name = '';
    if (this.vpfActive && this.vpfActive[0]) {
      name = this.vpfActive[0].name
    } else if (this.vcActive) {
      name = this.vcActive.name;
    }
    // Add Localised header to excel
    // eslint-disable-next-line
    const header: any = {};
    let colName: number, colIndex = 0;
    for (const element in excel[0]) {
      if (element == 'name') {
        colName = colIndex;
      }
      colIndex++;
      header[element] = element;
      // header[element] = this.translate.instant('compViewBubbleCmp.lbl.'.concat(element))
    }
    excel.unshift(header);
    // this.log(`Header for Excel: ${JSON.stringify(header)}`)

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
    // generate link for VP Name
    const tooltip = this.translate.instant('vpKeyMetric.msg.viewWeb');
    for (let index = 1; index <= len; index++) {
      const address = XLSX.utils.encode_cell({r: index, c: colName});
      const url = window.location.origin.concat('/vpKeyMetrics/', this.visbokeymetrics[index - 1].source.vpid);
      worksheet[address].l = { Target: url, Tooltip: tooltip };
    }
    const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
    worksheet['!autofilter'] = { ref: matrix };
    // eslint-disable-next-line
    const sheets: any = {};
    const sheetName = visboGetShortText(name, 30);
    sheets[sheetName] = worksheet;
    const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [sheetName] };
    // eslint-disable-next-line
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const actDate = new Date();
    const fileName = ''.concat(
      actDate.getFullYear().toString(),
      '_',
      (actDate.getMonth() + 1).toString().padStart(2, "0"),
      '_',
      actDate.getDate().toString().padStart(2, "0"),
      '_Cockpit ',
      (name || '')
    );

    const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName.concat(EXCEL_EXTENSION);
    this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    a.click();
    window.URL.revokeObjectURL(url);
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

  getVPStatus(local: boolean): string {
    if (!this.dropDownVPStatus) {
      return undefined;
    }
    let result = this.dropDownVPStatus[0];
    if (this.dropDownVPStatus && this.filterVPStatusIndex >= 0 && this.filterVPStatusIndex < this.dropDownVPStatus.length) {
      result = this.dropDownVPStatus[this.filterVPStatusIndex];
    }
    if (local) {
      return result.localName;
    } else {
      return result.name;
    }
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

  getTimestampTooltip(vpv: VisboProjectVersion): string {
    if (!vpv) return '';
    let title = this.translate.instant('vpKeyMetric.lbl.plan')
              + ': '
              + this.datePipe.transform(vpv.timestamp, 'dd.MM.yy HH:mm');
    if (vpv.keyMetrics && vpv.keyMetrics.baselineDate) {
      title = title
            + ', ' + this.translate.instant('vpKeyMetric.lbl.pfvVariant')
            + ': '
            + this.datePipe.transform(vpv.keyMetrics.baselineDate, 'dd.MM.yy HH:mm');
    }
    return title;
  }

  sortKeyMetricsTable(n: number): void {
    this.log(`Sort KeyMetrics Col: ${n} Len ${this.visbokeymetrics?.length}`);

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
      this.visbokeymetrics.sort(function(a, b) {
        return visboCmpString(a.source?.name, b.source?.name);
      });
    } else if (this.sortColumn === 2) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.source?.savingCostTotal || 0) - (b.source?.savingCostTotal || 0);
      });
    } else if (this.sortColumn === 3) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.source?.keyMetrics?.costBaseLastTotal || 0) - (b.source?.keyMetrics?.costBaseLastTotal || 0);
      });
    } else if (this.sortColumn === 4) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.savingEndDate || 0) - (b.source?.savingEndDate || 0); });
    } else if (this.sortColumn === 5) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.source?.keyMetrics?.endDateBaseLast, b.source?.keyMetrics?.endDateBaseLast); });
    } else if (this.sortColumn === 6) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.timeCompletionActual || 0) - (b.source?.timeCompletionActual || 0); });
    } else if (this.sortColumn === 7) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.source?.keyMetrics?.timeCompletionBaseLastActual || 0) - (b.source?.keyMetrics?.timeCompletionBaseLastActual || 0);
      });
    } else if (this.sortColumn === 8) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.deliveryCompletionActual || 0) - (b.source?.deliveryCompletionActual || 0); });
    } else if (this.sortColumn === 9) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.source?.keyMetrics?.deliverableCompletionBaseLastActual || 0) - (b.source?.keyMetrics?.deliverableCompletionBaseLastActual || 0);
      });
    } else if (this.sortColumn === 10) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.keyMetrics?.timeDelayFinished || 0) - (b.source?.keyMetrics?.timeDelayFinished || 0); });
    } else if (this.sortColumn === 11) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.keyMetrics?.timeDelayUnFinished || 0) - (b.source?.keyMetrics?.timeDelayUnFinished || 0);});
    } else if (this.sortColumn === 12) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpString(a.source?.variantName, b.source?.variantName); });
    } else if (this.sortColumn === 13) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.source?.timestamp, b.source?.timestamp); });
    } else if (this.sortColumn === 14) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.ampelStatus || 0) - (b.source?.ampelStatus || 0); });
    } else if (this.sortColumn === 15) {
      this.visbokeymetrics.sort(function(a, b) { return (a.source?.savingCostActual || 0) - (b.source?.savingCostActual || 0); });
    } else if (this.sortColumn === 16) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.source?.keyMetrics?.costBaseLastActual || 0) - (b.source?.keyMetrics?.costBaseLastActual || 0);
      });
    } else if (this.sortColumn === 17) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.source?.savingCostTotalPredict || 0) - (b.source?.savingCostTotalPredict || 0);
      });
    } else if (this.sortColumn === 31) {
      this.visbokeymetrics.sort(function(a, b) {
        return visboCmpString(a.compare?.name, b.compare?.name);
      });
    } else if (this.sortColumn === 32) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.compare?.savingCostTotal || 0) - (b.compare?.savingCostTotal || 0);
      });
    } else if (this.sortColumn === 33) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.compare?.keyMetrics?.costBaseLastTotal || 0) - (b.compare?.keyMetrics?.costBaseLastTotal || 0);
      });
    } else if (this.sortColumn === 34) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.savingEndDate || 0) - (b.compare?.savingEndDate || 0); });
    } else if (this.sortColumn === 35) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.compare?.keyMetrics?.endDateBaseLast, b.compare?.keyMetrics?.endDateBaseLast); });
    } else if (this.sortColumn === 36) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.timeCompletionActual || 0) - (b.compare?.timeCompletionActual || 0); });
    } else if (this.sortColumn === 37) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.compare?.keyMetrics?.timeCompletionBaseLastActual || 0) - (b.compare?.keyMetrics?.timeCompletionBaseLastActual || 0);
      });
    } else if (this.sortColumn === 38) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.deliveryCompletionActual || 0) - (b.compare?.deliveryCompletionActual || 0); });
    } else if (this.sortColumn === 39) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.compare?.keyMetrics?.deliverableCompletionBaseLastActual || 0) - (b.compare?.keyMetrics?.deliverableCompletionBaseLastActual || 0);
      });
    } else if (this.sortColumn === 40) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.keyMetrics?.timeDelayFinished || 0) - (b.compare?.keyMetrics?.timeDelayFinished || 0); });
    } else if (this.sortColumn === 41) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.keyMetrics?.timeDelayUnFinished || 0) - (b.compare?.keyMetrics?.timeDelayUnFinished || 0);});
    } else if (this.sortColumn === 42) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpString(a.compare?.variantName, b.compare?.variantName); });
    } else if (this.sortColumn === 43) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(a.compare?.timestamp, b.compare?.timestamp); });
    } else if (this.sortColumn === 44) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.ampelStatus || 0) - (b.compare?.ampelStatus || 0); });
    } else if (this.sortColumn === 45) {
      this.visbokeymetrics.sort(function(a, b) { return (a.compare?.savingCostActual || 0) - (b.compare?.savingCostActual || 0); });
    } else if (this.sortColumn === 46) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.compare?.keyMetrics?.costBaseLastActual || 0) - (b.compare?.keyMetrics?.costBaseLastActual || 0);
      });
    } else if (this.sortColumn === 47) {
      this.visbokeymetrics.sort(function(a, b) {
        return (a.compare?.savingCostTotalPredict || 0) - (b.compare?.savingCostTotalPredict || 0);
      });
    } else if (this.sortColumn === 55) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.savingCostActual || 0) - (a.compare?.savingCostActual || 0)) - ((b.source?.savingCostActual || 0) - (b.compare?.savingCostActual || 0));
      });
    } else if (this.sortColumn === 52) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.savingCostTotal || 0) - (a.compare?.savingCostTotal || 0)) - ((b.source?.savingCostTotal || 0) - (b.compare?.savingCostTotal || 0));
      });
    } else if (this.sortColumn === 57) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.savingCostTotalPredict || 0) - (a.compare?.savingCostTotalPredict || 0)) - ((b.source?.savingCostTotalPredict || 0) - (b.compare?.savingCostTotalPredict || 0));
      });
    } else if (this.sortColumn === 54) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.savingEndDate || 0) - (a.compare?.savingEndDate || 0)) - ((b.source?.savingEndDate || 0) - (b.compare?.savingEndDate || 0));
      });
    } else if (this.sortColumn === 56) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.timeCompletionActual || 0) - (a.compare?.timeCompletionActual || 0)) - ((b.source?.timeCompletionActual || 0) - (b.compare?.timeCompletionActual || 0));
      });
    } else if (this.sortColumn === 51) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.keyMetrics?.timeDelayUnFinished || 0) - (a.compare?.keyMetrics?.timeDelayUnFinished || 0)) - ((b.source?.keyMetrics?.timeDelayUnFinished || 0) - (b.compare?.keyMetrics?.timeDelayUnFinished || 0));
      });
    } else if (this.sortColumn === 50) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.keyMetrics?.timeDelayFinished || 0) - (a.compare?.keyMetrics?.timeDelayFinished || 0)) - ((b.source?.keyMetrics?.timeDelayFinished || 0) - (b.compare?.keyMetrics?.timeDelayFinished || 0));
      });
    } else if (this.sortColumn === 58) {
      this.visbokeymetrics.sort(function(a, b) {
        return ((a.source?.deliveryCompletionActual || 0) - (a.compare?.deliveryCompletionActual || 0)) - ((b.source?.deliveryCompletionActual || 0) - (b.compare?.deliveryCompletionActual || 0));
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
    this.messageService.add('CompViewBubbleCmp: ' + message);
  }
}
