import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboSetting , VisboOrganisationListResponse, VisboOrganisation} from '../_models/visbosetting';
import { VisboCenter } from '../_models/visbocenter';

import { VisboProjectVersion, VisboCapacity } from '../_models/visboprojectversion';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewcapacity',
  templateUrl: './comp-viewcapacity.component.html'
})
export class VisboCompViewCapacityComponent implements OnInit, OnChanges {

  @Input() vcActive: VisboCenter;
  @Input() vcOrganisation: VisboOrganisationListResponse;
  @Input() combinedPerm: VGPermission;

  visboCapacity: VisboCapacity[];
  vcorganisation: VisboSetting[];
  aktOrga: VisboOrganisation;

  showUnit: string;
  parentThis: any;
  ressourceID: string;
  capacityFrom: Date;
  capacityTo: Date;

  colors: string[] = ['#F7941E', '#F7941E', '#BDBDBD', '#458CCB'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star' },
    '1': { lineWidth: 2, lineDashStyle: [4, 4], pointShape: 'star' }
  };

  graphDataComboChart: any[] = [];
  graphOptionsComboChart: any = undefined;
  currentLang: string;

  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.parentThis = this;
    this.showUnit = this.translate.instant('ViewCapacity.lbl.euro');
    this.ressourceID = '';
    this.capacityFrom = new Date();
    this.capacityFrom.setDate(1);
		this.capacityFrom.setHours(0, 0, 0, 0);
    this.capacityFrom.setMonth(this.capacityFrom.getMonth() - 2);    
    this.capacityTo = new Date();
    this.capacityTo.setDate(1);
		this.capacityTo.setHours(0, 0, 0, 0);
    this.capacityTo.setMonth(this.capacityTo.getMonth() + 6);
    this.visboCapacityCalc();
  }

  ngOnChanges(changes: SimpleChanges) {
    // this.log(`Capacity Changes  ${this.vcActive._id} ${this.showUnit} ${this.organisationUnit}`);
    // if (this.organisationUnit !== undefined && this.organisationUnit !== '1') {
    //   this.visboCapacityCalc();
    // }
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  visboCapacityCalc(): void {
    if (!this.vcActive) {
      return;
    }

    this.log(`Organisaions for CapacityCalc for Object  ${this.vcActive._id}`);
    this.visbosettingService.getVCOrganisations(this.vcActive._id)
      .subscribe(
        vcorganisation => {
          if (vcorganisation.length <= 0) {
            this.log(`get VCOrganisations - result is empty `);
            this.vcorganisation = [];
          } else {
            this.log(`Store Organisation for Len ${vcorganisation.length}`);
            this.vcorganisation = vcorganisation;
            this.aktOrga = this.vcorganisation[0].value;
          }
          this.visboViewOrganisationTree();
        },
        error => {
          this.log(`get VCOrganisations failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('ViewCapacity.msg.errorPermOrganisation', {'name': this.vcActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );

    this.log(`Capacity Calc for Object  ${this.vcActive._id}`);
    this.visbocenterService.getCapacity(this.vcActive._id, this.ressourceID)
      .subscribe(
        visbocenter => {
          if (!visbocenter.capacity) {
            this.log(`get VPV Calc: Reset Capacity to empty `);
            this.visboCapacity = [];
          } else {
            this.log(`Store Capacity for Len ${visbocenter.capacity.length}`);
            this.visboCapacity = visbocenter.capacity;
          }

          // if (!this.capacityFrom) {
          //   this.capacityFrom = new Date();
          //   this.capacityFrom.setMonth(this.capacityFrom.getMonth() - 2);
          //   // this.capacityFrom = new Date(this.visboCapacity[0].month);
          // }
          // if (!this.capacityTo) {
          //   this.capacityTo = new Date();
          //   this.capacityTo.setMonth(this.capacityTo.getMonth() + 6);
          //   // this.capacityTo = new Date(this.visboCapacity[visbocenter.capacity.length - 1].month);
          // }
          // if (this.capacityTo < this.capacityFrom) {
          //   this.capacityTo.setMonth(this.capacityFrom.getMonth() + 1);
          // }

          // show the RessourceID which is actual calculated
          if (!this.ressourceID) {
            this.ressourceID = this.aktOrga.allRoles[0].name;
          }
          
          this.visboViewCapacityOverTime();
        },
        error => {
          this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vcActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }


  visboViewOrganisationTree(): void {
    // const organisation = this.aktOrga;
    // var allRoleNames = [];
    // for (var i = 0; organisation  && organisation.allRoles && i < organisation.allRoles.length; i++) {
    //   allRoleNames[organisation.allRoles[i].name] = organisation.allRoles[i];
    // }
    // // URK TODO:  the topNOde is to be fetched
    // this.ressourceID = organisation.allRoles[0].name;
    // if (this.ressourceID && !allRoleNames && !allRoleNames[this.ressourceID]) {
    //   return;
    // }
  }

  visboViewCapacityOverTime(): void {
    let optformat = "# T\u20AC";
    if (this.showUnit === this.translate.instant('ViewCapacity.lbl.pd')) {
      optformat = "# PT";
    }
    this.graphOptionsComboChart = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        title: 'Monthly Capacity comparison: plan-to-date vs. baseline',
        animation: {startup: true, duration: 200},
        legend: {position: 'top'},
        explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
        // curveType: 'function',
        colors: this.colors,
        seriesType: 'bars',
        series: {0: {type: 'line', lineWidth: 4, pointSize: 0}, 1: {type: 'line', lineWidth: 2, lineDashStyle: [4, 4], pointSize: 1}},
        isStacked: true,
        vAxis: {
          title: 'Monthly Capacity',
          // format: "# T\u20AC",
          format: optformat,
          minorGridlines: {count: 0, color: 'none'}
        },
        hAxis: {
          format: 'MMM YY',
          gridlines: {
            color: '#FFF',
            count: -1
          }
        }
      };
    this.graphOptionsComboChart.title = this.translate.instant('ViewCapacity.titleCapaOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('ViewCapacity.yAxisCapaOverTime');
    const graphDataCapacity: any = [];
    if (!this.visboCapacity || this.visboCapacity.length === 0) {
      return;
    }

    const capacity = this.visboCapacity;

    if (!this.capacityFrom) {
      this.capacityFrom = new Date(capacity[0].month);
    }
    if (!this.capacityTo) {
      this.capacityTo = new Date(capacity[capacity.length - 1].month);
    }
    if (this.capacityTo < this.capacityFrom) {
      this.capacityTo.setMonth(this.capacityFrom.getMonth() + 1);
    }

    this.log(`ViewCapacityOverTime ${this.ressourceID} `);

    for (let i = 0; i < capacity.length; i++) {
      const currentDate = new Date(capacity[i].month);
      currentDate.setHours(2, 0, 0, 0);
      if ((currentDate >= this.capacityFrom && currentDate <= this.capacityTo)) {
        if (this.showUnit === this.translate.instant('ViewCapacity.lbl.pd')) {
          graphDataCapacity.push([
            currentDate,
            Math.trunc((capacity[i].internCapa_PT + capacity[i].externCapa_PT) || 0),
            Math.trunc(capacity[i].internCapa_PT || 0),
            Math.trunc(capacity[i].actualCost_PT || 0),
            Math.trunc(capacity[i].plannedCost_PT || 0)]);
        } else {
          graphDataCapacity.push([
            currentDate,
            Math.trunc((capacity[i].internCapa + capacity[i].externCapa) || 0),
            Math.trunc(capacity[i].internCapa || 0),
            Math.trunc(capacity[i].actualCost || 0),
            Math.trunc(capacity[i].plannedCost || 0)]);
        }
      }
    }
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    this.log(`visboCapacity len ${len} ${JSON.stringify(graphDataCapacity[len - 1])}`);
    if (len === 1) {
      graphDataCapacity.push([
        new Date(),
        graphDataCapacity[len - 1][1],
        graphDataCapacity[len - 1][2],
        graphDataCapacity[len - 1][3],
        graphDataCapacity[len - 1][4]
      ]);
    }

    graphDataCapacity.push([
      'Month',
      this.translate.instant('ViewCapacity.totalCapaPT'),
      this.translate.instant('ViewCapacity.internCapaPT'),
      this.translate.instant('ViewCapacity.actualCostPT'),
      this.translate.instant('ViewCapacity.plannedCostPT')
    ]);
    graphDataCapacity.reverse();
    // this.log(`view Capacity VP Capacity budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCapacity;
  }





  displayCapacity(): boolean {
    let result = false;
    if (this.vcActive                                // the vpv is already available
    && this.hasVCPerm(this.permVC.ViewAudit)          // user has audit permission
    && this.visboCapacity && this.visboCapacity.length > 0) {     // Capacity data available
      result = true;
    }
    return result;
  }

  // controller
  parseDate(dateString: string): Date {
    if (dateString) {
        return new Date(dateString);
    }
    return null;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewCapcity: ' + message);
  }

}
