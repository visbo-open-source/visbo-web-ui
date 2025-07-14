import { Component, OnInit , Input, OnChanges }  from '@angular/core';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VisboProjectVersion, VPVKeyMetricsCalc, ExportKeyMetric } from '../../_models/visboprojectversion';
import { VisboSetting } from '../../_models/visbosetting';
import { VisboProject, VPParams, getCustomFieldDate, getCustomFieldDouble, getCustomFieldString, constSystemVPStatus } from '../../_models/visboproject';
import { VisboPortfolioVersion, VPFParams } from '../../_models/visboportfolio';
import { VisboCenter } from '../../_models/visbocenter';

import { VisboCustomUserFields } from '../../_models/visbosetting';
import { VisboUser } from '../../_models/visbouser';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { visboCmpString, visboCmpDate, visboIsToday, getPreView, visboGetShortText } from '../../_helpers/visbo.helper';
import { copyKeyMetrics } from '../../_helpers/vpv_export.helper';

import {BubbleChartOptions} from '../../_models/_chart'

import * as XLSX from 'xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

class Metric {
  name: string;
  metric: string;
  axis: string;
  bubble: string;
  table: string;
}

class DropDownStatus {
  name: string;
  localName: string;
}


@Component({
  selector: 'app-comp-view-strat-fit-risk',
  templateUrl: './comp-view-strat-fit-risk.component.html',
  styleUrls: ['./comp-view-strat-fit-risk.component.css']
})
export class CompViewStratFitRiskComponent implements OnInit, OnChanges {
 constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private datePipe: DatePipe
  ) { }

  @Input() vcActive: VisboCenter;
  @Input() vpfActive: VisboPortfolioVersion;
  @Input() visboprojectversions: VisboProjectVersion[];
  @Input() customize: VisboSetting;  
  @Input() userCustomfields: VisboCustomUserFields[];
  @Input() bubbleMode: boolean;
  @Input() combinedPerm: VGPermission;
  @Input() vcUser: Map<string, VisboUser>;

  refDate: Date;
  filter: string;
  filterStrategicFit: number;
  filterRisk: number;
  filterBU: string;
  dropDownBU: string[];
  filterVPStatusIndex: number;
  dropDownVPStatus: DropDownStatus[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];
  activeID: string; // either VP ID of Portfolio or VC ID
  deleted: boolean;
  timeoutID: ReturnType<typeof setTimeout>;

  colorMetric = [{name: 'Critical', color: 'red'}, {name: 'OK', color: 'grey'}, {name: 'Good', color: 'green'}, {name: 'Warning', color: 'yellow'} ];

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
  hasKMRAC = false;
  hasVariant: boolean;
  countKM: number;

  estimateAtCompletion = 0;
  budgetAtCompletion = 0; 
  RACSumCurrent = 0;
  RACSumBaseline = 0;
  profitCurrent = 0;
  profitBaseline = 0;
  vpProfit = 0;

  chart = true;
  parentThis = this;
  graphBubbleData = [];
  graphBubbleOptions: BubbleChartOptions;
  defaultBubbleOptions: BubbleChartOptions = {
      'chartArea':{'left':120,'top':50,'width':'100%', 'height': '80%'},
      'width': '100%',
      'height': 600,    
      'vAxis': {
        'baseline': 5,
        'minValue': -1,
        'maxValue': 11,
        'direction': -1,
        'format': "",
        'title': 'Strategic Fit',
        'baselineColor': 'blue'
      },
      'hAxis': {
        'minValue': -1,
        'maxValue': 11,
        'baseline': 5,
        'direction': -1,
        'format': "# '%'",
        'title': 'Risk',
        'baselineColor': 'blue'
      }, 
      'sizeAxis': {
        'minSize': -50,
        'maxSize': 30
      },    
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
        'showColorCode': false,
      },
      'series': {
        'Critical': {
          'color': this.colorMetric[0].color
        },
        'OK': {
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
    this.log(`Init StrategicFit - Risk - Chart`);
    this.metricList = [      
      {
        name: this.translate.instant('compViewStratRisk.metric.StratFit'),
        metric: 'StrategicFit',
        axis: this.translate.instant('compViewStratRisk.metric.StratAxis'),
        bubble: this.translate.instant('compViewStratRisk.metric.StratBubble'),
        table: this.translate.instant('compViewStratRisk.metric.StratTable')
      },
        {
        name: this.translate.instant('compViewStratRisk.metric.Risk'),
        metric: 'Risk',
        axis: this.translate.instant('compViewStratRisk.metric.RiskAxis'),
        bubble: this.translate.instant('compViewStratRisk.metric.RiskBubble'),
        table: this.translate.instant('compViewStratRisk.metric.RiskTable')
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
    const filterVPStatus = this.route.snapshot.queryParams['filterVPStatus'] || '';
    const filterVPStatusIndex = constSystemVPStatus.findIndex(item => item == filterVPStatus);
    const filterBU = this.route.snapshot.queryParams['filterBU'] || undefined;
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
    this.filterVPStatusIndex = filterVPStatusIndex >= 0 ? filterVPStatusIndex + 1: undefined;
    this.initBUDropDown();
    this.initVPStateDropDown();
    // this.initUserCustomFields();
  }

  initFilter(vpvList: VisboProjectVersion[]): void {   
    let lastValueVPStatus: string;
    let lastValueBU: string = '';
    if (!vpvList && vpvList.length < 1) {
      return;
    }
    vpvList.forEach( item => {
      if (item.vp?.customFieldDouble) {
        
      }
      if (item.vp?.customFieldString) {
        if (this.filterBU === undefined) {
          const customField = getCustomFieldString(item.vp, '_businessUnit');
          if (customField) {
            if ( this.filterBU == undefined ) {
              this.filterBU = '';
            }
            lastValueBU = customField.value
          }
        }
      }
      const vpStatus = item.vp?.vpStatus;
      if (vpStatus) {
          if ( this.filterVPStatusIndex == undefined && lastValueVPStatus ) {
          this.filterVPStatusIndex = 0;
        }
        lastValueVPStatus = vpStatus
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
    this.updateUrlParam('filter', undefined);
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
    
    this.RACSumCurrent = 0;
    this.RACSumBaseline = 0;

    this.hasKMCost = false;
    this.hasKMCostPredict = false;
    this.hasKMDelivery = false;
    this.hasKMDeadline = false;
    this.hasKMDeadlineDelay = false;
    this.hasKMDeliveryDelay = false;
    this.hasKMEndDate = false;
    this.hasKMRAC = false;
    this.hasVariant = false;

    if (!this.visboprojectversions) {
      return;
    }
    // this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    const filter = (this.filter || '').toLowerCase();
    this.initFilter(this.visboprojectversions);
    for (let item = 0; item < this.visboprojectversions.length; item++) {
      if (this.visboprojectversions[item].vp?.vpType != 0) {
        continue;
      }
      if (filter
        && !((this.visboprojectversions[item].vp?.name || this.visboprojectversions[item].name).toLowerCase().indexOf(filter) >= 0
          || (this.visboprojectversions[item].VorlagenName || '').toLowerCase().indexOf(filter) >= 0
          || (this.getVPManager(this.visboprojectversions[item].vp) || '').toLowerCase().indexOf(filter) >= 0
          || (this.visboprojectversions[item].description || '').toLowerCase().indexOf(filter) >= 0
        )
      ) {
        continue;
      }
      if (this.filterVPStatusIndex > 0) {
        const setting = this.visboprojectversions[item].vp.vpStatus;
        if (setting !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
          continue;
        }
      }
      if (this.filterBU) {
        const setting = getCustomFieldString(this.visboprojectversions[item].vp, '_businessUnit');
        if (!setting) continue;
        if (setting.value !== this.filterBU) {
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
      elementKeyMetric.vp = this.visboprojectversions[item].vp;
      elementKeyMetric.vpStatus = elementKeyMetric.vp.vpStatus;
      elementKeyMetric.vpStatusLocale = elementKeyMetric.vp.vpStatusLocale;
      elementKeyMetric.startDate = this.visboprojectversions[item].startDate;
      elementKeyMetric.endDate = this.visboprojectversions[item].endDate;
      elementKeyMetric.timestamp = this.visboprojectversions[item].timestamp;
      elementKeyMetric.Erloes = this.visboprojectversions[item].Erloes;
      elementKeyMetric.customDblFields = this.visboprojectversions[item].customDblFields;
      elementKeyMetric.customStringFields = this.visboprojectversions[item].customStringFields;
      elementKeyMetric.customBoolFields = this.visboprojectversions[item].customBoolFields;
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

        this.hasKMRAC = this.hasKMRAC || elementKeyMetric.keyMetrics.RACBaseLast != undefined || elementKeyMetric.keyMetrics.RACBaseLast > 0;

        this.budgetAtCompletion += elementKeyMetric.keyMetrics.costBaseLastTotal || 0;
        this.estimateAtCompletion += elementKeyMetric.keyMetrics.costCurrentTotal || 0;

        // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
        if (elementKeyMetric.keyMetrics.costBaseLastTotal > 0) {
          elementKeyMetric.savingCostTotal = (elementKeyMetric.keyMetrics.costCurrentTotal || 0)
                                            / elementKeyMetric.keyMetrics.costBaseLastTotal;
          if (elementKeyMetric.keyMetrics.costCurrentTotalPredict > 0) {
            elementKeyMetric.savingCostTotalPredict = (elementKeyMetric.keyMetrics.costCurrentTotalPredict || 0)
                                              / elementKeyMetric.keyMetrics.costCurrentTotal;
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
        if (elementKeyMetric.keyMetrics.RACBaseLast && elementKeyMetric.keyMetrics.RACBaseLast > 0) {
          elementKeyMetric.savingRAC = (elementKeyMetric.keyMetrics.RACCurrent || 0)
                                      / elementKeyMetric.keyMetrics.RACBaseLast;
        }
        if (!elementKeyMetric.keyMetrics.RACBaseLast && elementKeyMetric.Erloes > 0 ) {
          elementKeyMetric.savingRAC = (elementKeyMetric.Erloes || 0)
                                      / elementKeyMetric.Erloes;
        }

        // Calculate Saving EndDate in number of days related to BaseLine, limit the results to be between -20 and 20
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
          
        this.RACSumCurrent += elementKeyMetric.keyMetrics.RACCurrent || elementKeyMetric.Erloes|| 0;
        this.RACSumBaseline += elementKeyMetric.keyMetrics.RACBaseLast || elementKeyMetric.Erloes||0;

      } else {  
        this.RACSumCurrent += 0;
        this.RACSumBaseline += 0;      
      }
      
      this.visbokeymetrics.push(elementKeyMetric);
      if (this.visboprojectversions[item].variantName) {
        this.hasVariant = true;
      }
    }

    this.profitBaseline = this.RACSumBaseline - this.budgetAtCompletion;
    this.profitCurrent = this.RACSumCurrent - this.estimateAtCompletion;
    this.visboKeyMetricsCalcBubble();
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
    if (!metric && list.length > 0) {
      metric = list[0];
    }
    // if nothing is found, set to endDate
    if (!metric) {
      metric = this.metricList.find(item => item.metric == 'EndDate');
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
    this.graphBubbleOptions = Object.assign({}, this.defaultBubbleOptions);
    this.graphBubbleAxis(); // set the Axis Description and properties

    const keyMetrics = [];
    if (!this.visbokeymetrics) {
      return;
    }
    if (this.visbokeymetrics.length > 10) {
      this.graphBubbleOptions.bubble.textStyle.fontSize = 10;
    } else {
      this.graphBubbleOptions.bubble.textStyle.fontSize = 13;
    }
    keyMetrics.push(['ID', this.getMetric(this.metricX).bubble, this.getMetric(this.metricY).bubble, 'Key Metrics Status','Profit/Loss in T\u20AC']);
    for (let item = 0; item < this.visbokeymetrics.length; item++) {
      // a project without any baseline but with strategicFit and risk values will be shown in the chart as well
      // if (!this.visbokeymetrics[item].keyMetrics) {
      //   continue;
      // }    
      let colorValue = 0;
      let valueX: number;
      let valueY: number;
      this.vpProfit = 0;
      switch (this.metricX) {
       
        case 'StrategicFit':
          const customFieldStrat = getCustomFieldDouble(this.visbokeymetrics[item].vp, '_strategicFit');
          if (customFieldStrat) {
            valueX = customFieldStrat.value;
          } else {
            valueX = 0;
          }; 
          if (this.visbokeymetrics[item].keyMetrics) {
              if (!this.visbokeymetrics[item].keyMetrics.RACCurrent) {
                this.visbokeymetrics[item].keyMetrics.RACCurrent = 0
              }
               if (!this.visbokeymetrics[item].keyMetrics.costCurrentTotal) {
                this.visbokeymetrics[item].keyMetrics.costCurrentTotal = 0
              }
              this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent - this.visbokeymetrics[item].keyMetrics.costCurrentTotal;
          }               
          colorValue = this.getProfitCategory(this.vpProfit);  
          break;
        case 'Risk':
          const customFieldRisk = getCustomFieldDouble(this.visbokeymetrics[item].vp, '_risk');
          if (customFieldRisk) {
              valueX = customFieldRisk.value;
          } else {
            valueX = 0;
          };     
          if (this.visbokeymetrics[item].keyMetrics) {
            if (!this.visbokeymetrics[item].keyMetrics.RACCurrent) {
              this.visbokeymetrics[item].keyMetrics.RACCurrent = 0
            }
              if (!this.visbokeymetrics[item].keyMetrics.costCurrentTotal) {
              this.visbokeymetrics[item].keyMetrics.costCurrentTotal = 0
            }
            this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent - this.visbokeymetrics[item].keyMetrics.costCurrentTotal;
          }                       
          // if (this.visbokeymetrics[item].keyMetrics && (this.visbokeymetrics[item].keyMetrics.RACCurrent >= 0) && (this.visbokeymetrics[item].keyMetrics.costCurrentTotal) >=  0 ){
          //   this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent- this.visbokeymetrics[item].keyMetrics.costCurrentTotal;  
          // }   else {
          //   this.vpProfit = 0
          // }
          colorValue = this.getProfitCategory(this.vpProfit);   
          break;
      }
      switch (this.metricY) {
        
        case 'StrategicFit':
          const customFieldStrat = getCustomFieldDouble(this.visbokeymetrics[item].vp, '_strategicFit');
          if (customFieldStrat) {
            valueY = customFieldStrat.value;
          } else {
            valueY = 0;
          };
          if (this.visbokeymetrics[item].keyMetrics) {
            if (!this.visbokeymetrics[item].keyMetrics.RACCurrent) {
              this.visbokeymetrics[item].keyMetrics.RACCurrent = 0
            }
              if (!this.visbokeymetrics[item].keyMetrics.costCurrentTotal) {
              this.visbokeymetrics[item].keyMetrics.costCurrentTotal = 0
            }
            this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent - this.visbokeymetrics[item].keyMetrics.costCurrentTotal;
          }               
          // if (this.visbokeymetrics[item].keyMetrics && (this.visbokeymetrics[item].keyMetrics.RACCurrent >= 0) && (this.visbokeymetrics[item].keyMetrics.costCurrentTotal) >=  0 ){
          //   this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent- this.visbokeymetrics[item].keyMetrics.costCurrentTotal;  
          // }   else {
          //   this.vpProfit = 0
          // }
          colorValue = this.getProfitCategory(this.vpProfit);
          break;
        case 'Risk':
          const customFieldRisk = getCustomFieldDouble(this.visbokeymetrics[item].vp, '_risk');
          if (customFieldRisk) {
              valueY = customFieldRisk.value;
          } else {
            valueY = 0;
          };
          if (this.visbokeymetrics[item].keyMetrics) {
            if (!this.visbokeymetrics[item].keyMetrics.RACCurrent) {
              this.visbokeymetrics[item].keyMetrics.RACCurrent = 0
            }
              if (!this.visbokeymetrics[item].keyMetrics.costCurrentTotal) {
              this.visbokeymetrics[item].keyMetrics.costCurrentTotal = 0
            }
            this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent - this.visbokeymetrics[item].keyMetrics.costCurrentTotal;
          }
          // if (this.visbokeymetrics[item].keyMetrics && (this.visbokeymetrics[item].keyMetrics.RACCurrent >= 0) && (this.visbokeymetrics[item].keyMetrics.costCurrentTotal) >=  0 ){
          //   this.vpProfit = this.visbokeymetrics[item].keyMetrics.RACCurrent- this.visbokeymetrics[item].keyMetrics.costCurrentTotal;  
          // }   else {
          //   this.vpProfit = 0
          // }
          colorValue = this.getProfitCategory(this.vpProfit);  
          break;
      }

      keyMetrics.push([
        this.combineName(this.visbokeymetrics[item].name, this.visbokeymetrics[item].variantName),
        valueX,
        valueY,
        this.colorMetric[colorValue].name, 
        //(this.vpProfit/this.visbokeymetrics[item].keyMetrics.costCurrentTotal) || 1,
        Math.abs(this.vpProfit)
        //Math.round((this.visbokeymetrics[item].keyMetrics.RACCurrent- this.visbokeymetrics[item].keyMetrics.costCurrentTotal))
        // Math.round(this.visbokeymetrics[item].keyMetrics.costCurrentTotal || 1),
        // Math.round(this.visbokeymetrics[item].keyMetrics.RACCurrent|| 1)    
      ]);
    }
    this.graphBubbleData = keyMetrics;
  }
  

  graphBubbleAxis(): void {
    if (!this.chart) {
      return;
    }

    this.graphBubbleOptions.hAxis.title = this.getMetric(this.metricX).axis;
    switch (this.metricX) {
      case 'StrategicFit':
        this.graphBubbleOptions.hAxis.baseline = 5;
        this.graphBubbleOptions.hAxis.direction = 1;
        this.graphBubbleOptions.hAxis.format = "# "; 
        this.graphBubbleOptions.hAxis.minValue = -1;
        this.graphBubbleOptions.hAxis.maxValue = 11;
        this.graphBubbleOptions.hAxis.gridlines = { count: 12 };
        break;
      case 'Risk':
        this.graphBubbleOptions.hAxis.baseline = 5;
        this.graphBubbleOptions.hAxis.direction = -1;
        this.graphBubbleOptions.hAxis.format = "# ";
        this.graphBubbleOptions.hAxis.minValue = -1;
        this.graphBubbleOptions.hAxis.maxValue = 11;
        this.graphBubbleOptions.hAxis.gridlines = { count: 12 };
        break;
    }

    this.graphBubbleOptions.vAxis.title = this.getMetric(this.metricY).axis;
    switch (this.metricY) {
      case 'StrategicFit':
        this.graphBubbleOptions.vAxis.baseline = 5;
        this.graphBubbleOptions.vAxis.direction = 1;
        this.graphBubbleOptions.vAxis.format = "# ";
        this.graphBubbleOptions.vAxis.minValue = -1;
        this.graphBubbleOptions.vAxis.maxValue = 11;
        this.graphBubbleOptions.vAxis.gridlines = { count: 12 };
        break;
      case 'Risk':
        this.graphBubbleOptions.vAxis.baseline = 5;
        this.graphBubbleOptions.vAxis.direction = -1;
        this.graphBubbleOptions.vAxis.format = "# ";
        this.graphBubbleOptions.vAxis.minValue = -1;
        this.graphBubbleOptions.vAxis.maxValue = 11;
        this.graphBubbleOptions.vAxis.gridlines = { count: 12 };
        break;
    }

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

  exportExcel(): void {
    this.log(`Export Data to Excel ${this.visbokeymetrics?.length}`);

    const exportType = ['Project', 'Cost', 'Deadline', 'Delivery'];
    // eslint-disable-next-line
    const sheets: any = {};
    const sheetNames = [];    
    let nameOfExcelfile = '';

    exportType.forEach(type => {
      const excel: ExportKeyMetric[] = [];

      this.visbokeymetrics?.forEach(element => {
        excel.push(copyKeyMetrics(element, type, this.vcUser, this.userCustomfields));
      });
      const len = excel.length;
      const width = Object.keys(excel[0]).length;
      let name = type;
      
      if (type == 'Project') {
        if (this.vpfActive) {
          name = "Overview Portfolio"
          nameOfExcelfile = this.vpfActive.name
        } else if (this.vcActive) {          
          name = "Overview VisboCenter"
          nameOfExcelfile= this.vcActive.name;
        }
      }
      // Add Localised header to excel
      // eslint-disable-next-line
      const header: any = {};
      let colName: number, colIndex = 0, ind = 0 ;
      for (const element in excel[0]) {
       
        if (element == 'project') {
          colName = colIndex;
        }
        colIndex++;
        if (element.includes("custom")) {
          const customUid = element.slice(6);
          let eleCF = this.userCustomfields.find(item => item.uid == customUid);
          header[element] = eleCF.name;                   
        } else {
          header[element] = element;
          header[element] = this.translate.instant('compViewBubble.lbl.'.concat(element))
        } 
      }

      excel.unshift(header);
      // this.log(`Header for Excel: ${JSON.stringify(header)}`)

      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
      // generate link for VP Name
      const tooltip = this.translate.instant('vpKeyMetric.msg.viewWeb');
      for (let index = 1; index <= len; index++) {
        const address = XLSX.utils.encode_cell({r: index, c: colName});
        const url = window.location.origin.concat('/vpKeyMetrics/', this.visbokeymetrics[index - 1].vpid);
        worksheet[address].l = { Target: url, Tooltip: tooltip };
      }
      const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
      worksheet['!autofilter'] = { ref: matrix };
      const sheetName = visboGetShortText(name, 30);
      sheets[sheetName] = worksheet;
      sheetNames.push(sheetName);
    });
    const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: sheetNames };
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
      (nameOfExcelfile || '')      
      // (sheetnames[0] || '')
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

  getProfitLevel(plan: number, baseline: number): number {
    let percentCalc = 1
    if (baseline) {
      if ((baseline > 0) && (plan > 0)) {
        percentCalc = baseline/plan;
      }
      else if ((baseline < 0) && (plan < 0)) {
        percentCalc = plan/baseline;
      }
      else if ((baseline < 0) && (plan > 0)) {
        percentCalc = 1;
      }
      else if ((baseline > 0) && (plan < 0)) {
        percentCalc = 2;
      }      
    }
    if (percentCalc <= 1) return 1;
    else if (percentCalc <= 1.05) return 2;
    else return 3;
  }
  
  getFinancalLevel(profit: number): number {   
    if (profit) {
      if (profit > 0) return 2;
      if (profit == 0) return 3;
      if (profit < 0) return 0;
    }
  }

  getProfitCategory(profit: number): number {    
    if (profit) {
      if (profit < 0) return 0;
      if (profit == 0) return 1;
      if (profit > 0) return 2;
    } else {
      return 1;
    }
  }

  getVPStatus(local: boolean, original: string = undefined): string {
    if (!this.dropDownVPStatus) {
      return undefined;
    }
    let result = this.dropDownVPStatus[0];
    if (original) {
      result = this.dropDownVPStatus.find(item => item.name == original) || result;
    } else if (this.dropDownVPStatus && this.filterVPStatusIndex >= 0 && this.filterVPStatusIndex < this.dropDownVPStatus.length) {
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

  getPMCommitTooltip (vp: VisboProject): string {
    if (!vp) return '';
    let title = '';
    const PMCommitDate = getCustomFieldDate(vp, '_PMCommit') ? getCustomFieldDate(vp, '_PMCommit').value : undefined;
    if (PMCommitDate) {
      title = this.datePipe.transform(PMCommitDate, 'dd.MM.yyyy HH:mm');
    }
    return title;
  }

  getVPManager(vp: VisboProject, withEmail = true): string {
    let fullName = '';
    if (vp?.managerId) {
      const user = this.vcUser?.get(vp.managerId);
      if (user) {
        if (user.profile) {
          fullName = user.profile.firstName.concat(' ', user.profile.lastName)
        }
        if (!fullName || withEmail) {
          fullName = fullName.concat(' (', user.email, ')');
        }
      }
    }
    return fullName || '';
  }  

  getPreView(): boolean {
    return getPreView();
  }

  getCommitDate(vp: VisboProject):Date {  
    return   getCustomFieldDate(vp, '_PMCommit') ? getCustomFieldDate(vp, '_PMCommit').value : undefined;
   }

  hasCommitDate():boolean {
    const index = this.visbokeymetrics.findIndex(item => this.getCommitDate(item.vp) != undefined )
    return (index >= 0);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompViewBubble: ' + message);
  }
}