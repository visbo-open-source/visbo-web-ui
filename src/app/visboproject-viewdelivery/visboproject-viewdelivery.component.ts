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
  vpvDelivery: [VPVDelivery];
  vpvActualDataUntil: string;
  deleted: boolean = false;

  vpvTotalCostBaseLine: number;
  vpvTotalCostCurrent: number;

  refDateInterval: string = "month";
  vpvRefDate: Date;
  chartButton: string = "View List";
  chart: boolean = true;
  history: boolean = false;
  historyButton: string = "View Trend"
  parentThis: any;

  colors: string[] = ['#F7941E', '#BDBDBD', '#458CCB'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star' }
  };

  graphDataComboChart: any[] = [];
  graphOptionsComboChart: any = undefined;

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
    if (!this.vpvActive) return;

    this.log(`Delivery Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getDelivery(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].deliveries.length} Delivery entries`);
          if (visboprojectversions.length != 1 || !visboprojectversions[0].deliveries) {
            this.log(`get VPV Calc: Reset Delivery to empty `);
            this.vpvDelivery = [new VPVDelivery];
          } else {
            this.log(`Store Delivery for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].deliveries.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.vpvDelivery = visboprojectversions[0].deliveries;
            this.vpvActualDataUntil = visboprojectversions[0].actualDataUntil;
            this.visboprojectversions[index].deliveries = this.vpvDelivery;
            this.visboprojectversions[index].actualDataUntil = visboprojectversions[0].actualDataUntil;
          }

          this.visboViewDelivery(visboprojectversions[0]._id);
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

  sameDay(dateA: Date, dateB: Date): boolean {
    var localA = new Date(dateA);
    var localB = new Date(dateB);
    localA.setHours(0,0,0,0);
    localB.setHours(0,0,0,0);
    // return false;
    return localA.getTime() == localB.getTime();
  }

  visboViewDelivery(id: string): void {

    if (!this.vpvDelivery) return;


  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.vpvRefDate} ${increment} ${this.refDateInterval}`);
    var newRefDate = new Date(this.vpvRefDate);
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
    this.log(`get getRefDateVersions ${(new Date(newRefDate)).toISOString()}`);
    if (increment > 0) {
      refDate = new Date(this.visboprojectversions[0].timestamp)
      if (newRefDate.toISOString() > refDate.toISOString()) {
        this.visboDeliveryCalc(0);
        return;
      }
    }
    if (increment < 0) {
      var refDate = new Date(this.visboprojectversions[this.visboprojectversions.length-1].timestamp)
      if (newRefDate.toISOString() < refDate.toISOString()) {
        this.visboDeliveryCalc(this.visboprojectversions.length-1);
        return;
      }
    }
    this.log(`get getRefDateVersions normalised ${(new Date(newRefDate)).toISOString()}`);
    for (var i = 0; i < this.visboprojectversions.length; i++) {
      var cmpDate = new Date(this.visboprojectversions[i].timestamp);
      // this.log(`Compare Date ${cmpDate.toISOString()} ${newRefDate.toISOString()}`);
      if (cmpDate.toISOString() <= newRefDate.toISOString()) {
        this.visboDeliveryCalc(increment > 0 ? i-1 : i);
        break;
      }
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

  chartSelectRow(row: number, col: number, label: string) {
    this.log(`Line Chart: User selected ${row} ${col} ${label} Len`);
    // if (row < 0 || row >= this.visbokeymetrics.length) row = 0;
    // this.setVpvActive(this.visbokeymetrics[row]);
    // this.log(`Line Chart: User selected ${row} ${col} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);
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
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n == 2 || n == 3 ) ? true : false;
      }
      else this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }
    if (this.sortColumn == 1) {
      // sort by Delivery Index
      this.vpvDelivery.sort(function(a, b) {
        return a.id - b.id
      })
    } else if (this.sortColumn == 2) {
      // sort by Delivery  Phase
      this.vpvDelivery.sort(function(a, b) {
        var result = 0
        if (a.name > b.name)
          result = 1;
        else if (a.name < b.name)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by Delivery Description
      this.vpvDelivery.sort(function(a, b) {
        var result = 0
        if (a.description.toLowerCase() > b.description.toLowerCase())
          result = 1;
        else if (a.description.toLowerCase() < b.description.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by Delivery End Date planned
      this.vpvDelivery.sort(function(a, b) {
        return (new Date(a.dateVPV)).getTime() - (new Date(b.dateVPV)).getTime()
      })
    } else if (this.sortColumn == 5) {
      // sort by Delivery Change in Date planned
      this.vpvDelivery.sort(function(a, b) {
        return a.changeDays - b.changeDays
      })
    } else if (this.sortColumn == 6) {
      // sort by Delivery Change in % Done
      this.vpvDelivery.sort(function(a, b) {
        return a.percentDone - b.percentDone
      })
    }
    if (!this.sortAscending) {
      this.vpvDelivery.reverse();
    }
  }


  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewDelivery: ' + message);
  }

}
