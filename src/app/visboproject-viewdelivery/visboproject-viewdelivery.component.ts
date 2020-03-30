import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVDelivery } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-viewdelivery',
  templateUrl: './visboproject-viewdelivery.component.html',
  styleUrls: ['./visboproject-viewdelivery.component.css']
})
export class VisboProjectViewDeliveryComponent implements OnInit {

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  visboprojectversions: VisboProjectVersion[];

  vpSelected: string;
  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  initVPVID: string;
  vpvDelivery: VPVDelivery[];
  filterStatus: string;
  vpvDeliveryDate: any = [];
  vpvActualDataUntil: Date;
  deleted = false;

  refDateInterval = 'month';
  vpvRefDate: Date;
  scrollRefDate: Date;
  chartButton = 'View List';
  chart = true;
  history = false;
  historyButton = 'View Trend';
  parentThis: any;

  statusList: string[];

  colors: string[] = ['#005600', 'green', 'orange', 'red'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star', lineDashStyle: [4, 8, 8, 4] }
  };

  graphFinishedDataPieChart: any[] = [];
  graphBeforeFinishedDataPieChart: any[] = [];
  graphFinishedPieLegend: any;
  graphFinishedOptionsPieChart: any = undefined;
  divFinishedPieChart = 'divFinishedPieChart';

  graphUnFinishedDataPieChart: any[] = [];
  graphBeforeUnFinishedDataPieChart: any[] = [];
  graphUnFinishedPieLegend: any;
  graphUnFinishedOptionsPieChart: any = undefined;
  divUnFinishedPieChart = 'divUnFinishedPieChart';
  currentLang: string;

  sortAscending = false;
  sortColumn = 1;
  sortAscendingDelivery = false;
  sortColumnDelivery = 1;

  today: Date = new Date();

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.statusList = [
      this.translate.instant('keyMetrics.chart.statusDeliveryAhead'),
      this.translate.instant('keyMetrics.chart.statusDeliveryInTime'),
      this.translate.instant('keyMetrics.chart.statusDeliveryDelay'),
      this.translate.instant('keyMetrics.chart.statusDeliveryNotCompleted'),
      'Unknown'
    ];
    if (this.route.snapshot.queryParams.vpvid) {
      this.initVPVID = this.route.snapshot.queryParams.vpvid;
    }
    this.getVisboProjectVersions();
  }

  onSelect(visboprojectversion: VisboProjectVersion): void {
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vpSelected = id;
    this.parentThis = this;
    const chartFlag = this.chart;

    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, '', false)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.log(`get VPV: Get ${visboprojectversions.length} Project Versions`);
                  if (visboprojectversions.length > 0) {
                    this.sortVPVTable();
                  }
                  let initIndex = 0;
                  if (this.initVPVID) {
                    for (let i = 0; i < visboprojectversions.length; i++) {
                      if (visboprojectversions[i]._id.toString() === this.initVPVID) {
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
                  if (error.status === 403) {
                    const message = this.translate.instant('vpViewDelivery.msg.errorPermVersion', {'name': this.vpActive.name});
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
              const message = this.translate.instant('vpViewDelivery.msg.errorPerm', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }

  visboDeliveryCalc(index: number): void {
    const chartFlag = this.chart;
    this.chart = false;
    this.vpvActive = this.visboprojectversions[index];
    this.vpvRefDate = this.vpvActive.timestamp;
    if (this.scrollRefDate === undefined) {
      this.scrollRefDate = new Date(this.vpvRefDate);
    }
    if (!this.vpvActive) {
      return;
    }

    this.log(`Delivery Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getDelivery(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].delivery.length} Delivery entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].delivery) {
            this.log(`get VPV Calc: Reset Delivery to empty `);
            this.initDeliveries(undefined);
          } else {
            this.log(`Store Delivery for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].delivery.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.initDeliveries(visboprojectversions[0].delivery);
            this.vpvActualDataUntil = visboprojectversions[0].actualDataUntil;
            this.visboprojectversions[index].delivery = this.vpvDelivery;
            this.visboprojectversions[index].actualDataUntil = visboprojectversions[0].actualDataUntil;
          }

          this.visboViewFinishedDeliveryPie();
          // ur: 29.02.2020: nur noch ein Chart - wie bei Deadlines
          // this.visboViewUnFinishedDeliveryPie();
          if (this.hasVPPerm(this.permVP.ViewAudit)) {
            this.chart = chartFlag;
          } else {
            this.chart = false;
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpViewCost.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  initDeliveries(delivery: VPVDelivery[]): void {
    const filterDeliveries: VPVDelivery[] = [];
    if (delivery === undefined) {
      this.vpvDelivery = delivery;
      return;
    }
    // generate long Names
    for (let i = 0; i < delivery.length; i++) {
      delivery[i].fullName = this.getFullName(delivery[i]);
      delivery[i].status = this.statusList[this.getStatus(delivery[i])];
      if (!this.filterStatus  || this.filterStatus ===  delivery[i].status) {
        filterDeliveries.push(delivery[i]);
      }
    }
    this.vpvDelivery = filterDeliveries;
    this.sortDeliveryTable(2);
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    const localA = new Date(dateA);
    const localB = new Date(dateB);
    localA.setHours(0, 0, 0, 0);
    localB.setHours(0, 0, 0, 0);
    // return false;
    return localA.getTime() === localB.getTime();
  }

  getStatus(element: VPVDelivery): number {

    const refDate = this.vpvActive.timestamp;

    let status = 0;
    if (element.datePFV <= refDate && element.percentDone < 1) {
      status = 3;
    } else if (element.changeDays < 0) {
      status = 0;
    } else if (element.changeDays === 0) {
      status = 1;
    } else {
      status = 2;
    }
    return status;
  }

  visboViewFinishedDeliveryPie(): void {
    // if (!this.vpvDelivery || this.vpvDelivery.length == 0) return;
    this.graphFinishedOptionsPieChart = {
        title: this.translate.instant('keyMetrics.chart.titleFinishedDelivery'),
        titleTextStyle: {color: 'black', fontSize: '16'},
        // pieSliceText: 'value',
        pieSliceText: 'percentage',
        tooltip : {
          trigger: 'none'
        },
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphFinishedPieLegend = [
      ['string', 'Action Type'],
      ['number', 'Count']
    ];

    const finishedDeliveryStatus: any = [];
    const graphData = [];
    let status;
    const refDate = this.vpvActive.timestamp;
    for (let i = 0; i < this.statusList.length; i++) {
      finishedDeliveryStatus[i] = 0;
    }
    let nonEmpty = false;
    for (let i = 0; i < this.vpvDelivery.length; i++) {
      // ur: 29.02.2020: es werden nun alle Deliveries in einem PieChart dargestellt, also alle Deliveries in einem Status-Array aufgesammelt
      // if (this.vpvDelivery[i].percentDone === 1) {
      //   // finished entries
        status = this.getStatus(this.vpvDelivery[i]);
        finishedDeliveryStatus[status] += 1;
        nonEmpty = true;
      // }
    }
    for (let i = 0; i < finishedDeliveryStatus.length; i++) {
      graphData.push([this.statusList[i], finishedDeliveryStatus[i]]);
    }

    this.graphBeforeFinishedDataPieChart = this.graphFinishedDataPieChart;
    if (nonEmpty) {
      this.graphFinishedDataPieChart = graphData;
    } else {
      this.graphFinishedDataPieChart = [];
    }
  }

  visboViewUnFinishedDeliveryPie(): void {
    // if (!this.vpvDelivery || this.vpvDelivery.length == 0) return;
    this.graphUnFinishedOptionsPieChart = {
        title: this.translate.instant('keyMetrics.chart.titleUnFinishedDelivery'),
        tooltip : {
          trigger: 'none'
        },
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphUnFinishedPieLegend = [['string', 'Action Type'],
                        ['number', 'Count']
      ];

    const unFinishedDeliveryStatus: any = [];
    const graphData = [];
    let status;
    const refDate = this.vpvActive.timestamp;
    for (let i = 0; i < this.statusList.length; i++) {
      unFinishedDeliveryStatus[i] = 0;
    }
    let nonEmpty = false;
    for (let i = 0; i < this.vpvDelivery.length; i++) {
      if (this.vpvDelivery[i].percentDone < 1) {
        // unfinished entries
        status = this.getStatus(this.vpvDelivery[i]);
        unFinishedDeliveryStatus[status] += 1;
        nonEmpty = true;
      }
    }
    for (let i = 0; i < unFinishedDeliveryStatus.length; i++) {
      graphData.push([this.statusList[i], unFinishedDeliveryStatus[i]]);
    }
    this.graphBeforeUnFinishedDataPieChart = this.graphUnFinishedDataPieChart;
    if (nonEmpty) {
      this.graphUnFinishedDataPieChart = graphData;
    } else {
      this.graphUnFinishedDataPieChart = [];
    }

  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (this.filterStatus !== label) {
      this.filterStatus = label;
    } else {
      this.filterStatus = undefined;
    }
    this.initDeliveries(this.vpvActive.delivery);
  }


  getFullName(delivery: VPVDelivery): string {
    let result = '';
    if (delivery.phaseVPV || delivery.phasePFV) {
      result = result.concat(delivery.phaseVPV || delivery.phasePFV, ' / ');
    }
    result = result.concat(delivery.name);
    return result;
  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.scrollRefDate} ${increment} ${this.refDateInterval}`);
    this.filterStatus = undefined;
    const newRefDate = new Date(this.scrollRefDate);
    let i = 0;
    switch (this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        if (increment > 0 || newRefDate.getTime() === this.scrollRefDate.getTime()) {
          newRefDate.setDate(newRefDate.getDate() + increment);
        }
        break;
      case 'week':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        newRefDate.setDate(newRefDate.getDate() + increment * 7);
        break;
      case 'month':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        newRefDate.setDate(1);
        if (increment > 0 || newRefDate.getTime() === this.scrollRefDate.getTime()) {
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
        if (newRefDate.getTime() === this.scrollRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3);
        }
        break;
    }
    this.log(`get getRefDateVersions ${newRefDate.toISOString()} ${this.scrollRefDate.toISOString()}`);
    this.scrollRefDate = newRefDate;
    let newVersionIndex;
    if (increment > 0) {
      const refDate = new Date(this.visboprojectversions[0].timestamp);
      if (newRefDate.getTime() >= refDate.getTime()) {
        newVersionIndex = 0;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    } else {
      const refDate = new Date(this.visboprojectversions[this.visboprojectversions.length - 1].timestamp);
      if (newRefDate.getTime() <= refDate.getTime()) {
        newVersionIndex = this.visboprojectversions.length - 1;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    }
    if (newVersionIndex === undefined) {
      this.log(`get getRefDateVersions normalised ${(new Date(newRefDate)).toISOString()}`);
      for (i = 0; i < this.visboprojectversions.length; i++) {
        const cmpDate = new Date(this.visboprojectversions[i].timestamp);
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

  gotoClickedRow(visboprojectversion: VisboProjectVersion): void {
    // this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  listSelectRow(vpv: any): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    // this.setVpvActive(vpv);
  }

  setVpvActive(vpv: any): void {
    this.log(`setVpvActive Not Implemented`);
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVP(visboproject: VisboProject): void {
    this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  inFuture(ref: string): boolean {
    return (ref > this.vpvActive.timestamp.toString());
  }

  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  sortVPVTable(n?: number) {
    if (!this.visboprojectversions) {
      return;
    }
    if (n !== undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n === 5 ) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }
    if (this.sortColumn === 1) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortColumn === 2) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.endDate, b.endDate); });
    } else if (this.sortColumn === 3) {
      this.visboprojectversions.sort(function(a, b) { return a.ampelStatus - b.ampelStatus; });
    } else if (this.sortColumn === 4) {
      this.visboprojectversions.sort(function(a, b) { return a.Erloes - b.Erloes; });
    } else if (this.sortColumn === 5) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase()); });
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
  }

  sortDeliveryTable(n?: number) {
    if (!this.vpvDelivery) {
      return;
    }
    if (n !== undefined) {
      if (n !== this.sortColumnDelivery) {
        this.sortColumnDelivery = n;
        this.sortAscendingDelivery = undefined;
      }
      if (this.sortAscendingDelivery === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscendingDelivery = ( n === 2 || n === 3 ) ? true : false;
      } else {
        this.sortAscendingDelivery = !this.sortAscendingDelivery;
      }
    } else {
      this.sortColumnDelivery = 2;
      this.sortAscendingDelivery = true;
    }
    if (this.sortColumnDelivery === 1) {
      // sort by Delivery Index
      this.vpvDelivery.sort(function(a, b) {
        return a.id - b.id;
      });
    } else if (this.sortColumnDelivery === 2) {
      this.vpvDelivery.sort(function(a, b) { return visboCmpString(a.fullName, b.fullName); });
    } else if (this.sortColumnDelivery === 3) {
      this.vpvDelivery.sort(function(a, b) {
        return visboCmpString(a.description.toLowerCase(), b.description.toLowerCase());
      });
    } else if (this.sortColumnDelivery === 4) {
      this.vpvDelivery.sort(function(a, b) { return visboCmpDate(a.dateVPV, b.dateVPV); });
    } else if (this.sortColumnDelivery === 5) {
      this.vpvDelivery.sort(function(a, b) { return a.changeDays - b.changeDays; });
    } else if (this.sortColumnDelivery === 6) {
      this.vpvDelivery.sort(function(a, b) { return a.percentDone - b.percentDone; });
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
