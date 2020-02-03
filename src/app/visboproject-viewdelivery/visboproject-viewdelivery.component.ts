import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVDelivery } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-visboproject-viewdelivery',
  templateUrl: './visboproject-viewdelivery.component.html'
})
export class VisboProjectViewDeliveryComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];

  vpSelected: string;
  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  initVPVID: string;
  vpvDelivery: VPVDelivery[];
  filterStatus: string;
  vpvDeliveryDate: any = [];
  vpvActualDataUntil: Date;
  deleted: boolean = false;

  refDateInterval: string = "month";
  vpvRefDate: Date;
  scrollRefDate: Date;
  chartButton: string = "View List";
  chart: boolean = true;
  history: boolean = false;
  historyButton: string = "View Trend"
  parentThis: any;

  colors: string[] = ['darkgreen', 'green', 'orange', 'red'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star', lineDashStyle: [4, 8, 8, 4] }
  };

  graphPastDataPieChart: any[] = [];
  graphBeforePastDataPieChart: any[] = [];
  graphPastPieLegend: any;
  graphPastOptionsPieChart: any = undefined;
  divPastPieChart: string = "divPastPieChart";

  graphFutureDataPieChart: any[] = [];
  graphBeforeFutureDataPieChart: any[] = [];
  graphFuturePieLegend: any;
  graphFutureOptionsPieChart: any = undefined;
  divFuturePieChart: string = "divFuturePieChart";

  sortAscending: boolean = false;
  sortColumn: number = 1;
  sortAscendingDelivery: boolean = false;
  sortColumnDelivery: number = 1;

  today: Date = new Date();

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
    if (this.route.snapshot.queryParams.vpvid) {
      this.initVPVID = this.route.snapshot.queryParams.vpvid
    }
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
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, "", false)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.log(`get VPV: Get ${visboprojectversions.length} Project Versions`);
                  if (visboprojectversions.length > 0) {
                    this.sortVPVTable();
                  }
                  var initIndex = 0
                  if (this.initVPVID) {
                    for (var i=0; i < visboprojectversions.length; i++) {
                      if (visboprojectversions[i]._id.toString() == this.initVPVID) {
                        initIndex = i;
                        break;
                      }
                    }
                  }
                  this.visboDeliveryCalc(initIndex);
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
    }
  }

  visboDeliveryCalc(index: number): void {
    var chartFlag = this.chart;
    this.chart = false;
    this.vpvActive = this.visboprojectversions[index]
    this.vpvRefDate = this.vpvActive.timestamp;
    if (this.scrollRefDate == undefined) this.scrollRefDate = new Date(this.vpvRefDate);
    if (!this.vpvActive) return;

    this.log(`Delivery Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getDelivery(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].deliveries.length} Delivery entries`);
          if (visboprojectversions.length != 1 || !visboprojectversions[0].deliveries) {
            this.log(`get VPV Calc: Reset Delivery to empty `);
            this.initDeliveries(undefined);
          } else {
            this.log(`Store Delivery for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].deliveries.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.initDeliveries(visboprojectversions[0].deliveries);
            this.vpvActualDataUntil = visboprojectversions[0].actualDataUntil;
            this.visboprojectversions[index].deliveries = this.vpvDelivery;
            this.visboprojectversions[index].actualDataUntil = visboprojectversions[0].actualDataUntil;
          }

          this.visboViewPastDeliveryPie();
          this.visboViewFutureDeliveryPie();
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

  initDeliveries(deliveries: VPVDelivery[]): void {
    var filterDeliveries: VPVDelivery[] = [];
    if (deliveries == undefined) {
      this.vpvDelivery = deliveries;
      return;
    }
    // generate long Names
    for (var i = 0; i < deliveries.length; i++) {
      deliveries[i].fullName = this.getFullName(deliveries[i]);
      deliveries[i].status = this.statusList[this.getStatus(deliveries[i])];
      if (!this.filterStatus  || this.filterStatus ==  deliveries[i].status) {
        filterDeliveries.push(deliveries[i]);
      }
    }
    this.vpvDelivery = filterDeliveries;
    // this.vpvDeliveryDate = [];
    // if (this.vpvDelivery.length > 0) {
    //   var newDelivery = new VPVDelivery();
    //   newDelivery.phasePFV = this.vpvDelivery[0].phasePFV;
    //   newDelivery.fullName = this.vpvDelivery[0].fullName;
    //   newDelivery.name = this.vpvDelivery[0].name;
    //   newDelivery.datePFV = this.vpvDelivery[0].datePFV;
    //   newDelivery.dateVPV = this.vpvDelivery[0].dateVPV;
    //   this.vpvDeliveryDate.push(newDelivery);
    // }
    // for (var i = 1; i < this.vpvDelivery.length; i++) {
    //   if (this.vpvDelivery[i-1].phasePFV != this.vpvDelivery[i].phasePFV) {
    //     var newDelivery = new VPVDelivery();
    //     newDelivery.phasePFV = this.vpvDelivery[i].phasePFV;
    //     newDelivery.fullName = this.vpvDelivery[i].fullName;
    //     newDelivery.name = this.vpvDelivery[i].name;
    //     newDelivery.datePFV = this.vpvDelivery[i].datePFV;
    //     newDelivery.dateVPV = this.vpvDelivery[i].dateVPV;
    //     this.vpvDeliveryDate.push(newDelivery);
    //   }
    // }
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    var localA = new Date(dateA);
    var localB = new Date(dateB);
    localA.setHours(0,0,0,0);
    localB.setHours(0,0,0,0);
    // return false;
    return localA.getTime() == localB.getTime();
  }

  statusList: string[] = ["Ahead", "In Time", "Delay", "Not Completed", "Unknown"]

  getStatus(element: VPVDelivery): number {

    var today = new Date();
    var isPast = (new Date(element.datePFV)).getTime() <= today.getTime()

    var status: number = 0;
    if (isPast && element.done < 1) status = 3;
    else if (element.changeDays < 0) status = 0;
    else if (element.changeDays == 0) status = 1;
    else status = 2;
    return status
  }

  visboViewPastDeliveryPie(): void {
    // if (!this.vpvDelivery || this.vpvDelivery.length == 0) return;
    this.graphPastOptionsPieChart = {
        title:'Past Delivery Status',
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphPastPieLegend = [["string", "Action Type"],
                        ["number", "Count"]
      ];

    var pastDeliveryStatus: any = [];
    var graphData = [];
    var status;
    var today = new Date();
    for (var i = 0; i < this.statusList.length; i++) {
      pastDeliveryStatus[i] = 0;
    }
    var nonEmpty: boolean = false;
    for (var i = 0; i < this.vpvDelivery.length; i++) {
      if ((new Date(this.vpvDelivery[i].datePFV)).getTime() <= today.getTime()) {
        // entry from the past
        status = this.getStatus(this.vpvDelivery[i]);
        pastDeliveryStatus[status] += 1
        nonEmpty = true;
      }
    }
    for (var i = 0; i < pastDeliveryStatus.length; i++) {
      graphData.push([this.statusList[i], pastDeliveryStatus[i]])
    }

    this.graphBeforePastDataPieChart = this.graphPastDataPieChart;
    if (nonEmpty) {
      this.graphPastDataPieChart = graphData;
    } else {
      this.graphPastDataPieChart = [];
    }
  }

  visboViewFutureDeliveryPie(): void {
    // if (!this.vpvDelivery || this.vpvDelivery.length == 0) return;
    this.graphFutureOptionsPieChart = {
        title:'Future Delivery Status',
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphFuturePieLegend = [["string", "Action Type"],
                        ["number", "Count"]
      ];

    var futureDeliveryStatus: any = [];
    var graphData = [];
    var status;
    var today = new Date();
    for (var i = 0; i < this.statusList.length; i++) {
      futureDeliveryStatus[i] = 0;
    }
    var nonEmpty: boolean = false;
    for (var i = 0; i < this.vpvDelivery.length; i++) {
      if ((new Date(this.vpvDelivery[i].datePFV)).getTime() > today.getTime()) {
        // entry from the future
        status = this.getStatus(this.vpvDelivery[i]);
        futureDeliveryStatus[status] += 1
        nonEmpty = true;
      }
    }
    for (var i = 0; i < futureDeliveryStatus.length; i++) {
      graphData.push([this.statusList[i], futureDeliveryStatus[i]])
    }
    this.graphBeforeFutureDataPieChart = this.graphFutureDataPieChart;
    if (nonEmpty) {
      this.graphFutureDataPieChart = graphData;
    } else {
      this.graphFutureDataPieChart = [];
    }

  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (this.filterStatus != label) {
      this.filterStatus = label;
    } else {
      this.filterStatus = undefined;
    }
    this.initDeliveries(this.vpvActive.deliveries)
  }


  getFullName(delivery: VPVDelivery): string {
    var result = ''
    if (delivery.phasePFV) {
      result = result.concat(delivery.phasePFV, ' / ')
    }
    result = result.concat(delivery.name)
    return result;
  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.scrollRefDate} ${increment} ${this.refDateInterval}`);
    this.filterStatus = undefined;
    var newRefDate = new Date(this.scrollRefDate);
    switch(this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); //beginning of day
        if (increment > 0 || newRefDate.getTime() == this.scrollRefDate.getTime()) newRefDate.setDate(newRefDate.getDate() + increment)
        break;
      case 'week':
        newRefDate.setHours(0, 0, 0, 0); //beginning of day
        newRefDate.setDate(newRefDate.getDate() + increment * 7)
        break;
      case 'month':
        newRefDate.setHours(0, 0, 0, 0); //beginning of day
        newRefDate.setDate(1);
        if (increment > 0 || newRefDate.getTime() == this.scrollRefDate.getTime()) newRefDate.setMonth(newRefDate.getMonth() + increment)
        break;
      case 'quarter':
        var quarter = Math.trunc(newRefDate.getMonth() / 3);
        if (increment > 0) quarter += increment;
        newRefDate.setMonth(quarter * 3)
        newRefDate.setDate(1);
        newRefDate.setHours(0, 0, 0, 0);
        if (newRefDate.getTime() == this.scrollRefDate.getTime()) newRefDate.setMonth(newRefDate.getMonth() + increment * 3)
        break;
    }
    this.log(`get getRefDateVersions ${newRefDate.toISOString()} ${this.scrollRefDate.toISOString()}`);
    this.scrollRefDate = newRefDate;
    var newVersionIndex = undefined;
    if (increment > 0) {
      refDate = new Date(this.visboprojectversions[0].timestamp)
      if (newRefDate.getTime() >= refDate.getTime()) {
        newVersionIndex = 0;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    } else {
      var refDate = new Date(this.visboprojectversions[this.visboprojectversions.length-1].timestamp)
      if (newRefDate.getTime() <= refDate.getTime()) {
        newVersionIndex = this.visboprojectversions.length-1;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    }
    if (newVersionIndex == undefined) {
      this.log(`get getRefDateVersions normalised ${(new Date(newRefDate)).toISOString()}`);
      for (var i = 0; i < this.visboprojectversions.length; i++) {
        var cmpDate = new Date(this.visboprojectversions[i].timestamp);
        // this.log(`Compare Date ${cmpDate.toISOString()} ${newRefDate.toISOString()}`);
        if (cmpDate.getTime() <= newRefDate.getTime()) {
          break;
        }
      }
      newVersionIndex = i;
    }
    if (newVersionIndex >= 0) {
      this.visboDeliveryCalc(newVersionIndex);
    }
  }

  gotoVisboProjectVersions(): void {
    // this.log(`goto VPV All Versions ${this.vpvKeyMetricActive.vpid} `);
    // this.router.navigate(['vpv/'.concat(this.vpvKeyMetricActive.vpid)], {});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion):void {
    // this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  listSelectRow(vpv: any): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    // this.setVpvActive(vpv);
  }

  setVpvActive(vpv: any) : void {
    this.log(`setVpvActive Not Implemented`);
  }

  gotoVPDetail(visboproject: VisboProject):void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVP(visboproject: VisboProject):void {
    this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject):void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  inFuture(ref: string) : boolean {
    return ((new Date(ref)).getTime() > this.today.getTime());
  }

  getShortText(text: string, len: number) : string {
    if (!text) return "";
    if (text.length < len) return text;
    if (len < 3) return '...'
    return text.substring(0, len - 3).concat('...')
  }

  sortVPVTable(n: number = undefined) {
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
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
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

  sortDeliveryTable(n: number = undefined) {
    if (!this.vpvDelivery) return
    if (n != undefined) {
      if (n != this.sortColumnDelivery) {
        this.sortColumnDelivery = n;
        this.sortAscendingDelivery = undefined;
      }
      if (this.sortAscendingDelivery == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscendingDelivery = ( n == 2 || n == 3 ) ? true : false;
      }
      else this.sortAscendingDelivery = !this.sortAscendingDelivery;
    } else {
      this.sortColumnDelivery = 1;
      this.sortAscendingDelivery = false;
    }
    if (this.sortColumnDelivery == 1) {
      // sort by Delivery Index
      this.vpvDelivery.sort(function(a, b) {
        return a.id - b.id
      })
    } else if (this.sortColumnDelivery == 2) {
      // sort by Delivery  Phase
      this.vpvDelivery.sort(function(a, b) {
        var result = 0
        if (a.fullName > b.fullName)
          result = 1;
        else if (a.fullName < b.fullName)
          result = -1;
        return result
      })
    } else if (this.sortColumnDelivery == 3) {
      // sort by Delivery Description
      this.vpvDelivery.sort(function(a, b) {
        var result = 0
        if (a.description.toLowerCase() > b.description.toLowerCase())
          result = 1;
        else if (a.description.toLowerCase() < b.description.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumnDelivery == 4) {
      // sort by Delivery End Date planned
      this.vpvDelivery.sort(function(a, b) {
        return (new Date(a.dateVPV)).getTime() - (new Date(b.dateVPV)).getTime()
      })
    } else if (this.sortColumnDelivery == 5) {
      // sort by Delivery Change in Date planned
      this.vpvDelivery.sort(function(a, b) {
        return a.changeDays - b.changeDays
      })
    } else if (this.sortColumnDelivery == 6) {
      // sort by Delivery Change in % Done
      this.vpvDelivery.sort(function(a, b) {
        return a.done - b.done
      })
    }
    if (!this.sortAscendingDelivery) {
      this.vpvDelivery.reverse();
    }
  }


  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewDelivery: ' + message);
  }

}
