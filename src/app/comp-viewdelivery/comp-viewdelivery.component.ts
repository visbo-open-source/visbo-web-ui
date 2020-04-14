import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion, VPVDelivery } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewdelivery',
  templateUrl: './comp-viewdelivery.component.html',
  styleUrls: ['./comp-viewdelivery.component.css']
})
export class VisboCompViewDeliveryComponent implements OnInit {

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) {}

  @Input() vpvActive: VisboProjectVersion;

  currentVpvId: string;
  allDelivery: VPVDelivery[];
  filteredDelivery: VPVDelivery[];
  filterStatus: number;
  reducedList: boolean;
  statusList: string[];

  parentThis: any;
  colors: string[] = ['#005600', 'green', 'orange', 'red'];

  graphAllDataPieChart: any[] = [];
  graphAllPieLegend: any;
  graphAllOptionsPieChart: any = undefined;
  divAllPieChart = 'divAllDeliveryPieChart';

  currentLang: string;

  sortColumnDelivery: number;
  sortAscendingDelivery: boolean;

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.parentThis = this;
    this.statusList = [
      this.translate.instant('keyMetrics.chart.statusDeliveryAhead'),
      this.translate.instant('keyMetrics.chart.statusDeliveryInTime'),
      this.translate.instant('keyMetrics.chart.statusDeliveryDelay'),
      this.translate.instant('keyMetrics.chart.statusDeliveryNotCompleted'),
      'Unknown'
    ];
    this.visboDeliveryCalc();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.log(`Delivery on Changes  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    if (this.currentVpvId !== undefined && this.vpvActive._id !== this.currentVpvId) {
      this.visboDeliveryCalc();
    }
  }

  visboDeliveryCalc(): void {
    // this.visboViewAllDeliveryPie = undefined;
    if (!this.vpvActive) {
      return;
    }
    this.currentVpvId = this.vpvActive._id;
    this.log(`Delivery Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getDelivery(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].delivery.length} Delivery entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].delivery) {
            this.log(`get VPV Calc: Reset Delivery to empty `);
            this.allDelivery = undefined;
          } else {
            this.log(`Store Delivery for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].delivery.length} Timestamp ${visboprojectversions[0].timestamp}`);
            this.allDelivery = visboprojectversions[0].delivery;
          }
          this.initDeliveries()
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
    for (let i = 0; i < this.allDelivery.length; i++) {
      this.allDelivery[i].fullName = this.getFullName(this.allDelivery[i]);
      const statusID = this.getStatus(this.allDelivery[i]);
      this.allDelivery[i].statusID = statusID;
      this.allDelivery[i].status = this.statusList[statusID];
    }
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
      if (this.filterStatus == undefined  || this.filterStatus ===  this.allDelivery[i].statusID) {
        this.filteredDelivery.push(this.allDelivery[i]);
      }
    }
    this.sortDeliveryTable(undefined);
  }

  getStatus(element: VPVDelivery): number {

    const refDate = this.vpvActive.timestamp;

    let status = 0;
    if (!element.datePFV) {
      // no comparison with pfv
      status = -1;
    } else  if (element.datePFV <= refDate && element.percentDone < 1) {
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

  visboViewAllDeliveryPie(): void {
    // if (!this.filteredDelivery || this.filteredDelivery.length == 0) return;
    this.graphAllOptionsPieChart = {
        title: this.translate.instant('compViewDelivery.titleAllDelivery'),
        titleTextStyle: {color: 'black', fontSize: '16'},
        // pieSliceText: 'value',
        pieSliceText: 'percentage',
        tooltip : {
          trigger: 'none'
        },
        // sliceVisibilityThreshold: .025
        colors: this.colors
      };

    this.graphAllPieLegend = [
      ['string', this.translate.instant('compViewDelivery.lbl.status')],
      ['number', this.translate.instant('compViewDelivery.lbl.count')]
    ];

    const finishedDeliveryStatus: any = [];
    const graphData = [];
    let status;
    const refDate = this.vpvActive.timestamp;
    for (let i = 0; i < this.statusList.length; i++) {
      finishedDeliveryStatus[i] = 0;
    }
    let nonEmpty = false;
    for (let i = 0; i < this.filteredDelivery.length; i++) {
      // ur: 29.02.2020: es werden nun alle Deliveries in einem PieChart dargestellt, also alle Deliveries in einem Status-Array aufgesammelt
      // if (this.filteredDelivery[i].percentDone === 1) {
      //   // finished entries
        status = this.getStatus(this.filteredDelivery[i]);
        finishedDeliveryStatus[status] += 1;
        nonEmpty = true;
      // }
    }
    for (let i = 0; i < finishedDeliveryStatus.length; i++) {
      graphData.push([this.statusList[i], finishedDeliveryStatus[i]]);
    }

    // this.graphBeforeAllDataPieChart = this.graphAllDataPieChart;
    if (nonEmpty) {
      this.graphAllDataPieChart = graphData;
    } else {
      this.graphAllDataPieChart = [];
    }
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} for Filter`);
    if (row == undefined) {
      this.filterStatus = undefined;
    } else {
      const index = this.statusList.findIndex(element => element == label);
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
    } else if (delivery.fullPathVPV.length > 1) {
      result = delivery.fullPathVPV.slice(1).join(' / ');
    } else { // Root phase
      result = this.vpvActive.name;
    }
    return result;
  }

  inFuture(ref: string): boolean {
    return (ref > this.vpvActive.timestamp.toString());
  }

  getShortText(text: string, len: number, position?: string): string {
    return visboGetShortText(text, len, position);
  }

  sortDeliveryTable(n?: number) {
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
    if (this.sortColumnDelivery === 1) {
      // sort by Delivery Index
      this.filteredDelivery.sort(function(a, b) {
        return a.id - b.id;
      });
    } else if (this.sortColumnDelivery === 2) {
      this.filteredDelivery.sort(function(a, b) { return visboCmpString(a.fullPathVPV.join(' / '), b.fullPathVPV.join(' / ')); });
    } else if (this.sortColumnDelivery === 3) {
      this.filteredDelivery.sort(function(a, b) {
        return visboCmpString(a.description.toLowerCase(), b.description.toLowerCase());
      });
    } else if (this.sortColumnDelivery === 4) {
      this.filteredDelivery.sort(function(a, b) { return visboCmpDate(a.dateVPV, b.dateVPV); });
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
