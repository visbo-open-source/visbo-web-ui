import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VisboProjectVersion, VPVDelivery } from '../../_models/visboprojectversion';
import { VisboProjectVersionService } from '../../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewdelivery',
  templateUrl: './comp-viewdelivery.component.html',
  styleUrls: ['./comp-viewdelivery.component.css']
})
export class VisboCompViewDeliveryComponent implements OnInit, OnChanges {

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) {}

  @Input() vpvActive: VisboProjectVersion;
  @Input() combinedPerm: VGPermission;

  currentVpvId: string;
  allDelivery: VPVDelivery[];
  filteredDelivery: VPVDelivery[];
  filterStatus: number;
  reducedList: boolean;
  statusList: string[];
  deliveryIndex: number;
  timeoutID: NodeJS.Timeout;

  listType = [
    {name: 'PFV', ref: 'pfv', localName: ''},
    {name: 'VPV', ref: 'vpv', localName: ''},
    {name: 'All', ref: undefined, localName: ''}
  ];
  type = this.listType[0].name;
  refType = this.listType[0].ref;
  switchType = true;

  parentThis = this;

  graphDeliveryData = [];
  colorsDelivery = ['gray', '#005600', 'green', 'orange', 'red', '#005600', 'green', 'orange', 'grey'];
  graphDeliveryOptions = {
      // title: 'View Delivery Status',
      titleTextStyle: {color: 'black', fontSize: '16'},
      // pieSliceText: 'value',
      pieSliceText: 'percentage',
      tooltip : {
        trigger: 'none'
      },
      width: '600',
      // sliceVisibilityThreshold: .025
      // pieHole: 0.25,
      slices: {},
      // sliceVisibilityThreshold: .025
      colors: []
    };
  graphDeliveryLegend = [
    ['string', this.translate.instant('compViewDelivery.lbl.status')],
    ['number', this.translate.instant('compViewDelivery.lbl.count')]
  ];
  divDeliveryChart = 'divDeliveryChart';

  permVC = VGPVC;
  permVP = VGPVP;

  currentLang: string;

  sortColumnDelivery: number;
  sortAscendingDelivery: boolean;

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.statusList = [
      'Unknown',
      this.translate.instant('compViewVp.chart.statusFinishedAhead'),
      this.translate.instant('compViewVp.chart.statusFinishedInTime'),
      this.translate.instant('compViewVp.chart.statusFinishedDelay'),
      this.translate.instant('compViewVp.chart.statusNotFinishedDelay'),
      this.translate.instant('compViewVp.chart.statusUnFinishedAhead'),
      this.translate.instant('compViewVp.chart.statusUnFinishedInTime'),
      this.translate.instant('compViewVp.chart.statusUnFinishedDelay')
    ];
    this.listType.forEach(item => item.localName = this.translate.instant('compViewDelivery.lbl.'.concat(item.name)));
    this.visboDeliveryCalc();
  }

  ngOnChanges(): void {
    this.log(`Delivery on Changes  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    if (this.currentVpvId !== undefined && this.vpvActive._id !== this.currentVpvId) {
      this.visboDeliveryCalc();
    }
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.visboViewAllDeliveryPie();
      this.timeoutID = undefined;
    }, 500);
  }

  visboDeliveryCalc(): void {
    if (!this.vpvActive) {
      return;
    }
    this.currentVpvId = this.vpvActive._id;
    this.log(`Delivery Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp} Reference ${this.refType}`);
    this.visboprojectversionService.getDelivery(this.vpvActive._id, this.refType)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].delivery.length} Delivery entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].delivery) {
            this.log(`get VPV Calc: Reset Delivery to empty `);
            this.allDelivery = undefined;
          } else {
            this.log(`Store Delivery for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].delivery.length} Timestamp ${visboprojectversions[0].timestamp}`);
            this.allDelivery = visboprojectversions[0].delivery;
            // check if we got the PFV Values and if not set the refType to vpv
            if (this.refType != 'vpv') {
              if (!(this.allDelivery[0]?.fullPathPFV)) {
                this.refType = 'vpv'
                this.switchType = false;
              }
            }
          }
          this.initDeliveries();
          this.visboViewAllDeliveryPie();
        },
        error => {
          this.log(`get VPV Deliveries failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('compViewDelivery.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  initDeliveries(): void {
    if (this.allDelivery === undefined) {
      return;
    }
    // generate long Names
    this.allDelivery.forEach(delivery => {
      delivery.fullName = this.getFullName(delivery);
      delivery.statusID = this.getStatusDelivery(this.vpvActive, delivery);
      delivery.status = this.statusList[delivery.statusID];
    });
    this.filterDeliveries();
  }

  filterDeliveries(): void {
    this.filteredDelivery = [];
    this.reducedList = true;
    if (this.allDelivery === undefined) {
      return;
    }
    for (let i = 0; i < this.allDelivery.length; i++) {
      if (this.allDelivery[i].phasePFV) {
        this.reducedList = false;
      }
      if (this.filterStatus === undefined  || this.filterStatus ===  this.allDelivery[i].statusID) {
        this.filteredDelivery.push(this.allDelivery[i]);
      }
    }
    this.sortDeliveryTable(undefined);
  }

  helperDelivery(index: number): void {
    this.deliveryIndex = index;
  }

  getElementPath(index: number, len?: number): string {
    const path = this.filteredDelivery[index].fullPathVPV;
    let result = '';
    if (path.length <= 1) {
      result = this.vpvActive.name;
    } else {
      result = path.slice(1).join(' / ');
    }
    if (len > 0) {
      result = visboGetShortText(result, len, 'right');
    }
    return result;
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  canSeeRestriction(): boolean {
      let perm = this.combinedPerm.vp || 0;
      perm = perm & (this.permVP.Modify + this.permVP.ManagePerm);
      return perm > 0;
  }

  getStatusDelivery(vpv: VisboProjectVersion, element: VPVDelivery): number {
    let status = 0;
    const actualDate = new Date();
    if (element.endDatePFV) {
      if ((new Date(element.endDatePFV).getTime() < actualDate.getTime())) {
        status = 1;
      } else {
        status = 5;
      }
      if (status == 5 || element.percentDone == 1) {
        if (element.changeDays <= 0) { status += 1; }
        if (element.changeDays > 0) { status += 2; }
      } else if (status == 1 || element.percentDone < 1) {
        status = 4;
      }
    }
    return status;
  }

  visboViewAllDeliveryPie(): void {
    // this.graphDeliveryOptions.title = this.translate.instant('compViewDelivery.titleAllDelivery');

    const finishedDeliveryStatus = [];
    const graphData = [];
    let status;
    this.statusList.forEach((status, index) => {
      finishedDeliveryStatus[index] = 0;
    });
    let nonEmpty = false;
    this.filteredDelivery.forEach(item => {
      status = this.getStatusDelivery(this.vpvActive, item);
      finishedDeliveryStatus[status] += 1;
      nonEmpty = true;
    });

    const colors = [];
    finishedDeliveryStatus.forEach( (item, index) => {
      if (item > 0) {
        graphData.push([this.statusList[index], item]);
        colors.push(this.colorsDelivery[index]);
        if (index < 5) {
          // past deadlines
          this.graphDeliveryOptions.slices[graphData.length - 1] = {offset: 0.2};
        }
      }
    });
    this.graphDeliveryOptions.colors = colors;
    this.graphDeliveryData = nonEmpty ? graphData : [];
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (row === undefined) {
      this.filterStatus = undefined;
    } else {
      const index = this.statusList.findIndex(element => element === label);
      if (index < 0 || this.filterStatus === index) {
        this.filterStatus = undefined;
      } else {
        this.filterStatus = index;
      }
    }
    this.filterDeliveries();
  }


  getFullName(delivery: VPVDelivery): string {
    let result: string;
    if (delivery.fullName) {
       result = delivery.fullName;
    }
    if (this.refType === 'vpv' || this.refType === undefined) {
      if (delivery.fullPathVPV && delivery.fullPathVPV.length > 1) {
        result = delivery.fullPathVPV.slice(1).join(' / ');
      } else if (!delivery.fullPathVPV) {
          if (delivery.fullPathPFV && delivery.fullPathPFV.length > 1) {
            result = delivery.fullPathPFV.slice(1).join(' / ');
          }
      } else { // Root phase
        result = this.vpvActive.name;
      }
      return result;
    }
    if (this.refType === 'pfv') {
      if (delivery.fullPathPFV && delivery.fullPathPFV.length > 1) {
        result = delivery.fullPathPFV.slice(1).join(' / ');
      } else { // Root phase
        result = this.vpvActive.name;
      }
      return result;
    }
  }

  inFuture(ref: string): boolean {
    return (ref > this.vpvActive.timestamp.toString());
  }

  getShortText(text: string, len: number, position?: string): string {
    return visboGetShortText(text, len, position);
  }

  switchView(): void {
    this.log(`Switchinig to ${this.type}`);
    this.refType = this.listType.find( item => item.name === this.type ).ref;
    this.visboDeliveryCalc();
  }

  displayDelivery(): boolean {
    let result = false;
    if (this.vpvActive
    && this.allDelivery && this.allDelivery.length > 0) {
      result = true;
    }
    return result;
  }

  displaySwitch(): boolean {
    let result = false;
    if (this.switchType
    && this.hasVPPerm(this.permVP.View)) {
      result = true;
    }
    return result;
  }

  gotoVPRestrict(index: number): void {
    const path = this.filteredDelivery[index].fullPathVPV;
    const nameID = this.filteredDelivery[index].nameID;
    localStorage.setItem('restrict', JSON.stringify({id: nameID, path: path}));

    this.log(`goto VP Restrict: ${this.vpvActive.vpid} ID ${nameID} Path ${path.join(' / ')}`);
    this.router.navigate(['vpRestrict/'.concat(this.vpvActive.vpid)], { queryParams: { id: nameID }});
  }

  sortDeliveryTable(n?: number): void {
    if (!this.filteredDelivery) {
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
    if (this.sortColumnDelivery === 2) {
      if (this.refType === undefined) {
        this.filteredDelivery.sort(function(a, b) {
          if (!a.fullPathVPV && a.fullPathPFV) { return visboCmpString(a.fullPathPFV.join(' / '), b.fullPathVPV.join(' / ')); }
          if (!b.fullPathVPV && b.fullPathPFV) { return visboCmpString(a.fullPathVPV.join(' / '), b.fullPathPFV.join(' / ')); }
          if (!a.fullPathVPV && !b.fullPathVPV && a.fullPathPFV && b.fullPathPFV) {
            return visboCmpString(a.fullPathPFV.join(' / '), b.fullPathPFV.join(' / '));
          }
          return visboCmpString(a.fullPathVPV.join(' / '), b.fullPathVPV.join(' / '));
        });
      }
      if (this.refType === 'vpv') {
        this.filteredDelivery.sort(function(a, b) { return visboCmpString(a.fullPathVPV.join(' / '), b.fullPathVPV.join(' / ')); });
      }
      if (this.refType === 'pfv') {
        this.filteredDelivery.sort(function(a, b) { return visboCmpString(a.fullPathPFV.join(' / '), b.fullPathPFV.join(' / ')); });
      }
    } else if (this.sortColumnDelivery === 3) {
      this.filteredDelivery.sort(function(a, b) {
        return visboCmpString(a.description.toLowerCase(), b.description.toLowerCase());
      });
    } else if (this.sortColumnDelivery === 4) {
      this.filteredDelivery.sort(function(a, b) { return visboCmpDate(a.endDateVPV, b.endDateVPV); });
    } else if (this.sortColumnDelivery === 5) {
      this.filteredDelivery.sort(function(a, b) { return a.changeDays - b.changeDays; });
    } else if (this.sortColumnDelivery === 6) {
      this.filteredDelivery.sort(function(a, b) { return a.percentDone - b.percentDone; });
    }
    if (!this.sortAscendingDelivery) {
      this.filteredDelivery.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompViewDelivery: ' + message);
  }

}
