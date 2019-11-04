import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-visboproject-keymetrics',
  templateUrl: './visboproject-keymetrics.component.html'
})
export class VisboProjectKeyMetricsComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];

  vpSelected: string;
  vpActive: VisboProject;
  deleted: boolean = false;

  chartButton: string = "Show List";
  chart: boolean = true;
  parentThis: any;

  typeMetricList: any[] = [
    {name: "Total & Actual Cost", metric: "Costs"},
    {name: "Reached End Dates", metric: "Dates"},
    {name: "Delivery Completion", metric: "Deliveries"}
  ];
  typeMetric: string = this.typeMetricList[0].name;
  typeMetricChart: string = this.typeMetricList[0].metric;

  graphDataLineChart: any[] = [];
  graphOptionsLineChart: any = undefined;

  sortAscending: boolean = false;
  sortColumn: number = 1;

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
    this.getVisboProjectVersions();
  }

  onSelect(visboprojectversion: VisboProjectVersion): void {
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm == undefined) return false
    return (this.combinedPerm.vp & perm) > 0
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var i: number;
    this.vpSelected = id;
    var chartFlag = this.chart;

    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, "", true)
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
      this.visboprojectversionService.getVisboProjectVersions(id, false, "", true)
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
              this.alertService.error(`Permission Denied for Visbo Project Versions`);
            } else {
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values to show in Chart and List
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

        // Calculate the Delivery Completion
        var negative = elementKeyMetric.savingEndDate > 0 ? 1 : -1;
        elementKeyMetric.score = 0;
        elementKeyMetric.score += Math.max(elementKeyMetric.savingEndDate, 20 * negative) * 5;
        elementKeyMetric.score += elementKeyMetric.savingCostTotal;

        this.visbokeymetrics.push(elementKeyMetric)
      }
    }
    this.visboKeyMetricsCostOverTime();
  }

  visboKeyMetricsCostOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '1200',
        'title':'Actual & Total Cost Plan vs. Base Line',

        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'vAxis': {'title': 'Cost in k'},
        'hAxis': {format: 'dd.MM.yy'},
        'pointSize': 10,
        'curveType': 'function',
        'series': {
            '0': { lineWidth: 6, pointShape: 'circle' },
            '1': { lineWidth: 2, pointShape: 'diamond', lineDashStyle: [4, 4] },
            '2': { lineWidth: 6, pointShape: 'circle' },
            '3': { lineWidth: 2, pointShape: 'diamond', lineDashStyle: [4, 4] }
          },
        'colors': ['blue', 'blue', 'green', 'green']
      };
    var keyMetricsCost: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) this.visboprojectversions[i].keyMetrics =  new VPVKeyMetrics;
      keyMetricsCost.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costCurrentActual || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastActual || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costCurrentTotal || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastTotal || 0)
      ])
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var duplicate = keyMetricsCost.length - 1;
    // this.log(`visboKeyMetrics duplicate ${duplicate} ${JSON.stringify(this.visboprojectversions[duplicate])}`);
    keyMetricsCost.push([
      new Date(),
      keyMetricsCost[duplicate][1],
      keyMetricsCost[duplicate][2],
      keyMetricsCost[duplicate][3],
      keyMetricsCost[duplicate][4],
    ])

    keyMetricsCost.push(['Timestamp', 'Actual Cost', 'Actual Cost (Base Line)', 'Total Cost', 'Total Cost (Base Line)']);
    keyMetricsCost.reverse();
    // this.log(`visboKeyMetrics VP cost budget  ${JSON.stringify(keyMetricsCost)}`);
    this.graphDataLineChart = keyMetricsCost;
  }

  visboKeyMetricsDatesOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '1200',
        'title':'Completion of Dead Lines vs. Base Line',

        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'vAxis': {'title': 'Sum of weighted completed dead lines'},
        'hAxis': {format: 'dd.MM.yy'},
        'pointSize': 10,
        'curveType': 'function',
        'series': {
            '0': { lineWidth: 6, pointShape: 'circle' },
            '1': { lineWidth: 2, pointShape: 'diamond', lineDashStyle: [4, 4] },
            '2': { lineWidth: 6, pointShape: 'circle' },
            '3': { lineWidth: 2, pointShape: 'diamond', lineDashStyle: [4, 4] }
          },
        'colors': ['blue', 'blue', 'green', 'green']
      };
    var keyMetricsCost: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) this.visboprojectversions[i].keyMetrics = new VPVKeyMetrics;
      keyMetricsCost.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastTotal || 0) * 100)/100
      ])
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var duplicate = keyMetricsCost.length - 1;
    // this.log(`visboKeyMetrics duplicate ${duplicate} ${JSON.stringify(this.visboprojectversions[duplicate])}`);
    keyMetricsCost.push([
      new Date(),
      keyMetricsCost[duplicate][1],
      keyMetricsCost[duplicate][2],
      keyMetricsCost[duplicate][3],
      keyMetricsCost[duplicate][4],
    ])

    keyMetricsCost.push(['Timestamp', 'Actual Date Completion', 'Actual Dates (Base Line)', 'Total Date Completion', 'Total Dates (Base Line)']);
    keyMetricsCost.reverse();
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetricsCost)}`);
    this.graphDataLineChart = keyMetricsCost;
  }

  visboKeyMetricsDeliveriesOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '1200',
        'title':'Completion of Deliveries vs. Base Line',

        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'vAxis': {'title': 'Sum of weighted completed deliveries'},
        'hAxis': {format: 'dd.MM.yy'},
        'curveType': 'function',
        'pointSize': 10,
        'series': {
            '0': { lineWidth: 6, pointShape: 'circle' },
            '1': { lineWidth: 2, pointShape: 'diamond', lineDashStyle: [4, 4] },
            '2': { lineWidth: 6, pointShape: 'circle' },
            '3': { lineWidth: 2, pointShape: 'diamond', lineDashStyle: [4, 4] }
          },
        'colors': ['blue', 'blue', 'green', 'green']
      };
    var keyMetricsCost: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) this.visboprojectversions[i].keyMetrics = new VPVKeyMetrics;
      keyMetricsCost.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastTotal || 0) * 100)/100
      ])
      this.log(`visboKeyMetrics push ${JSON.stringify(keyMetricsCost[keyMetricsCost.length-1])}`);
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var duplicate = keyMetricsCost.length - 1;
    // this.log(`visboKeyMetrics duplicate ${duplicate} ${JSON.stringify(this.visboprojectversions[duplicate])}`);
    keyMetricsCost.push([
      new Date(),
      keyMetricsCost[duplicate][1],
      keyMetricsCost[duplicate][2],
      keyMetricsCost[duplicate][3],
      keyMetricsCost[duplicate][4],
    ])

    keyMetricsCost.push(['Timestamp', 'Actual Delivery Completion', 'Actual Delivery (Base Line)', 'Total Delivery Completion', 'Total Delivery (Base Line)']);
    keyMetricsCost.reverse();
    // this.log(`visboKeyMetrics VP Delivery Completion  ${JSON.stringify(keyMetricsCost)}`);
    this.graphDataLineChart = keyMetricsCost;
  }

  toggleVisboProjectVersions(): void {
    this.deleted = !this.deleted
    var url = this.route.snapshot.url.join('/')
    this.log(`VP toggleVisboProjectVersions ${this.deleted} URL ${url}`);
    this.getVisboProjectVersions();
    // MS TODO: go to the current url and add delete flag
    this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion):void {
    this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], {});
}

  gotoVPDetail(visboproject: VisboProject):void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  changeChart() {
    this.log(`Switch Chart to ${this.typeMetric} `);
    this.typeMetricChart = this.typeMetricList.find(x => x.name == this.typeMetric).metric;
    switch (this.typeMetricChart) {
      case 'Costs':
        this.visboKeyMetricsCostOverTime();
        break;
      case 'Dates':
        this.visboKeyMetricsDatesOverTime();
        break;
      case 'Deliveries':
        this.visboKeyMetricsDeliveriesOverTime();
        break;
    }
  }

  switchChart() {
    this.chart = !this.chart
    this.chartButton = this.chart ? "View List" : "View Chart";
    // this.log(`Toggle Chart to ${this.chart} Graph ${JSON.stringify(this.graphDataLineChart)}`);
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

  sortVPVTable(n) {
    if (!this.visboprojectversions) return
    if (n != undefined) {
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n == 5 ) ? true : false;
      }
      else this.sortAscending = !this.sortAscending;
    }
    if (this.sortColumn == 1) {
      // sort by VPV Timestamp
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.timestamp > b.timestamp)
          result = 1;
        else if (a.timestamp < b.timestamp)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by VPV endDate
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.endDate > b.endDate)
          result = 1;
        else if (a.endDate < b.endDate)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by VPV ampelStatus
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.ampelStatus > b.ampelStatus)
          result = 1;
        else if (a.ampelStatus < b.ampelStatus)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by VPV Erloes
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.Erloes > b.Erloes)
          result = 1;
        else if (a.Erloes < b.Erloes)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort by VC vpvCount
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.variantName.toLowerCase() > b.variantName.toLowerCase())
          result = 1;
        else if (a.variantName.toLowerCase() < b.variantName.toLowerCase())
          result = -1;
        return result
      })
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
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
        if (a.timestamp > b.timestamp)
          result = 1;
        else if (a.timestamp < b.timestamp)
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
        if (a.score > b.score)
          result = 1;
        else if (a.score < b.score)
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
    this.messageService.add('VisboProjectVersion: ' + message);
  }
}
