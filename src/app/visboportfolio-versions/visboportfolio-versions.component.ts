import { Component, OnInit } from '@angular/core';

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

    vpSelected: string;
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    refDateInterval: string = "month";
    vpfActiveIndex: number;
    deleted: boolean = false;
    chartButton: string = "Show List";
    chart: boolean = true;
    parentThis: any;

    graphBubbleData: any[] = [];
    graphBubbleOptions: any = undefined;

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
            // this.combinedPerm = visboportfolio.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboPortfolioVersions(id, this.deleted)
              .subscribe(
                visboportfolioversions => {
                  this.visboportfolioversions = visboportfolioversions;
                  this.log(`get VPF ${this.vpActive.name} Length ${visboportfolioversions.length} Perm ${JSON.stringify(this.combinedPerm)}`);
                  this.vpfActive = visboportfolioversions[0];
                  this.vpfActiveIndex = visboportfolioversions.length;
                  this.combinedPerm = visboportfolioversions[0].perm;
                  this.dropDownInit();
                  this.getVisboPortfolioKeyMetrics();
                  this.log(`get VPF Index ${this.vpfActiveIndex}`);
                  // this.log(`get VPF ${this.vpActive.name} Length ${visboportfolioversions.length} First ${visboportfolioversions[0].timestamp} Last ${visboportfolioversions[visboportfolioversions.length-1].timestamp} Perm ${JSON.stringify(this.combinedPerm)}`);
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
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);
    var chartFlag = this.chart;
    this.chart = false;

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.log(`get VPF Key metrics: Get ${visboprojectversions.length} Project Versions`);
          this.visboKeyMetricsCalc();
          this.sortKeyMetricsTable(undefined);
          if (this.hasVPPerm(this.permVP.ViewAudit)) {
            this.chart = chartFlag;
          } else {
            this.chart = false;
          }

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
    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (this.visboprojectversions[i].keyMetrics) {
        var elementKeyMetric: VPVKeyMetricsCalc = new VPVKeyMetricsCalc();
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;
        // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
        elementKeyMetric.savingCostTotal = ((1 - (elementKeyMetric.keyMetrics.costCurrentTotal || 0) / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
        if (elementKeyMetric.savingCostTotal > 100) elementKeyMetric.savingCostTotal = 100;
        if (elementKeyMetric.savingCostTotal < -100) elementKeyMetric.savingCostTotal = -100;
        elementKeyMetric.savingCostTotal = Math.round(elementKeyMetric.savingCostTotal);
        elementKeyMetric.savingCostActual = ((1 - (elementKeyMetric.keyMetrics.costCurrentActual || 0) / (elementKeyMetric.keyMetrics.costBaseLastActual || 1)) * 100) || 0;

        // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
        elementKeyMetric.savingEndDate = this.helperDateDiff(
          (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()),
          (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()), 'w') || 0;
          elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate);

        // // Calculate the Score as a combination of Saving in Time & Cost
        // var negative = elementKeyMetric.savingEndDate > 0 ? 1 : -1;
        // elementKeyMetric.score = 0;
        // elementKeyMetric.score += Math.max(elementKeyMetric.savingEndDate, 20 * negative) * 5;
        // elementKeyMetric.score += elementKeyMetric.savingCostTotal;

        // Calculate the Delivery Completion
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal) {
          elementKeyMetric.deliveryCompletionTotal = 100;
        } else {
          elementKeyMetric.deliveryCompletionTotal = ((elementKeyMetric.keyMetrics.deliverableCompletionCurrentTotal || 0) / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal) * 100
        }
        // this.log(`calc keyMetrics Delivery Completion Detail ${JSON.stringify(elementKeyMetric.keyMetrics)} `);
        this.log(`calc keyMetrics Delivery Completion ${elementKeyMetric.deliveryCompletionTotal} ${elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal} ${elementKeyMetric.keyMetrics.deliverableCompletionCurrentTotal}`);
        this.visbokeymetrics.push(elementKeyMetric)
      }
    }
    this.visboKeyMetricsCostVsEndDate();
  }

  visboKeyMetricsCostVsEndDate(): void {
    this.graphBubbleOptions = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '1200',
        'title':'Savings in Cost and End Date against Base Line',
        'colorAxis': {'colors': ['red', 'green'], 'minValue': 0, 'maxValue': 100, 'legend': {'position': 'none'}},
        'vAxis': {'title': 'Savings in end date (weeks)', 'baselineColor': 'blue'},
        'hAxis': {'title': 'Savings in Overall Cost % from Base Line', 'minValue': -110, 'maxValue': 110, 'baselineColor': 'blue'},
        // 'chartArea':{'left':20,'top':30,'width':'100%','height':'90%'},
        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'bubble': { 'textStyle': { 'auraColor': 'none', 'fontSize': 11 } }
      };
    var keyMetrics: any = [];
    if (!this.visbokeymetrics) return;
    if (this.visbokeymetrics.length > 30) this.graphBubbleOptions.bubble.textStyle.fontSize = 1
    keyMetrics.push(['ID', 'Savings Cost in %', 'Savings End Date (weeks)', 'Delivery Completion in %', 'Cost Total (Base Line) in k']);
    var rangeSavingEndDate = 0;
    var rangeBaseLineRange = 0
    for (var i = 0; i < this.visbokeymetrics.length; i++) {
      rangeSavingEndDate = Math.max(rangeSavingEndDate, Math.abs(this.visbokeymetrics[i].savingEndDate));
      rangeBaseLineRange = Math.max(rangeBaseLineRange, Math.abs(this.visbokeymetrics[i].savingCostTotal));
      keyMetrics.push([
        this.visbokeymetrics[i].name,
        this.visbokeymetrics[i].savingCostTotal,
        this.visbokeymetrics[i].savingEndDate,
        this.visbokeymetrics[i].deliveryCompletionTotal,
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastTotal)
      ])
    }
    if (rangeBaseLineRange > 0) {
      rangeBaseLineRange *= 1.1;
      this.graphBubbleOptions.hAxis.minValue = -rangeBaseLineRange;
      this.graphBubbleOptions.hAxis.maxValue = rangeBaseLineRange;
    }
    if (rangeSavingEndDate > 0) {
      rangeSavingEndDate *= 1.1;
      this.graphBubbleOptions.vAxis.minValue = -rangeSavingEndDate;
      this.graphBubbleOptions.vAxis.maxValue = rangeSavingEndDate;
    }
    // this.log(`visboKeyMetrics Range budget ${rangeBaseLineRange} endDate ${rangeSavingEndDate} Options ${JSON.stringify(this.graphBubbleOptions)}`);
    this.graphBubbleData = keyMetrics;
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

  switchChart() {
    this.chart = !this.chart
    this.chartButton = this.chart ? "Show List" : "Show Chart";
    // this.log(`Switch Chart to ${this.chart} Graph ${JSON.stringify(this.graphData)}`);
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
      // sort by keyMetrics saving EndDate
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.savingEndDate > b.savingEndDate)
          result = 1;
        else if (a.savingEndDate < b.savingEndDate)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by keyMetrics TotalCost
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.keyMetrics.costBaseLastTotal > b.keyMetrics.costBaseLastTotal)
          result = 1;
        else if (a.keyMetrics.costBaseLastTotal < b.keyMetrics.costBaseLastTotal)
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
      // sort by keyMetrics Status
      this.visbokeymetrics.sort(function(a, b) {
        var result = 0
        if (a.deliveryCompletionTotal > b.deliveryCompletionTotal)
          result = 1;
        else if (a.deliveryCompletionTotal < b.deliveryCompletionTotal)
          result = -1;
        return result
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
