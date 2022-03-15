import { Component, Input, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VPParams } from '../../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc, VPVDeadline, VPVDelivery } from '../../_models/visboprojectversion';
import { VisboProjectVersionService } from '../../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { getErrorMessage, convertDate, visboCmpDate, visboIsToday, getPreView } from '../../_helpers/visbo.helper';
import {BarChartOptions} from '../../_models/_chart'

@Component({
  selector: 'app-comp-viewvp',
  templateUrl: './comp-viewvp.component.html'
})
export class VisboCompViewVPComponent implements OnInit, OnChanges {

  @Input() vpvid: string;
  @Input() visboprojectversions: VisboProjectVersion[];
  @Input() combinedPerm: VGPermission;
  @Output() switchViewChild: EventEmitter<VPParams> = new EventEmitter<VPParams>(); //creating an output event

  refDate = new Date();
  variantID: string;
  vpvActive: VisboProjectVersion;

  parentThis = this;
  currentLang: string;

  permVC = VGPVC;
  permVP = VGPVP;

  statusList: string[];
  chartActive: Date;
  timeoutID: number;

  graphCostData = [];
  graphCostOptions: BarChartOptions;
  colorsCost = ['#458CCB', '#BDBDBD', '#F7941E'];
  defaultCostOptions: BarChartOptions = {
    // height is calculated dynamically (also in chartArea)
    // height: 800,
    chartArea: {
      left:100,
      top:40,
      // height: '80%',
      width: '85%'
    },
    // width: '100%',
    // fontSize: 12,
    // title: 'Comparison',
    annotations: {
      textStyle: {
        fontSize: 10
      }
    },
    animation: {startup: true, duration: 200},
    legend: {position: 'top'},
    explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
    // curveType: 'function',
    colors: this.colorsCost,
    seriesType: 'bars',
    isStacked: true,
    tooltip: {
      isHtml: true
    },
    vAxis: {
      textStyle: {
        // fontSize: 12
      }
    },
    minorGridlines: {count: 0, color: 'none'}
  };

  allDeadline: VPVDeadline[];
  indicatorEndDate: number;
  graphDeadlineData = [];
  colorsDeadline = ['gray', '#005600', 'green', 'orange', 'red', '#005600', 'green', 'orange', 'grey'];
  graphDeadlineOptions = {
      titleTextStyle: {color: 'black', fontSize: '16'},
      tooltip : {
        trigger: 'none'
      },
      pieHole: 0.25,
      slices: {},
      // sliceVisibilityThreshold: .025
      colors: []
    };
  divDeadlineChart = 'divDeadLineChart';
  graphDeadlineLegend = [
    ['string', this.translate.instant('compViewVp.lbl.status')],
    ['number', this.translate.instant('compViewVp.lbl.count')]
  ];

  allDelivery: VPVDelivery[];
  graphDeliveryData = [];
  colorsDelivery = ['gray', '#005600', 'green', 'orange', 'red', '#005600', 'green', 'orange', 'grey'];
  graphDeliveryOptions = {
      titleTextStyle: {color: 'black', fontSize: '16'},
      tooltip : {
        trigger: 'none'
      },
      pieHole: 0.25,
      slices: {},
      // sliceVisibilityThreshold: .025
      colors: []
    };
  divDeliveryChart = 'divDeliveryChart';
  graphDeliveryLegend = [
    ['string', this.translate.instant('compViewVp.lbl.status')],
    ['number', this.translate.instant('compViewVp.lbl.count')]
  ];

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
    this.statusList = [
      'Unknown',
      this.translate.instant('compViewVp.chart.statusDeadlineAheadFinished'),
      this.translate.instant('compViewVp.chart.statusDeadlineInTimeFinished'),
      this.translate.instant('compViewVp.chart.statusDeadlineDelayFinished'),
      this.translate.instant('compViewVp.chart.statusDeadlineDelayNotFinished'),
      this.translate.instant('compViewVp.chart.statusDeadlineAheadUnfinished'),
      this.translate.instant('compViewVp.chart.statusDeadlineInTimeUnfinished'),
      this.translate.instant('compViewVp.chart.statusDeadlineDelayUnfinished')
    ];
    this.initSettings();
    this.visboVPVView();
  }

  ngOnChanges(): void {
    this.log(`compViewVp Changes  ${this.vpvid}`);
    this.chartActive = undefined;
    this.initSettings();
    this.visboVPVView();
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    let diff = 0;
    if (this.chartActive) {
      diff = (new Date()).getTime() - this.chartActive.getTime()
    }
    if (diff < 1000) {
      return;
    }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.visboVPVView();
      this.timeoutID = undefined;
    }, 500);
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

  visboVPVView(): void {

    if (!this.visboprojectversions || !this.hasVPPerm(this.permVP.View)) {
      return;
    }
    const refDate = this.refDate || new Date();
    this.vpvActive = this.visboprojectversions.find(vpv => visboCmpDate(vpv.timestamp, refDate) <= 0);
    this.calcCost();
    this.log(`VPV Active ${this.vpvActive.timestamp}: ${this.vpvActive._id}`);
    this.getDeadlines(this.vpvActive);
    this.getDeliveries(this.vpvActive);
    this.chartActive = new Date();
  }

  getDeadlines(vpv: VisboProjectVersion): void {
    this.log(`Deadline Calc for Version  ${vpv._id} ${vpv.timestamp}`);
    if (this.allDeadline?.length > 0) {
      this.visboViewAllDeadlinePie(vpv);
      return;
    }
    this.visboprojectversionService.getDeadline(vpv._id, 'pfv')
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].deadline.length} entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].deadline) {
            this.log(`get VPV Calc: Reset Deadlines to empty `);
            this.allDeadline = undefined;
          } else {
            this.log(`Get Deadlines for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].deadline.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.allDeadline = visboprojectversions[0].deadline;
          }
          this.visboViewAllDeadlinePie(vpv);
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('compViewVp.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  getDeliveries(vpv: VisboProjectVersion): void {
    this.log(`Deliveries Calc for Version  ${vpv._id} ${vpv.timestamp}`);
    if (this.allDelivery?.length > 0) {
      this.visboViewAllDeliveryPie(vpv);
      return;
    }
    this.visboprojectversionService.getDelivery(vpv._id, 'pfv')
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Delivery Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].delivery.length} entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].delivery) {
            this.log(`get VPV Calc: Reset delivery to empty `);
            this.allDelivery = undefined;
          } else {
            this.log(`Get Delivery for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].delivery.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.allDelivery = visboprojectversions[0].delivery;
          }
          this.visboViewAllDeliveryPie(vpv);
        },
        error => {
          this.log(`get VPV Delivery failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('compViewVp.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  visboViewAllDeadlinePie(vpv: VisboProjectVersion): void {
    // this.graphDeadlineOptions.title = this.translate.instant('compViewDeadline.titleAllDeadlines');

    const finishedDeadlineStatus = [];
    const graphData = [];
    let status;
    this.statusList.forEach((status, index) => {
      finishedDeadlineStatus[index] = 0;
    });
    let nonEmpty = false;
    this.allDeadline.forEach(item => {
      status = this.getStatusDeadline(vpv, item);
      finishedDeadlineStatus[status] += 1;
      nonEmpty = true;
    });
    const colors = [];
    finishedDeadlineStatus.forEach( (item, index) => {
      if (item > 0) {
        graphData.push([this.statusList[index], item]);
        colors.push(this.colorsDeadline[index]);
        if (index < 5) {
          // future deadlines
          this.graphDeadlineOptions.slices[graphData.length - 1] = {offset: 0.1};
        }
      }
    });

    this.graphDeadlineOptions.colors = colors;
    if (nonEmpty) {
      this.graphDeadlineData = graphData;
    } else {
      this.graphDeadlineData = [];
    }
  }

  visboViewAllDeliveryPie(vpv: VisboProjectVersion): void {
    // this.graphDeadlineOptions.title = this.translate.instant('compViewDeadline.titleAllDeadlines');

    const finishedDeliveryStatus = [];
    const graphData = [];
    let status;
    this.statusList.forEach((status, index) => {
      finishedDeliveryStatus[index] = 0;
    });
    let nonEmpty = false;
    this.allDelivery.forEach(item => {
      status = this.getStatusDelivery(vpv, item);
      finishedDeliveryStatus[status] += 1;
      nonEmpty = true;
    });
    const colors = [];
    finishedDeliveryStatus.forEach( (item, index) => {
      if (item > 0) {
        graphData.push([this.statusList[index], item]);
        colors.push(this.colorsDelivery[index]);
        if (index >= 5) {
          // future deadlines
          this.graphDeliveryOptions.slices[graphData.length - 1] = {offset: 0.1};
        }
      }
    });

    this.graphDeliveryOptions.colors = colors;
    if (nonEmpty) {
      this.graphDeliveryData = graphData;
    } else {
      this.graphDeliveryData = [];
    }
  }

  getStatusDeadline(vpv: VisboProjectVersion, element: VPVDeadline): number {
    const refDate = vpv.timestamp;
    let status = 0;
    const actualDate = new Date();
    if (element.endDatePFV) {
      if ((new Date(element.endDatePFV).getTime() < actualDate.getTime())) {
        status = 1;
      } else {
        status = 5;
      }
      if (status == 5 || element.percentDone == 1) {
        if (element.changeDays <= 0) { status += 1; }
        if (element.changeDays > 0) { status += 2; }
      } else if (status == 1 || element.percentDone < 1) {
        status = 4;
      }
    }
    return status;
  }

  getStatusDelivery(vpv: VisboProjectVersion, element: VPVDelivery): number {
    const refDate = vpv.timestamp;
    let status = 0;
    const actualDate = new Date();
    if (element.endDatePFV) {
      if ((new Date(element.endDatePFV).getTime() < actualDate.getTime())) {
        status = 1;
      } else {
        status = 5;
      }
      if (status == 5 || element.percentDone == 1) {
        if (element.changeDays <= 0) { status += 1; }
        if (element.changeDays > 0) { status += 2; }
      } else if (status == 1 || element.percentDone < 1) {
        status = 4;
      }
    }
    return status;
  }

  calcCost(): void {
    const graphCostData = [];
    if (this.hasKM(this.vpvActive?.keyMetrics, 'Cost')) {
      const km = this.vpvActive.keyMetrics;
      let tooltip = this.createCostTooltip(km, 'baseline');
      // baseline Values
      graphCostData.push([
        this.translate.instant('compViewVp.lbl.'.concat('baseline')),
        Math.round(km.costBaseLastActual * 10) / 10,
        tooltip,
        Math.round(km.costBaseLastTotal * 10) / 10,
        tooltip
      ]);
      tooltip = this.createCostTooltip(km, 'plan');
      graphCostData.push([
        this.translate.instant('compViewVp.lbl.'.concat('plan')),
        Math.round(km.costCurrentActual * 10) / 10,
        tooltip,
        Math.round(km.costCurrentTotal * 10) / 10,
        tooltip
      ]);
    }
    var len = graphCostData.length;
    graphCostData.unshift([
      'Type',
      this.translate.instant('compViewVp.lbl.actualCost'),
      { type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('compViewVp.lbl.totalCost'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    this.graphCostOptions = this.copyGraphBarOptions(this.defaultCostOptions);
    this.graphCostAxis(len);
    this.graphCostData = graphCostData;
  }

  chartSelectRow(row: number, label: string): void {
    this.log(`Timeline Chart: ${row} ${label}`);
    this.gotoClickedRow(this.vpvActive, 'Cost');
  }

  gotoClickedRow(vpv: VisboProjectVersion, view: string): void {
    this.log(`goto VP View ${vpv.name} (${vpv.vpid}) View ${view}`);
    this.updateUrlParam('view', view, true);
  }

  getEndDateDelay(): string {
    let diff = 0;
    if (this.vpvActive.keyMetrics) {
      diff = (new Date(this.vpvActive.keyMetrics.endDateCurrent)).getTime() - (new Date(this.vpvActive.keyMetrics.endDateBaseLast)).getTime();
    }
    diff = diff / 1000 / 60 / 60 / 24 / 7;
    if (diff <= 0) {
      this.indicatorEndDate = 1;
    } else if (diff <= 4) {
      this.indicatorEndDate = 2;
    } else {
      this.indicatorEndDate = 3;
    }
    let result = (Math.round(diff * 10) / 10).toString();
    result = '('.concat(result, ' ', this.translate.instant('compViewVp.lbl.weeks'), ')');
    if (diff == 0) {
      result = '';
    }
    return result
  }

  createCostTooltip(km: VPVKeyMetrics, type: string): string {

    const unitEuro = this.translate.instant('compViewVp.lbl.keuro');
    let format = '&nbsp' + unitEuro;
    const name = this.translate.instant('compViewVp.lbl.'.concat(type)).replace(/ /g, "&nbsp");
    const actual = this.translate.instant('compViewVp.lbl.actualCost').replace(/ /g, "&nbsp");
    const total = this.translate.instant('compViewVp.lbl.totalCost').replace(/ /g, "&nbsp");

    let result = '<div style="padding:5px 5px 5px 5px;">' +
      '<div><b>' + name + '</b></div>' + '<div>' +
      '<table>';

    if (type == 'baseline') {
      result = result + '<tr>' + '<td>' +
                  actual +
                  ':</td>' + '<td><b>' +
                  Math.round(km.costBaseLastActual * 10) / 10 +
                  '</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' +
                  total +
                  ':</td>' + '<td><b>' +
                  Math.round(km.costBaseLastTotal * 10) / 10 +
                  '</b></td>' + '</tr>';
    } else if (type == 'plan') {
          result = result + '<tr>' + '<td>' +
                      actual +
                      ':</td>' + '<td><b>' +
                      Math.round(km.costCurrentActual * 10) / 10 +
                      '</b></td>' + '</tr>';
          result = result + '<tr>' + '<td>' +
                      total +
                      ':</td>' + '<td><b>' +
                      Math.round(km.costCurrentTotal * 10) / 10 +
                      '</b></td>' + '</tr>';
        }

    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  graphCostAxis(len: number): void {
    const euroFormat = '# ' + this.translate.instant('compViewVp.lbl.keuro');
    if (len > 0) {
      this.graphCostOptions.height = 80 + len * 40;
    }
    this.graphCostOptions.hAxis.format = euroFormat;
  }

  copyGraphBarOptions(source: BarChartOptions): BarChartOptions {
    const result = Object.assign({}, source);
    // copy also child structures
    result.chartArea = Object.assign({}, source.chartArea);
    result.hAxis = Object.assign({}, source.hAxis);
    return result;
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

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewVp: ' + message);
    console.log('CompVisboViewVp: ' + message);
  }

}
