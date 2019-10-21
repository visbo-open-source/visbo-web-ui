import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { LoginComponent } from '../login/login.component';

class VPVKeyMetricsCalc {
  _id: string;
  name: string;
  vpid: string;
  timestamp: Date;
  savingCostTotal: number;
  savingCostActual: number;
  savingEndDate: number;
  status: number;
  keyMetrics: VPVKeyMetrics;
};

@Component({
  selector: 'app-visboportfolioversions',
  templateUrl: './visboportfolioversions.component.html'
})
export class VisboPortfolioVersionsComponent implements OnInit {

  visboportfolioversions: VisboPortfolioVersion[];
  visboprojectversions: VisboProjectVersion[];
  visbokeymetrics: VPVKeyMetricsCalc[];

  vpSelected: string;
  vpActive: VisboProject;
  vpfActive: VisboPortfolioVersion;
  vpvRefDate: Date = new Date();
  refDateInterval: string = "month";
  vpfActiveIndex: number;
  deleted: boolean = false;
  chartButton: string = "List";
  chart: boolean = true;

  graphBubbleData: any[] = [];
  graphBubbleOptions: any = undefined;

  sortAscending: boolean;
  sortColumn: number;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboPortfolioVersions();
  }

  // onSelect(visboprojectversion: VisboProjectVersion): void {
  //   this.getVisboPortfolioVersions();
  // }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm == undefined) return false
    return (this.combinedPerm.vp & perm) > 0
  }

  getVisboPortfolioVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
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
                  this.getVisboPortfolioKeyMetrics();
                  this.log(`get VPF Index ${this.vpfActiveIndex}`);
                  // this.log(`get VPF ${this.vpActive.name} Length ${visboportfolioversions.length} First ${visboportfolioversions[0].timestamp} Last ${visboportfolioversions[visboportfolioversions.length-1].timestamp} Perm ${JSON.stringify(this.combinedPerm)}`);
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  // redirect to login and come back to current URL
                  if (error.status == 403) {
                    this.alertService.error(`Permission Denied for Visbo Project Versions`);
                  } else if (error.status == 401) {
                    this.alertService.error(`Session expired, please login again`, true);
                    this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
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
            } else if (error.status == 401) {
              this.alertService.error(`Session expired, please login again`, true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
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
            // redirect to login and come back to current URL
            if (error.status == 403) {
              this.alertService.error(`Permission Denied for Visbo Project Versions`);
            } else if (error.status == 401) {
              this.alertService.error(`Session expired, please login again`, true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
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
          if (this.hasVPPerm(this.permVP.ViewAudit)) {
            this.chart = chartFlag;
          } else {
            this.chart = false;
          }

        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          // redirect to login and come back to current URL
          if (error.status == 403) {
            this.alertService.error(`Permission Denied for Visbo Portfolio KeyMetrics`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
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
        newRefDate.setHours(0);
        newRefDate.setMinutes(0);
        newRefDate.setSeconds(0);
        newRefDate.setMilliseconds(0);
        var diff = newRefDate.getTime() - this.vpvRefDate.getTime()
        if (diff == 0) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3)
        }
        break;
    }
    console.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    this.vpvRefDate = new Date(newRefDate.toISOString()); // to guarantee that the item is refreshed in UI
    this.getVisboPortfolioKeyMetrics();
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
    this.log(`calc keyMetrics Start`);
    this.visbokeymetrics = [];

    if (!this.visboprojectversions) return;
    this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (this.visboprojectversions[i].keyMetrics) {
        var elementKeyMetric: VPVKeyMetricsCalc = new VPVKeyMetricsCalc();
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;
        elementKeyMetric.savingCostTotal = ((1 - (elementKeyMetric.keyMetrics.costCurrentTotal || 0) / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
        if (elementKeyMetric.savingCostTotal > 100) elementKeyMetric.savingCostTotal = 100;
        if (elementKeyMetric.savingCostTotal < -100) elementKeyMetric.savingCostTotal = -100;
        elementKeyMetric.savingCostTotal = Math.round(elementKeyMetric.savingCostTotal);
        elementKeyMetric.savingCostActual = ((1 - (elementKeyMetric.keyMetrics.costCurrentActual || 0) / (elementKeyMetric.keyMetrics.costBaseLastActual || 1)) * 100) || 0;
        elementKeyMetric.savingEndDate = this.helperDateDiff(
          (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()),
          (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()), 'w') || 0;
          elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate);
        elementKeyMetric.status = 0;
        elementKeyMetric.status += elementKeyMetric.savingEndDate >= 0 ? (elementKeyMetric.savingEndDate > 0 ? 2: 1): 0;
        elementKeyMetric.status += elementKeyMetric.savingCostTotal >= 0 ? (elementKeyMetric.savingCostTotal > 0 ? 2: 1): 0;

        this.visbokeymetrics.push(elementKeyMetric)
      }
    }
    this.visboKeyMetricsCostVsEndDate();
  }

  visboKeyMetricsCostVsEndDate(): void {
    this.graphBubbleOptions = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '1200',
        'title':'Savings in Cost and End Date against Budget',
        'colorAxis': {'colors': ['red', 'green'], minValue: 0, maxValue: 4},
        'vAxis': {'title': 'Savings in end date (weeks)'},
        'hAxis': {'title': 'Savings in Overallcost % of Budget', minValue: -100, maxValue: 100},
        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'bubble': { 'textStyle': { 'auraColor': 'none', 'fontSize': 12 } }
      };
    var keyMetrics: any = [];
    if (!this.visbokeymetrics) return;
    keyMetrics.push(['ID', 'Savings Cost in %', 'Savings End Date (weeks)', 'Status', 'Cost Total Budget']);
    var rangeSavingEndDate = 0;
    var rangeBudgetRange = 0
    for (var i = 0; i < this.visbokeymetrics.length; i++) {
      rangeSavingEndDate = Math.max(rangeSavingEndDate, Math.abs(this.visbokeymetrics[i].savingEndDate));
      rangeBudgetRange = Math.max(rangeBudgetRange, Math.abs(this.visbokeymetrics[i].savingCostTotal));
      keyMetrics.push([
        this.visbokeymetrics[i].name,
        this.visbokeymetrics[i].savingCostTotal,
        this.visbokeymetrics[i].savingEndDate,
        this.visbokeymetrics[i].status,
        this.visboprojectversions[i].keyMetrics.costBaseLastTotal
      ])
    }
    this.graphBubbleOptions.hAxis.minValue = -rangeBudgetRange;
    this.graphBubbleOptions.hAxis.maxValue = rangeBudgetRange;
    this.graphBubbleOptions.vAxis.minValue = -rangeSavingEndDate;
    this.graphBubbleOptions.vAxis.maxValue = rangeSavingEndDate;
    // this.log(`visboKeyMetrics Range budget ${rangeBudgetRange} endDate ${rangeSavingEndDate} Options ${JSON.stringify(this.graphBubbleOptions)}`);
    this.graphBubbleData = keyMetrics;
  }

  // toggleVisboPortfolioVersions(): void {
  //   this.deleted = !this.deleted
  //   var url = this.route.snapshot.url.join('/')
  //   this.log(`VP toggleVisboPortfolioVersions ${this.deleted} URL ${url}`);
  //   this.getVisboPortfolioVersions();
  //   // MS TODO: go to the current url and add delete flag
  //   this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  // }
  //
  toggleVisboPortfolioVersion(): void {
    this.log(`VPF toggleVisboPortfolioVersion ${this.vpfActiveIndex}`);
    var index = this.visboportfolioversions.length - this.vpfActiveIndex;
    this.vpfActive = this.visboportfolioversions[index]

    this.log(`VPF toggleVisboPortfolioVersion ${this.vpfActive.timestamp}`);
    this.getVisboPortfolioKeyMetrics();
  }

  gotoClickedRow(vpv: VPVKeyMetricsCalc):void {
    this.log(`goto VP ${vpv.name} (${vpv.vpid}) Deleted? ${this.deleted}`);
    this.router.navigate(['vpv/'.concat(vpv.vpid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  // gotoVPDetail(visboportfolio: VisboProject):void {
  //   this.router.navigate(['vpDetail/'.concat(visboportfolio._id)]);
  // }
  //

  switchChart() {
    this.chart = !this.chart
    this.chartButton = this.chart ? "List" : "Chart";
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
    if (!this.visbokeymetrics) return
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
    this.log(`Sort Key Metrics: Col ${n} Asc ${this.sortAscending}`);

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
        if (a.status > b.status)
          result = 1;
        else if (a.status < b.status)
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
