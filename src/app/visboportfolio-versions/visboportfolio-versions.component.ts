import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import * as moment from 'moment';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboportfolio-versions',
  templateUrl: './visboportfolio-versions.component.html'
})
export class VisboPortfolioVersionsComponent implements OnInit {

    visboportfolioversions: VisboPortfolioVersion[];
    visboprojectversions: VisboProjectVersion[];
    visbokeymetrics: VPVKeyMetricsCalc[] = [];

    dropDown: any[] = [];
    dropDownSelected: string;
    dropDownValue: number;

    colorMetric: any[] = [{name: 'Critical', color: 'red'}, {name: 'Warning', color: 'yellow'}, {name: 'Good', color: 'green'} ];

    typeMetricList: any[];
    typeMetricIndexX: number;
    typeMetricIndexY: number;
    typeMetricX: string;
    typeMetricY: string;

    vpSelected: string;
    vpFilter = '';
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    estimateAtCompletion = 0;
    budgetAtCompletion = 0;
    vpvRefDate: Date = new Date();
    refDateInterval = 'month';
    vpfActiveIndex: number;
    deleted = false;
    chart = true;
    modalChart = true;
    parentThis: any;
    graphBubbleData: any[] = [];
    graphBubbleOptions: any = undefined;
    graphBubbleLabelX: string;
    graphBubbleLabelY: string;
    currentLang: string;

    sortAscending: boolean;
    sortColumn = 6;

    combinedPerm: VGPermission = undefined;
    permVC: any = VGPVC;
    permVP: any = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.log(`Init VPF with Transaltion: ${this.translate.instant('vpfVersion.metric.costName')}`);
    this.typeMetricList = [
      {
        name: this.translate.instant('vpfVersion.metric.costName'),
        metric: 'Costs',
        axis: this.translate.instant('vpfVersion.metric.costAxis'),
        bubble: this.translate.instant('vpfVersion.metric.costBubble'),
        table: this.translate.instant('vpfVersion.metric.costTable')
      },
      {
        name: this.translate.instant('vpfVersion.metric.endDateName'),
        metric: 'EndDate',
        axis: this.translate.instant('vpfVersion.metric.endDateAxis'),
        bubble: this.translate.instant('vpfVersion.metric.endDateBubble'),
        table: this.translate.instant('vpfVersion.metric.endDateTable')
      },
      {
        name: this.translate.instant('vpfVersion.metric.deadlineName'),
        metric: 'Deadlines',
        axis: this.translate.instant('vpfVersion.metric.deadlineAxis'),
        bubble: this.translate.instant('vpfVersion.metric.deadlineBubble'),
        table: this.translate.instant('vpfVersion.metric.deadlineTable')
      },
      {
        name: this.translate.instant('vpfVersion.metric.deliveryName'),
        metric: 'Deliveries',
        axis: this.translate.instant('vpfVersion.metric.deliveryAxis'),
        bubble: this.translate.instant('vpfVersion.metric.deliveryBubble'),
        table: this.translate.instant('vpfVersion.metric.deliveryTable')
      }
    ];

    // const view = {'xAxis': this.typeMetricIndexX, 'yAxis': this.typeMetricIndexY, 'vpFilter': this.vpFilter};
    const view = JSON.parse(sessionStorage.getItem('vpf-view'));
    const id = this.route.snapshot.paramMap.get('id');
    if (view) {
      this.typeMetricIndexX = view.xAxis || 0;
      this.typeMetricIndexY = view.yAxis || 1;
      if (view.vpID && view.vpID === id) {
        this.vpFilter = view.vpFilter || undefined;
        this.vpvRefDate = view.vpvRefDate ? new Date(view.vpvRefDate) : new Date();
      }
    } else {
      this.typeMetricIndexX = 0;
      this.typeMetricIndexY = 1;
    }
    this.typeMetricX = this.typeMetricList[this.typeMetricIndexX].name;
    this.typeMetricY = this.typeMetricList[this.typeMetricIndexY].name;

    this.showChartOption(true);
    this.getVisboPortfolioVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  getVisboPortfolioVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.parentThis = this;
    this.vpSelected = id;
    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboPortfolioVersions(id, this.deleted)
              .subscribe(
                visboportfolioversions => {
                  this.visboportfolioversions = visboportfolioversions;
                  this.vpfActive = visboportfolioversions[0];
                  this.vpfActiveIndex = visboportfolioversions.length;
                  if (visboportfolioversions.length > 0) {
                    // this.combinedPerm = visboportfolioversions[0].perm;
                    this.dropDownInit();
                    this.getVisboPortfolioKeyMetrics();
                    this.log(`get VPF Index ${this.vpfActiveIndex}`);
                  }
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpfVersion.msg.errorPermVersion', {'name': this.vpActive.name});
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
              const message = this.translate.instant('vpfVersion.msg.errorPermVP');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    } else {
      this.vpSelected = null;
      this.vpActive = null;
      this.visboprojectversionService.getVisboPortfolioVersions(null)
        .subscribe(
          visboportfolioversions => this.visboportfolioversions = visboportfolioversions,
          error => {
            this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpfVersion.msg.errorPermVP');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  getVisboPortfolioKeyMetrics(): void {
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);
    const chart = this.chart;
    this.showChartOption(false);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.log(`get VPF Key metrics: Get ${visboprojectversions.length} Project Versions`);
          this.visboKeyMetricsCalc();
          this.showChartOption(chart);
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVP');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.vpvRefDate} ${increment}`);
    let newRefDate = new Date(this.vpvRefDate.getTime());
    switch (this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        if (increment > 0 || newRefDate.getTime() === this.vpvRefDate.getTime()) {
          newRefDate.setDate(newRefDate.getDate() + increment);
        }
        break;
      case 'week':
        newRefDate.setHours(0, 0, 0, 0); // beginning of week
        newRefDate.setDate(newRefDate.getDate() + increment * 7);
        break;
      case 'month':
        newRefDate.setHours(0, 0, 0, 0); // beginning of month
        newRefDate.setDate(1);
        if (increment > 0 || newRefDate.getTime() === this.vpvRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment);
        }
        break;
      case 'quarter':
        let quarter = Math.trunc(newRefDate.getMonth() / 3);
        if (increment > 0) {
          quarter += increment;
        }
        newRefDate.setMonth(quarter * 3);
        newRefDate.setDate(1);
        newRefDate.setHours(0, 0, 0, 0);
        if (newRefDate.getTime() === this.vpvRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3);
        }
        break;
    }
    this.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    const today = new Date();
    if (newRefDate > today) {
      newRefDate = today;
    }
    this.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    this.vpvRefDate = new Date(newRefDate.toISOString()); // to guarantee that the item is refreshed in UI
    this.getVisboPortfolioKeyMetrics();
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.visbokeymetrics = [];
    this.budgetAtCompletion = 0;
    this.estimateAtCompletion = 0;

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
        if (this.visboprojectversions[i].keyMetrics) {
          let elementKeyMetric: VPVKeyMetricsCalc;
          elementKeyMetric = new VPVKeyMetricsCalc();
          elementKeyMetric.name = this.visboprojectversions[i].name;
          elementKeyMetric._id = this.visboprojectversions[i]._id;
          elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
          elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
          elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;

          this.budgetAtCompletion += elementKeyMetric.keyMetrics.costBaseLastTotal || 0;
          this.estimateAtCompletion += elementKeyMetric.keyMetrics.costCurrentTotal || 0;

          // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
          elementKeyMetric.savingCostTotal = (elementKeyMetric.keyMetrics.costCurrentTotal || 0)
                                            / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1) || 0;
          // if (elementKeyMetric.savingCostTotal > 2) elementKeyMetric.savingCostTotal = 2;
          elementKeyMetric.savingCostActual = (elementKeyMetric.keyMetrics.costCurrentActual || 0)
                                              / (elementKeyMetric.keyMetrics.costBaseLastActual || 1) || 0;
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
          this.visbokeymetrics.push(elementKeyMetric);
        }
      }
    }
    this.sortKeyMetricsTable(undefined);
    this.visboKeyMetricsCalcBubble();
  }

  calcPercent(current, baseline) {
    if (baseline === undefined) {
      return undefined;
    } else if (baseline === 0 && current === 0) {
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

  storeSetting() {
    let vpvRefDate = new Date();
    // store refDate only if it is different from today
    if (this.isSameDay(vpvRefDate, this.vpvRefDate)) {
      vpvRefDate = undefined;
    } else {
      vpvRefDate = this.vpvRefDate;
    }
    const view = {
      'updatedAt': (new Date()).toISOString(),
      'vpID': this.vpActive._id.toString(),
      'xAxis': this.typeMetricIndexX,
      'yAxis': this.typeMetricIndexY,
      'vpFilter': this.vpFilter,
      'vpvRefDate': vpvRefDate ? vpvRefDate.toISOString() : undefined
    };
    sessionStorage.setItem('vpf-view', JSON.stringify(view));
  }

  changeChart() {
    this.log(`Switch Chart from ${this.typeMetricList[this.typeMetricIndexX].metric} vs  ${this.typeMetricList[this.typeMetricIndexY].metric}  to ${this.typeMetricX} vs  ${this.typeMetricY}`);
    this.typeMetricIndexX = this.typeMetricList.findIndex(x => x.name === this.typeMetricX);
    this.typeMetricIndexY = this.typeMetricList.findIndex(x => x.name === this.typeMetricY);
    this.storeSetting();
    this.visboKeyMetricsCalc();
    this.chart = this.modalChart;
  }

  drawChart(visible: boolean) {
    this.modalChart = this.chart;
    this.chart = false;
  }

  visboKeyMetricsCalcBubble(): void {
    this.graphBubbleOptions = {
        // 'chartArea':{'left':20,'top':0,'width':'100%','height':'100%'},
        'width': '100%',
        // 'title':'Key Metrics: Total Cost vs. End Date Plan vs. Base Line',
        // 'colorAxis': {'colors': ['red', 'yellow', 'green'], 'minValue': 0, 'maxValue': 2, 'legend': {'position': 'none'}},
        'vAxis': {'direction': -1, 'title': 'Change in End Date (weeks)', 'baselineColor': 'blue'},
        'hAxis': {'baseline': 1, 'direction': -1, 'format': "# '%'", 'title': 'Total Cost', 'baselineColor': 'blue'},
        // 'sizeAxis': {'minValue': 20, 'maxValue': 200},
        // 'chartArea':{'left':20,'top':30,'width':'100%','height':'90%'},
        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'bubble': { 'textStyle': { 'auraColor': 'none', 'fontSize': 13 } },
        'tooltip': { 'showColorCode': false }
      };

    this.graphBubbleAxis(); // set the Axis Description and properties

    let keyMetrics: any;
    keyMetrics = [];
    if (!this.visbokeymetrics) {
      return;
    }
    if (this.visbokeymetrics.length > 20) {
      this.graphBubbleOptions.bubble.textStyle.fontSize = 1;
    }
    keyMetrics.push(['ID', this.graphBubbleLabelX, this.graphBubbleLabelY, 'Key Metrics Status', 'Total Cost (Base Line) in k\u20AC']);
    for (let i = 0; i < this.visbokeymetrics.length; i++) {
      // var colorValue = (this.visbokeymetrics[i].savingCostTotal <= 1 ? 1 : 0) +
      //                   (this.visbokeymetrics[i].savingEndDate <= 0 ? 1 : 0);
      let colorValue = 0;
      let valueX: number;
      let valueY: number;
      switch (this.typeMetricList[this.typeMetricIndexX].metric) {
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
        case 'Deliveries':
          valueX = Math.round(this.visbokeymetrics[i].deliveryCompletionActual * 100);
          colorValue += valueX >= 100 ? 1 : 0;
          break;
      }
      switch (this.typeMetricList[this.typeMetricIndexY].metric) {
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
          colorValue += valueY >= 1 ? 1 : 0;
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
        Math.trunc(this.visbokeymetrics[i].keyMetrics.costBaseLastTotal)
      ]);
    }
    this.calcRangeAxis();
    this.graphBubbleData = keyMetrics;
  }

  calcRangeAxis(): void {
    let rangeAxis = 0;
    let minSize = Infinity, maxSize = 0;

    for (let i = 0; i < this.visbokeymetrics.length; i++) {
      minSize = Math.min(minSize, this.visbokeymetrics[i].keyMetrics.costBaseLastTotal);
      maxSize = Math.max(maxSize, this.visbokeymetrics[i].keyMetrics.costBaseLastTotal);
      switch (this.typeMetricList[this.typeMetricIndexX].metric) {
        case 'Costs':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].savingCostTotal - 1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].savingEndDate));
          break;
        case 'Deadlines':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].timeCompletionActual - 1) * 100));
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
    if (!this.graphBubbleOptions.sizeAxis) {
      this.graphBubbleOptions.sizeAxis = {};
    }
    this.graphBubbleOptions.sizeAxis.minValue = minSize;
    this.graphBubbleOptions.sizeAxis.maxValue = maxSize;

    if (this.typeMetricList[this.typeMetricIndexX].metric === 'EndDate') {
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
      switch (this.typeMetricList[this.typeMetricIndexY].metric) {
        case 'Costs':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].savingCostTotal - 1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].savingEndDate));
          break;
        case 'Deadlines':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].timeCompletionActual - 1) * 100));
          break;
        case 'Deliveries':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].deliveryCompletionActual - 1) * 100));
          break;
      }
    }
    if (this.typeMetricList[this.typeMetricIndexY].metric === 'EndDate') {
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
    let typeMetric = this.typeMetricList[this.typeMetricIndexX];
    const weekFormat = '# ' + this.translate.instant('vpfVersion.lbl.weeks');

    switch (typeMetric.metric) {
      case 'Costs':
        this.graphBubbleOptions.hAxis = {'baseline': 100, 'direction': -1, 'format': "# '%'", 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
      case 'EndDate':
        this.graphBubbleOptions.hAxis = {'baseline': 0, 'direction': -1, 'format': weekFormat, 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
      case 'Deadlines':
        this.graphBubbleOptions.hAxis = {'baseline': 100, 'direction': 1, 'format': "# '%'", 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
      case 'Deliveries':
        this.graphBubbleOptions.hAxis = {'baseline': 100, 'direction': 1, 'format': "# '%'", 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
    }
    this.graphBubbleLabelX = typeMetric.bubble;

    typeMetric = this.typeMetricList[this.typeMetricIndexY];
    switch (this.typeMetricList[this.typeMetricIndexY].metric) {
      case 'Costs':
        this.graphBubbleOptions.vAxis = {'baseline': 100, 'direction': -1, 'format': "# '%'", 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
      case 'EndDate':
        this.graphBubbleOptions.vAxis = {'baseline': 0, 'direction': -1, 'format': weekFormat, 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
      case 'Deadlines':
        this.graphBubbleOptions.vAxis = {'baseline': 100, 'direction': 1, 'format': "# '%'", 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
      case 'Deliveries':
        this.graphBubbleOptions.vAxis = {'baseline': 100, 'direction': 1, 'format': "# '%'", 'title': typeMetric.axis, 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        break;
    }
    this.graphBubbleLabelY = typeMetric.bubble;

    this.graphBubbleOptions.series = {};
    this.graphBubbleOptions.series.Critical = {color: this.colorMetric[0].color};
    this.graphBubbleOptions.series.Warning = {color: this.colorMetric[1].color};
    this.graphBubbleOptions.series.Good = {color: this.colorMetric[2].color};
    // this.log(`Series: ${JSON.stringify(this.graphBubbleOptions.series)}`)
  }

  // get the details of the project
  gotoVPDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.storeSetting();
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoClickedRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`goto VP ${vpv.name} (${vpv.vpid}) Deleted? ${this.deleted}`);
    this.storeSetting();
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVC(visboproject: VisboProject): void {
    this.storeSetting();
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  chartSelectRow(row: number, label: string) {
    // this.log(`Bubble Chart: ${row} ${label}`);
    const vpv = this.visbokeymetrics.find(x => x.name === label);

    this.log(`Navigate to: ${vpv.vpid} ${vpv.name}`);
    this.storeSetting();
    let queryParams: any;
    queryParams = {};
    if (this.deleted) { queryParams.deleted = this.deleted; }
    if (!this.isSameDay(this.vpvRefDate, new Date())) { queryParams.refDate = this.vpvRefDate.toISOString(); }
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], { queryParams: queryParams });
  }

  dropDownInit() {
    this.log(`Init Drop Down List ${this.visboportfolioversions.length}`);
    this.dropDown = [];
    const len = this.visboportfolioversions.length;

    for (let i = 0; i < len; i++) {
      const timestamp = new Date(this.visboportfolioversions[i].timestamp);
      const text = 'Version '.concat((len - i).toString(), ' from ', moment(timestamp).format('DD.MM.YY HH:mm'));
      this.dropDown.push({name: text, version: i, timetsamp: moment(timestamp).format('DD.MM.YY') });
    }
    if (len > 0 ) {
      this.dropDownSelected = this.dropDown[0].name;
    }
    // this.log(`Init Drop Down List Finished ${this.dropDown.length} Selected ${this.dropDownSelected}`);
  }

  changePFVersion() {
    this.dropDownValue = this.dropDown.find(x => x.name === this.dropDownSelected).version;
    this.log(`Change Drop Down ${this.dropDownSelected} ${this.dropDownValue}`);
    this.vpfActive = this.visboportfolioversions[this.dropDownValue];
    this.getVisboPortfolioKeyMetrics();
  }

  selectedMetric(metric: string): boolean {
    if (this.typeMetricList[this.typeMetricIndexX].metric === metric
    || this.typeMetricList[this.typeMetricIndexY].metric === metric) {
      return true;
    } else {
      return false;
    }
  }

  metricLabel(metric: string, label: string): string {
    const typeMetric = this.typeMetricList.find(x => x.metric === metric);
    let result = '';
    if (typeMetric) {
      result = typeMetric[label];
    }
    return result || 'UNKNOWN';
  }

  showChartOption(newStatus?: boolean): void {
    if (newStatus === undefined) {
      this.chart = !this.chart;
    } else {
      this.chart = newStatus;
    }
    this.log(`Switch Chart to ${this.chart}`);
  }

  helperVpIndex(vpIndex: number): void {
    this.log(`VP Helper: ${vpIndex}`);
    // this.auditIndex = auditIndex
  }

  helperDateDiff(from: string, to: string, unit: string) {
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

  sortKeyMetricsTable(n) {
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
      this.visbokeymetrics.sort(function(a, b) {
        return a.timeCompletionActual - b.timeCompletionActual;
      });
    } else if (this.sortColumn === 7) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.timeCompletionBaseLastActual - b.keyMetrics.timeCompletionBaseLastActual;
      });
    } else if (this.sortColumn === 8) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.deliveryCompletionActual - b.deliveryCompletionActual;
      });
    } else if (this.sortColumn === 9) {
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.deliverableCompletionBaseLastActual - b.keyMetrics.deliverableCompletionBaseLastActual;
      });
    }
    if (!this.sortAscending) {
      this.visbokeymetrics.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboPortfolioVersion: ' + message);
  }
}
