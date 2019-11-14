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
  vpvActive: VisboProjectVersion;
  qualityCost: number;
  qualityDeadlines: number;
  qualityDelivery: number;
  delayEndDate: number;

  chartButton: string = "Show List";
  chart: boolean = true;
  parentThis: any;

  typeMetricList: any[] = [
    {name: "Total & Actual Cost", metric: "Costs"},
    {name: "Delivery Completion", metric: "Deliveries"},
    {name: "Reached Deadlines", metric: "Deadlines"}
  ];
  typeMetric: string = this.typeMetricList[0].name;
  typeMetricChart: string = this.typeMetricList[0].metric;

  // colors: string[] = ['#FF9900', '#FF9900', '#3399cc', '#3399cc'];
  colors: string[] = ['#F7941E', '#F7941E', '#458CCB', '#458CCB'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star', lineDashStyle: [4, 8, 8, 4] },
    '1': { lineWidth: 4, pointShape: 'star' },
    '2': { lineWidth: 4, pointShape: 'triangle', lineDashStyle: [8, 4, 4, 8] },
    '3': { lineWidth: 4, pointShape: 'triangle' }
  };

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
    this.parentThis = this;
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
    if (!this.visboprojectversions) return;
    // first element is the latest
    this.setVpvActive(this.visboprojectversions[0]);
    this.visboKeyMetricsCostOverTime();
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    var localA = new Date(dateA);
    var localB = new Date(dateB);
    localA.setHours(0,0,0,0);
    localB.setHours(0,0,0,0);
    // return false;
    return localA.getTime() == localB.getTime();
  }

  visboKeyMetricsCostOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '100%',
        'title':'Actual & Total Cost: Plan vs. Base Line',

        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'vAxis': {'title': 'Cost in k\u20AC'},
        'hAxis': {format: 'dd.MM.yy'},
        'pointSize': 14,
        'curveType': 'function',
        'series': this.series,
        'colors': this.colors
      };
    var keyMetricsCost: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        // this.visboprojectversions[i].keyMetrics =  new VPVKeyMetrics;
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1 && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i+1].timestamp}`);
        continue;
      }
      // this.log(`visboKeyMetrics Push  ${this.visboprojectversions[i].timestamp}`);
      keyMetricsCost.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastTotal || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costBaseLastActual || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costCurrentTotal || 0),
        Math.trunc(this.visboprojectversions[i].keyMetrics.costCurrentActual || 0)
      ])
    }
    keyMetricsCost.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var len = keyMetricsCost.length;
    // this.log(`visboKeyMetrics len ${len} ${JSON.stringify(this.visboprojectversions[len-1])}`);
    if (len == 1) {
      keyMetricsCost.push([
        new Date(),
        keyMetricsCost[len-1][1],
        keyMetricsCost[len-1][2],
        keyMetricsCost[len-1][3],
        keyMetricsCost[len-1][4]
      ])
    }

    keyMetricsCost.push(['Timestamp', 'Total Cost (Base Line)', 'Actual Cost (Base Line)', 'Total Cost', 'Actual Cost']);
    keyMetricsCost.reverse();
    // this.log(`visboKeyMetrics VP cost budget  ${JSON.stringify(keyMetricsCost)}`);
    this.graphDataLineChart = keyMetricsCost;
  }

  visboKeyMetricsDeliveriesOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '100%',
        'title':'Completion of Deliveries: Plan vs. Base Line',

        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'vAxis': {'title': 'Weighted Number of Deliveries completed'},
        'hAxis': {format: 'dd.MM.yy'},
        'curveType': 'function',
        'pointSize': 14,
        'series': this.series,
        'colors': this.colors
      };
    var keyMetrics: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1 && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i+1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionBaseLastActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.deliverableCompletionCurrentActual || 0) * 100)/100
      ])
      this.log(`visboKeyMetrics push ${JSON.stringify(keyMetrics[keyMetrics.length-1])}`);
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var len = keyMetrics.length;
    // this.log(`visboKeyMetrics duplicate ${len-1} ${JSON.stringify(this.visboprojectversions[len-1])}`);
    if (len == 1) {
      keyMetrics.push([
        new Date(),
        keyMetrics[len-1][1],
        keyMetrics[len-1][2],
        keyMetrics[len-1][3],
        keyMetrics[len-1][4],
      ])
    }

    keyMetrics.push(['Timestamp', 'Total Delivery (Base Line)', 'Actual Delivery (Base Line)', 'Total Delivery Completion', 'Actual Delivery Completion' ]);
    keyMetrics.reverse();
    // this.log(`visboKeyMetrics VP Delivery Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
  }

  visboKeyMetricsDeadlinesOverTime(): void {
    this.graphOptionsLineChart = {
        // 'chartArea':{'left':20,'top':0,'width':'800','height':'100%'},
        'width': '100%',
        'title':'Achievement of Deadlines current & plan',

        'explorer': {'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': .01},
        'vAxis': {'title': 'Number of weighted completed Deadlines'},
        'hAxis': {format: 'dd.MM.yy'},
        'pointSize': 12,
        'curveType': 'function',
        'series': this.series,
        'colors': this.colors
        // 'series': {
        //   '0': { lineWidth: 3, pointShape: 'triangle', lineDashStyle: [6, 6] },
        //   '1': { lineWidth: 4, pointShape: 'triangle' }
        // },
        // 'colors': ['#458CCB', '#458CCB']
      };
      //
      // colors: string[] = ['#F7941E', '#F7941E', '#458CCB', '#458CCB'];
      // series: any =  {
      //   '0': { lineWidth: 3, pointShape: 'diamond', lineDashStyle: [6, 6] },
      //   '1': { lineWidth: 4, pointShape: 'diamond' },
      //   '2': { lineWidth: 3, pointShape: 'circle', lineDashStyle: [6, 6] },
      //   '3': { lineWidth: 4, pointShape: 'circle' }
      // };
      //
    var keyMetrics: any = [];
    if (!this.visboprojectversions) return;

    for (var i = 0; i < this.visboprojectversions.length; i++) {
      if (!this.visboprojectversions[i].keyMetrics) {
        continue;
      }
      // skip multiple versions per day
      if (i < this.visboprojectversions.length - 1 && this.sameDay(this.visboprojectversions[i].timestamp, this.visboprojectversions[i + 1].timestamp)) {
        this.log(`visboKeyMetrics Skip Same Day  ${this.visboprojectversions[i].timestamp}  ${this.visboprojectversions[i+1].timestamp}`);
        continue;
      }
      keyMetrics.push([
        new Date(this.visboprojectversions[i].timestamp),
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastActual || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentTotal || 0) * 100)/100,
        Math.round((this.visboprojectversions[i].keyMetrics.timeCompletionCurrentActual || 0) * 100)/100
        // Math.round(
        //   ((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastTotal || 0)
        //   - (this.visboprojectversions[i].keyMetrics.timeCompletionCurrentTotal || 0))),
        // Math.round(
        //   ((this.visboprojectversions[i].keyMetrics.timeCompletionBaseLastActual || 0)
        //   - (this.visboprojectversions[i].keyMetrics.timeCompletionCurrentActual || 0)))
      ])
    }
    keyMetrics.sort(function(a, b) { return a[0] - b[0] });
    // we need at least 2 items for Line Chart and show the current status for today
    var len = keyMetrics.length - 1;
    // this.log(`visboKeyMetrics duplicate ${len-1} ${JSON.stringify(this.visboprojectversions[len-1])}`);
    if (len == 1) {
      keyMetrics.push([
        new Date(),
        keyMetrics[len-1][1],
        keyMetrics[len-1][2],
        keyMetrics[len-1][3],
        keyMetrics[len-1][4]
      ])
    }

    keyMetrics.push(['Timestamp', 'Total Deadlines (Base Line)', 'Actual Deadlines (Base Line)', 'Total Date Completion', 'Actual Date Completion']);
    // keyMetrics.push(['Timestamp', 'All Deadlines', 'Past Deadlines']);
    keyMetrics.reverse();
    // this.log(`visboKeyMetrics VP Date Completion  ${JSON.stringify(keyMetrics)}`);
    this.graphDataLineChart = keyMetrics;
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

  chartSelectRow(row: number, col: number, label: string) {
    this.log(`Line Chart: User selected ${row} ${col} ${label}`);
    this.setVpvActive(this.visboprojectversions.find(x => (new Date(x.timestamp)).getTime() == (new Date(label)).getTime()));
    this.log(`Line Chart: User selected ${row} ${col} ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
  }

  setVpvActive(vpv: VisboProjectVersion) : void {
    var keyMetrics = vpv.keyMetrics;
    var index: number;
    let level1 = 0.05;
    let level2 = 0.15;
    this.vpvActive = vpv;
    index = keyMetrics.costCurrentTotal / (keyMetrics.costBaseLastTotal || 1)
    if (index < 1 + level1) this.qualityCost = 1
    else if (index < 1 + level2) this.qualityCost = 2
    else this.qualityCost = 3

    index = keyMetrics.timeCompletionCurrentActual / (keyMetrics.timeCompletionBaseLastActual || 1)
    if (index > 1 - level1) this.qualityDeadlines = 1
    else if (index > 1 - level2) this.qualityDeadlines = 2
    else this.qualityDeadlines = 3

    index = keyMetrics.deliverableCompletionCurrentActual / (keyMetrics.deliverableCompletionBaseLastActual || 1)
    if (index > 1 - level1) this.qualityDelivery = 1
    else if (index > 1 - level2) this.qualityDelivery = 2
    else this.qualityDelivery = 3

    index = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    this.delayEndDate = Math.round(index / 1000 / 60 / 60 / 24) / 7;
    this.log(`Quality Cost ${this.qualityCost} Del. ${this.qualityDelivery} Dead. ${this.qualityDeadlines} EndDate ${this.delayEndDate}`);
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
      case 'Deadlines':
        this.visboKeyMetricsDeadlinesOverTime();
        break;
      case 'Deliveries':
        this.visboKeyMetricsDeliveriesOverTime();
        break;
    }
  }

  switchTo(metric: string) {
    this.log(`Switch Chart to ${metric} `);
    this.typeMetricChart = metric;
    this.typeMetric = this.typeMetricList.find(x => x.metric == metric).name;
    switch (metric) {
      case 'Costs':
        this.visboKeyMetricsCostOverTime();
        break;
      case 'Deadlines':
        this.visboKeyMetricsDeadlinesOverTime();
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
    this.messageService.add('VisboProjectVersion: ' + message);
  }
}
