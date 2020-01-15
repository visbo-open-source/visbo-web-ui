import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import * as moment from 'moment';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

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

    colorMetric: any[] = [{name: "Critical", color: 'red'}, {name: "Warning", color: 'yellow'}, {name: "Good", color: 'green'} ];

    typeMetricList: any[] = [
      {name: "Total Cost", metric: "Costs"},
      {name: "Change in End Date (weeks)", metric: "EndDate"},
      {name: "Achieved Deadlines", metric: "Deadlines"},
      {name: "Achieved Deliveries", metric: "Deliveries"}
    ];
    typeMetricX: string = this.typeMetricList[0].name;
    typeMetricY: string = this.typeMetricList[1].name;

    typeMetricChartX: string = this.typeMetricList[0].metric;
    typeMetricChartY: string = this.typeMetricList[1].metric;

    vpSelected: string;
    vpFilter: string = "";
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    refDateInterval: string = "month";
    vpfActiveIndex: number;
    deleted: boolean = false;
    chart: boolean = true;
    tempList: boolean = undefined;
    tempChart: boolean;
    tempDate: Date;
    chartButton: string;
    parentThis: any;
    showChart: boolean = true;
    graphBubbleData: any[] = [];
    graphBubbleOptions: any = undefined;
    graphBubbleLabelX: string;
    graphBubbleLabelY: string;

    sortAscending: boolean;
    sortColumn: number = 6;

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
    this.showChartOption(true);
    this.getVisboPortfolioVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm == undefined) return false
    return (this.combinedPerm.vp & perm) > 0
  }

  getVisboPortfolioVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.parentThis = this;
    var i: number;
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
                  this.log(`get VPF ${this.vpActive.name} Length ${visboportfolioversions.length} Perm ${JSON.stringify(this.combinedPerm)}`);
                  this.vpfActive = visboportfolioversions[0];
                  this.vpfActiveIndex = visboportfolioversions.length;
                  if (visboportfolioversions.length > 0) {
                    // this.combinedPerm = visboportfolioversions[0].perm;
                    this.dropDownInit();
                    this.getVisboPortfolioKeyMetrics();
                    this.log(`get VPF Index ${this.vpfActiveIndex}`);
                    this.log(`get VPF ${this.vpActive.name} Length ${visboportfolioversions.length} First ${visboportfolioversions[0].timestamp} Last ${visboportfolioversions[visboportfolioversions.length-1].timestamp} Perm ${JSON.stringify(this.combinedPerm)}`);
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
      this.visboprojectversionService.getVisboPortfolioVersions(null)
        .subscribe(
          visboportfolioversions => this.visboportfolioversions = visboportfolioversions,
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

  getVisboPortfolioKeyMetrics(): void {
    var showChart = this.showChart
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);
    this.showChart = false;

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.log(`get VPF Key metrics: Get ${visboprojectversions.length} Project Versions`);
          this.visboKeyMetricsCalc();
          if (this.hasVPPerm(this.permVP.ViewAudit)) {
            this.showChartOption(showChart);
          } else {
            this.showChartOption(false);
          }
          this.showChart = true;
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied for Visbo Portfolio KeyMetrics`);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.vpvRefDate} ${increment}`);
    var newRefDate = new Date(this.vpvRefDate.getTime());
    switch(this.refDateInterval) {
      case 'day':
        newRefDate.setDate(newRefDate.getDate() + increment)
        break;
      case 'week':
        newRefDate.setDate(newRefDate.getDate() + increment * 7)
        break;
      case 'month':
        newRefDate.setMonth(newRefDate.getMonth() + increment)
        break;
      case 'quarter':
        // newRefDate.setMinutes(newRefDate.getMinutes() + increment) // to force quarter skip
        var quarter = Math.trunc((newRefDate.getMonth() + 1) / 3);
        if (increment > 0) quarter += increment;
        newRefDate.setMonth(quarter * 3)
        newRefDate.setDate(1);
        newRefDate.setHours(0, 0, 0, 0);
        var diff = newRefDate.getTime() - this.vpvRefDate.getTime()
        if (diff == 0) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3)
        }
        break;
    }
    this.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    var today = new Date();
    if (newRefDate > today) { newRefDate = today }
    this.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    this.vpvRefDate = new Date(newRefDate.toISOString()); // to guarantee that the item is refreshed in UI
    this.getVisboPortfolioKeyMetrics();
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.visbokeymetrics = [];

    if (!this.visboprojectversions) return;
    // this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    var vpFilter = (this.vpFilter || '').toLowerCase();
    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!vpFilter
        || this.visboprojectversions[i].name.toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].VorlagenName || '').toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].businessUnit || '').toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].leadPerson || '').toLowerCase().indexOf(vpFilter) >= 0
        || (this.visboprojectversions[i].description || '').toLowerCase().indexOf(vpFilter) >= 0
      ) {
        if (this.visboprojectversions[i].keyMetrics) {
          var elementKeyMetric: VPVKeyMetricsCalc = new VPVKeyMetricsCalc();
          elementKeyMetric.name = this.visboprojectversions[i].name;
          elementKeyMetric._id = this.visboprojectversions[i]._id;
          elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
          elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
          elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;
          // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
          elementKeyMetric.savingCostTotal = (elementKeyMetric.keyMetrics.costCurrentTotal || 0) / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1) || 0;
          // if (elementKeyMetric.savingCostTotal > 2) elementKeyMetric.savingCostTotal = 2;
          elementKeyMetric.savingCostActual = (elementKeyMetric.keyMetrics.costCurrentActual || 0) / (elementKeyMetric.keyMetrics.costBaseLastActual || 1) || 0;
          // if (elementKeyMetric.savingCostActual > 2) elementKeyMetric.savingCostActual = 2;

          // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
          elementKeyMetric.savingEndDate = this.helperDateDiff(
            (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()),
            (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()), 'w') || 0;
            elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate);

          // Calculate the Deadlines Completion
          elementKeyMetric.timeCompletionTotal = (elementKeyMetric.keyMetrics.timeCompletionCurrentTotal || 0) / (elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal || 1) || 0;
          elementKeyMetric.timeCompletionActual = (elementKeyMetric.keyMetrics.timeCompletionCurrentActual || 0) / (elementKeyMetric.keyMetrics.timeCompletionBaseLastActual || 1) || 0;

          // Calculate the Delivery Completion
          elementKeyMetric.deliveryCompletionTotal = (elementKeyMetric.keyMetrics.deliverableCompletionCurrentTotal || 0) / (elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal || 1) || 0;
          elementKeyMetric.deliveryCompletionActual = (elementKeyMetric.keyMetrics.deliverableCompletionCurrentActual || 0) / (elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual || 1) || 0;

          this.visbokeymetrics.push(elementKeyMetric)
        }
      } else {
        // this.log(`Remove ${this.visboprojectversions[i].name} Vorlage ${this.visboprojectversions[i].VorlagenName} BU ${this.visboprojectversions[i].businessUnit} Lead ${this.visboprojectversions[i].leadPerson} Desc ${this.visboprojectversions[i].description} vs  by Filter  ${this.vpFilter}`);
      }
    }
    this.sortKeyMetricsTable(undefined);
    this.visboKeyMetricsCalcBubble();
  }

  changeChart() {
    this.log(`Switch Chart from ${this.typeMetricChartX} vs  ${this.typeMetricChartY} to ${this.typeMetricX} vs  ${this.typeMetricY}`);
    this.typeMetricChartX = this.typeMetricList.find(x => x.name == this.typeMetricX).metric;
    this.typeMetricChartY = this.typeMetricList.find(x => x.name == this.typeMetricY).metric;
    this.visboKeyMetricsCalc();
    this.showChart = true;
  }

  drawChart(visible: boolean) {
    this.showChart = visible;
  }

  visboKeyMetricsCalcBubble(): void {
    this.graphBubbleOptions = {
        // 'chartArea':{'left':20,'top':0,'width':'100%','height':'100%'},
        'width': '100%',
        // 'title':'Key Metrics: Total Cost vs. End Date Plan vs. Base Line',
        // 'colorAxis': {'colors': ['red', 'yellow', 'green'], 'minValue': 0, 'maxValue': 2, 'legend': {'position': 'none'}},
        // 'vAxis': {'title': 'Delayed \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 End date (weeks) \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 Ahead', 'baselineColor': 'blue'},
        'vAxis': {'direction': -1, 'title': 'Change in End Date (weeks)', 'baselineColor': 'blue'},
        'hAxis': {'baseline': 1, 'direction': -1, 'format': 'decimal', 'title': 'Total Cost', 'baselineColor': 'blue'},
        // 'sizeAxis': {'minValue': 20, 'maxValue': 200},
        // 'chartArea':{'left':20,'top':30,'width':'100%','height':'90%'},
        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'bubble': { 'textStyle': { 'auraColor': 'none', 'fontSize': 13 } },
        'tooltip': { 'showColorCode': false }
      };

    this.graphBubbleAxis(); // set the Axis Description and properties

    var keyMetrics: any = [];
    if (!this.visbokeymetrics) return;
    if (this.visbokeymetrics.length > 20) this.graphBubbleOptions.bubble.textStyle.fontSize = 1
    keyMetrics.push(['ID', this.graphBubbleLabelX, this.graphBubbleLabelY, 'Key Metrics Status', 'Total Cost (Base Line) in k\u20AC']);
    for (var i = 0; i < this.visbokeymetrics.length; i++) {
      // var colorValue = (this.visbokeymetrics[i].savingCostTotal <= 1 ? 1 : 0) +
      //                   (this.visbokeymetrics[i].savingEndDate <= 0 ? 1 : 0);
      var colorValue = 0;
      var valueX: number;
      var valueY: number;
      switch (this.typeMetricChartX) {
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
      switch (this.typeMetricChartY) {
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
      ])
    }
    this.calcRangeAxis();
    this.graphBubbleData = keyMetrics;
  }

  calcRangeAxis(): void {
    var rangeAxis: number = 0;
    var minSize: number = Infinity, maxSize: number = 0;

    for (var i=0; i < this.visbokeymetrics.length; i++) {
      minSize = Math.min(minSize, this.visbokeymetrics[i].keyMetrics.costBaseLastTotal)
      maxSize = Math.max(maxSize, this.visbokeymetrics[i].keyMetrics.costBaseLastTotal)
      switch (this.typeMetricChartX) {
        case 'Costs':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].savingCostTotal-1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].savingEndDate));
          break;
        case 'Deadlines':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].timeCompletionActual-1) * 100));
          break;
        case 'Deliveries':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].deliveryCompletionActual-1) * 100));
          break;
      }
    }
    // Set the Min/Max Values for the Size of the bubbles decreased/increased by 20%
    // minSize = Math.max(minSize - 100, 0)
    // maxSize += 100;
    minSize *= 0.8
    maxSize *= 1.2;
    if (!this.graphBubbleOptions.sizeAxis) this.graphBubbleOptions.sizeAxis = {};
    this.graphBubbleOptions.sizeAxis.minValue = minSize;
    this.graphBubbleOptions.sizeAxis.maxValue = maxSize;

    if (this.typeMetricChartX == 'EndDate') {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = -rangeAxis;
      this.graphBubbleOptions.hAxis.maxValue = rangeAxis;
    } else {
      rangeAxis *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = 100 - rangeAxis;
      this.graphBubbleOptions.hAxis.maxValue = 100 + rangeAxis;
    }

    rangeAxis = 0;
    for (var i=0; i < this.visbokeymetrics.length; i++) {
      switch (this.typeMetricChartY) {
        case 'Costs':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].savingCostTotal-1) * 100));
          break;
        case 'EndDate':
          rangeAxis = Math.max(rangeAxis, Math.abs(this.visbokeymetrics[i].savingEndDate));
          break;
        case 'Deadlines':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].timeCompletionActual-1) * 100));
          break;
        case 'Deliveries':
          rangeAxis = Math.max(rangeAxis, Math.abs((this.visbokeymetrics[i].deliveryCompletionActual-1) * 100));
          break;
      }
    }
    if (this.typeMetricChartY == 'EndDate') {
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
    switch (this.typeMetricChartX) {
      case 'Costs':
        this.graphBubbleOptions.hAxis = {'baseline': 100, 'direction': -1, 'format': 'decimal', 'title': 'Total Cost vs Base Line (%)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelX = 'Planned Total Cost in %';
        break;
      case 'EndDate':
        this.graphBubbleOptions.hAxis = {'baseline': 0, 'direction': -1, 'title': 'Change in End Date (weeks)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelX = 'Change in End Date (Weeks)';
        break;
      case 'Deadlines':
        this.graphBubbleOptions.hAxis = {'baseline': 100, 'direction': 1, 'format': 'decimal', 'title': 'Achieved Deadlines vs Base Line (%)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelX = 'Achieved Deadlines in %';
        break;
      case 'Deliveries':
        this.graphBubbleOptions.hAxis = {'baseline': 100, 'direction': 1, 'format': 'decimal', 'title': 'Achieved Deliveries vs Base Line (%)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelX = 'Achieved Deliveries in %';
        break;
    }
    switch (this.typeMetricChartY) {
      case 'Costs':
        this.graphBubbleOptions.vAxis = {'baseline': 100, 'direction': -1, 'format': 'decimal', 'title': 'Total Cost vs Base Line (%)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelY = 'Planned Total Cost in %';
        break;
      case 'EndDate':
        this.graphBubbleOptions.vAxis = {'baseline': 0, 'direction': -1, 'title': 'Change in End Date (weeks)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelY = 'Change in End Date (Weeks)';
        break;
      case 'Deadlines':
        this.graphBubbleOptions.vAxis = {'baseline': 100, 'direction': 1, 'format': 'decimal', 'title': 'Achieved Deadlines vs Base Line (%)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelY = 'Achieved Deadlines in %';
      break;
      case 'Deliveries':
        this.graphBubbleOptions.vAxis = {'baseline': 100, 'direction': 1, 'format': 'decimal', 'title': 'Achieved Deliveries vs Base Line (%)', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'};
        this.graphBubbleLabelY = 'Achieved Deliveries in %';
        break;
    }
    this.graphBubbleOptions.series = {};
    this.graphBubbleOptions.series.Critical = {color: this.colorMetric[0].color};
    this.graphBubbleOptions.series.Warning = {color: this.colorMetric[1].color};
    this.graphBubbleOptions.series.Good = {color: this.colorMetric[2].color};
    // this.log(`Series: ${JSON.stringify(this.graphBubbleOptions.series)}`)
  }

  // get the details of the project
  gotoVPDetail(visboproject: VisboProject):void {
    var deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoClickedRow(vpv: VPVKeyMetricsCalc):void {
    this.log(`goto VP ${vpv.name} (${vpv.vpid}) Deleted? ${this.deleted}`);
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVC(visboproject: VisboProject):void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  chartSelectRow(row: number, label: string) {
    // this.log(`Bubble Chart: ${row} ${label}`);
    var vpv = this.visbokeymetrics.find(x => x.name == label)

    this.log(`Navigate to: ${vpv.vpid} ${vpv.name}`);
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  dropDownInit() {
    this.log(`Init Drop Down List ${this.visboportfolioversions.length}`);
    this.dropDown = [];
    var len = this.visboportfolioversions.length;

    for (var i = 0; i < len; i++) {
      var timestamp = new Date(this.visboportfolioversions[i].timestamp);
      var text = 'Version '.concat((len -i).toString(), ' from ', moment(timestamp).format('DD.MM.YYYY HH:mm'));
      this.dropDown.push({name: text, version: i })
    }
    if (len > 0 ) this.dropDownSelected = this.dropDown[0].name;
    // this.log(`Init Drop Down List Finished ${this.dropDown.length} Selected ${this.dropDownSelected}`);
  }

  changePFVersion() {
    this.dropDownValue = this.dropDown.find(x => x.name == this.dropDownSelected).version;
    this.log(`Change Drop Down ${this.dropDownSelected} ${this.dropDownValue}`);
    this.vpfActive = this.visboportfolioversions[this.dropDownValue];
    this.getVisboPortfolioKeyMetrics();
  }

  selectedMetric(metric: string): boolean {
    if (this.typeMetricChartX == metric || this.typeMetricChartY == metric) {
      return true;
    } else {
      return false;
    }
  }

  showChartOption(newStatus: boolean = undefined): void {
    if (newStatus == undefined) this.chart = !this.chart
    else this.chart = newStatus
    this.chartButton = this.chart ? "Show List" : "Show Chart";
    this.log(`Switch Chart to ${this.chart}`);
  }

  showTempList(newStatus: boolean): void {
    if (newStatus == undefined) return;
    this.log(`Switch temp List from ${this.tempList} to ${newStatus} Date ${this.tempDate}`);
    if (this.tempList == undefined && newStatus == true) {
      if (this.tempDate) this.log(`Compare ${(new Date).getTime() - this.tempDate.getTime()} ${(new Date).toISOString()} ${this.tempDate.toISOString()}`);
      if (this.tempDate  == undefined || (new Date).getTime() - this.tempDate.getTime() > 300 ) {
        this.tempChart = this.chart;
        this.chart = false
        this.tempList = true;
      }
    }
    if (newStatus == false) {
      this.chart = this.tempChart;
      this.tempList = undefined;
      this.tempDate = new Date();
    }
  }

  helperVpIndex(vpIndex: number):void {
    this.log(`VP Helper: ${vpIndex}`);
    // this.auditIndex = auditIndex
  }

  helperDateDiff(from: string, to: string, unit: string) {
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
    }
    // this.log(`Sort Key Metrics: Col ${n} Asc ${this.sortAscending}`);

    if (this.sortColumn == 1) {
      // sort by VPV name
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.name > b.name)
          result = 1;
        else if (a.name < b.name)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by keyMetrics Diff Cost
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.savingCostTotal > b.savingCostTotal)
          result = 1;
        else if (a.savingCostTotal < b.savingCostTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by keyMetrics TotalCost
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.costBaseLastTotal > b.keyMetrics.costBaseLastTotal)
          result = 1;
        else if (a.keyMetrics.costBaseLastTotal < b.keyMetrics.costBaseLastTotal)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by keyMetrics saving EndDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.savingEndDate > b.savingEndDate)
          result = 1;
        else if (a.savingEndDate < b.savingEndDate)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.endDateBaseLast > b.keyMetrics.endDateBaseLast)
          result = 1;
        else if (a.keyMetrics.endDateBaseLast < b.keyMetrics.endDateBaseLast)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 6) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        return a.timeCompletionActual - b.timeCompletionActual
      })
    } else if (this.sortColumn == 7) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.timeCompletionBaseLastActual - b.keyMetrics.timeCompletionBaseLastActual
      })
    } else if (this.sortColumn == 8) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        return a.deliveryCompletionActual - b.deliveryCompletionActual
      })
    } else if (this.sortColumn == 9) {
      // sort by keyMetrics endDate
      this.visbokeymetrics.sort(function(a, b) {
        return a.keyMetrics.deliverableCompletionBaseLastActual - b.keyMetrics.deliverableCompletionBaseLastActual
      })
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
