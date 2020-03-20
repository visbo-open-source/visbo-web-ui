import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboprojects',
  templateUrl: './visboprojects.component.html'
})
export class VisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;

  visboprojectversions: VisboProjectVersion[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];
  vpvRefDate: Date = new Date();
  vpFilter: string = undefined;
  chart = false;
  modalChart = true;
  deleted = false;
  sortAscending: boolean;
  sortColumn: number;

  parentThis: any;
  graphBarData: any[] = [];
  graphBarOptions: any = undefined;
  graphBarLabelX: string;
  graphBarLabelY: string;
  currentLang: string;

  colorMetric: any[] = [{name: 'Critical', color: 'red'}, {name: 'Warning', color: 'yellow'}, {name: 'Good', color: 'green'} ];

  typeMetricList: any[];
  typeMetricIndexX: number;
  typeMetricIndexY: number;
  typeMetricX: string;
  typeMetricY: string;

  graphBubbleData: any[] = [];
  graphBubbleOptions: any = undefined;
  graphBubbleLabelX: string;
  graphBubbleLabelY: string;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private visboprojectversionService: VisboProjectVersionService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.log(`Init GetVisboProjects ${JSON.stringify(this.route.snapshot.queryParams)}`);
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.log(`Init VP Deleted: ${this.deleted}`);
    this.parentThis = this;

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
    const view = JSON.parse(sessionStorage.getItem('vp-view'));
    const id = this.route.snapshot.paramMap.get('id');
    if (view) {
      this.typeMetricIndexX = view.xAxis || 0;
      this.typeMetricIndexY = view.yAxis || 1;
      this.chart = view.chart || false;
      if (view && view.vcID === id) {
        this.vpFilter = view.vpFilter || undefined;
      }
    } else {
      this.typeMetricIndexX = 0;
      this.typeMetricIndexY = 1;
    }
    this.typeMetricX = this.typeMetricList[this.typeMetricIndexX].name;
    this.typeMetricY = this.typeMetricList[this.typeMetricIndexY].name;

    this.getVisboProjects(this.deleted);
  }

  chartSelectRow(row: number, label: string) {
    this.log(`VP Bubble Chart: ${row} ${label}`);
    const vpv = this.visbokeymetrics.find(x => x.name === label);

    this.log(`Navigate to: ${vpv.vpid} ${vpv.name}`);
    this.storeSetting();
    let queryParams: any;
    queryParams = {};
    if (this.deleted) { queryParams.deleted = this.deleted; }
    if (!this.isSameDay(this.vpvRefDate, new Date())) { queryParams.refDate = this.vpvRefDate.toISOString(); }
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], { queryParams: queryParams });
  }

  isSameDay(dateA: Date, dateB: Date): boolean {
    if (!dateA || !dateB) { return false; }
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    return dateA.toISOString() === dateB.toISOString();
  }

  onSelect(visboproject: VisboProject): void {
    this.getVisboProjects(this.deleted);
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  toggleVisboProjects(): void {
    this.deleted = !this.deleted;
    const url = this.route.snapshot.url.join('/');
    this.log(`VP toggleVisboProjects ${this.deleted} URL ${url}`);
    this.getVisboProjects(this.deleted);
    // MS TODO: go to the current url and add delete flag
    this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  toggleVisboChart(): void {
    this.chart = !this.chart;
    this.storeSetting();
    if (this.chart && this.visbokeymetrics.length === 0) {
      this.getVisboProjectKeyMetrics();
    }
  }

  getVisboProjects(deleted: boolean): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.vcSelected = id;
    if (id) {
      this.visbocenterService.getVisboCenter(id)
        .subscribe(
          visbocenters => {
            this.vcActive = visbocenters;
            this.combinedPerm = visbocenters.perm;
            this.visboprojectService.getVisboProjects(id, false, deleted)
              .subscribe(
                visboprojects => {
                  this.visboprojects = visboprojects;
                  this.sortVPTable(1);
                  if (this.chart) { this.getVisboProjectKeyMetrics(); }
                },
                error => {
                  this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
                  this.alertService.error(getErrorMessage(error));
                }
              );
          },
          error => {
            this.log(`get VC failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        );
    } else {
      this.vcSelected = null;
      this.vcActive = null;
      this.visboprojectService.getVisboProjects(null, false, deleted)
        .subscribe(
          visboprojects => {
            this.visboprojects = visboprojects;
            this.sortVPTable(1);
            // this.getVisboProjectKeyMetrics();
          },
          error => {
            this.log(`get VPs all failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        );
    }
  }

  addproject(name: string, vcid: string, desc: string): void {
    name = name.trim();
    this.log(`call create VP ${name} with VCID ${vcid} Desc ${desc} `);
    if (!name) { return; }
    this.visboprojectService.addVisboProject({ name: name, description: desc, vcid: vcid } as VisboProject).subscribe(
      vp => {
        // console.log("add VP %s with ID %s to VC %s", vp[0].name, vp[0]._id, vp[0].vcid);
        this.visboprojects.push(vp);
        this.sortVPTable(undefined);
        const message = this.translate.instant('vp.msg.createSuccess', {name: vp.name});
        this.alertService.success(message);
      },
      error => {
        this.log(`add VP failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vp.msg.errorPerm', {name: name});
          this.alertService.error(message);
        } else if (error.status === 409) {
          const message = this.translate.instant('vp.msg.errorConflict', {name: name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  getVisboProjectKeyMetrics(): void {
    this.log(`get VC keyMetrics ${this.vcActive.name} ${this.vcActive._id}`);
    let chart = this.chart;
    this.showChartOption(false);

    this.visboprojectversionService.getVisboCenterProjectVersions(this.vcActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.log(`get VC Key metrics: Get ${visboprojectversions.length} Project Versions`);
          this.visboKeyMetricsCalc();
          if (this.visboprojectversions.length == 0) {
            chart = false;
          }
          this.showChartOption(chart);
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vp.msg.errorPermVC');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.visbokeymetrics = [];
    // this.budgetAtCompletion = 0;
    // this.estimateAtCompletion = 0;

    if (!this.visboprojectversions) {
      return;
    }
    this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
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

          // this.budgetAtCompletion += elementKeyMetric.keyMetrics.costBaseLastTotal || 0;
          // this.estimateAtCompletion += elementKeyMetric.keyMetrics.costCurrentTotal || 0;

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
            this.calcPercent(km.timeCompletionCurrentTotal, km.timeCompletionBaseLastTotal);
          elementKeyMetric.timeCompletionActual =
            this.calcPercent(km.timeCompletionCurrentActual, km.timeCompletionBaseLastActual);

          // Calculate the Delivery Completion
          elementKeyMetric.deliveryCompletionTotal =
            this.calcPercent(km.deliverableCompletionCurrentTotal, km.deliverableCompletionBaseLastTotal);
          elementKeyMetric.deliveryCompletionActual =
            this.calcPercent(km.deliverableCompletionCurrentActual, km.deliverableCompletionBaseLastActual);
          this.visbokeymetrics.push(elementKeyMetric);
        }
      }
    }
    // this.sortKeyMetricsTable(undefined);
    this.visboKeyMetricsCalcBar();
    this.visboKeyMetricsCalcBubble();
  }

  visboKeyMetricsCalcBar(): void {
    this.graphBarOptions = {
        // 'chartArea':{'left':20,'top':0,'width':'100%','height':'100%'},
        'width': '100%',
        // 'title':'Key Metrics: Total Cost vs. End Date Plan vs. Base Line',
        // 'sizeAxis': {'minValue': 20, 'maxValue': 200},
        'chartArea': { 'height': '100%' },
        // 'bars': 'horizontal',
        'bar': { 'groupWidth': '80%'},
        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'tooltip': { 'showColorCode': false }
      };

    // this.graphBubbleAxis(); // set the Axis Description and properties

    let keyMetrics: any;
    keyMetrics = [];
    if (!this.visbokeymetrics) {
      return;
    }
    keyMetrics.push(['Project', 'Cost Achievement', 'Deadline Achievement', 'Delivery Achievement']);
    for (let i = 0; i < this.visbokeymetrics.length; i++) {
      // var colorValue = (this.visbokeymetrics[i].savingCostTotal <= 1 ? 1 : 0) +
      //                   (this.visbokeymetrics[i].savingEndDate <= 0 ? 1 : 0);
      // let colorValue = 0;
      let valueX: number;
      let valueY: number;
      let valueZ: number;

      valueX = Math.round(this.visbokeymetrics[i].savingCostTotal * 100) - 100;
      valueY = Math.round(this.visbokeymetrics[i].timeCompletionActual * 100) - 100;
      valueZ = Math.round(this.visbokeymetrics[i].deliveryCompletionActual * 100) - 100;

      keyMetrics.push([
        this.visbokeymetrics[i].name,
        valueX,
        valueY,
        valueZ
      ]);
    }
    // this.calcRangeAxis();
    this.graphBarOptions.chartArea.height = 40 * keyMetrics.length;
    this.graphBarData = keyMetrics;
  }

  visboKeyMetricsCalcBubble(): void {
    this.graphBubbleOptions = {
        // 'chartArea':{'left':20,'top':0,'width':'100%','height':'100%'},
        'width': '100%',
        // 'title':'Key Metrics: Total Cost vs. End Date Plan vs. Base Line',
        // 'colorAxis': {'colors': ['red', 'yellow', 'green'], 'minValue': 0, 'maxValue': 2, 'legend': {'position': 'none'}},
        'vAxis': {'direction': -1, 'title': 'Change in End Date (weeks)', 'baselineColor': 'blue'},
        'hAxis': {'baseline': 1, 'direction': -1, 'format': 'decimal', 'title': 'Total Cost', 'baselineColor': 'blue'},
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

  calcPercent(current, baseline) {
    if (baseline === undefined) {
      return undefined;
    } else if (baseline === 0 && current === 0) {
      return 1;
    } else {
      return (current || 0) / baseline;
    }
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

  storeSetting() {
    let vcID: string;
    if (this.vcActive && this.vcActive._id) { vcID = this.vcActive._id.toString(); }
    const view = {
      'updatedAt': (new Date()).toISOString(),
      'vcID': vcID,
      'xAxis': this.typeMetricIndexX,
      'yAxis': this.typeMetricIndexY,
      'vpFilter': this.vpFilter,
      'chart': this.chart
    };
    sessionStorage.setItem('vp-view', JSON.stringify(view));
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

  showChartOption(newStatus?: boolean): void {
    if (newStatus === undefined) {
      this.chart = !this.chart;
    } else {
      this.chart = newStatus;
    }
    this.storeSetting();
    this.log(`Switch Chart to ${this.chart}`);
  }

  // get the versions of the project
  gotoClickedRow(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    // MS TODO: use enumerator for Type
    this.storeSetting();
    if (visboproject.vpType === 1) {
      this.log(`goto VPF for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpf/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    } else {
      this.log(`goto VPV for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    }
  }

  // get the details of the project
  gotoDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.storeSetting();
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVCDetail(visbocenter: VisboCenter): void {
    this.storeSetting();
    this.router.navigate(['vcDetail/'.concat(visbocenter._id)]);
  }

  sortVPTable(n) {
    if (n !== undefined) {
      if (!this.visboprojects) {
        return;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    // console.log("Sort VP Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn === 1) {
      // sort by VP Name
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.visboprojects.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.vc.name.toLowerCase(), b.vc.name.toLowerCase());
      });
    } else if (this.sortColumn === 4) {
      // sort by VC vpvCount
      this.visboprojects.sort(function(a, b) {
        return a.vpvCount - b.vpvCount;
      });
    } else if (this.sortColumn === 5) {
      // sort by VP vpType
      this.visboprojects.sort(function(a, b) {
        return a.vpType - b.vpType;
      });
    }
    // console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visboprojects.reverse();
      // console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}
