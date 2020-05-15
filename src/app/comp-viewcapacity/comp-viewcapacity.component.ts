import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboSetting } from '../_models/visbosetting';
import { VisboProject } from '../_models/visboproject';
import { VisboCenter } from '../_models/visbocenter';

import { VisboProjectVersion, VisboCapacity } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewcapacity',
  templateUrl: './comp-viewcapacity.component.html'
})
export class VisboCompViewCapacityComponent implements OnInit, OnChanges {

  @Input() vcActive: VisboCenter;
  @Input() vpActive: VisboProject;
  @Input() vpfActive: VisboPortfolioVersion;
  @Input() organisation: VisboSetting;
  @Input() refDate: Date;
  @Input() combinedPerm: VGPermission;

  visboCapcity: VisboCapacity[];
  roleID: string = '1';
  currentRefDate: Date;

  parentThis: any;

  colors: string[] = ['#F7941E', '#BDBDBD', '#458CCB'];
  series: any =  {
    '0': { lineWidth: 4, pointShape: 'star' }
  };

  graphDataComboChart: any[] = [];
  graphOptionsComboChart: any = undefined;
  currentLang: string;

  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.parentThis = this;
    this.currentRefDate = this.refDate;
    this.visboCapacityCalc();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.log(`Capacity Changes  ${this.refDate} ${this.currentRefDate}`);
    if (this.currentRefDate !== undefined && this.refDate.getTime() !== this.currentRefDate.getTime()) {
      this.visboCapacityCalc();
    }
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
    if (this.vcActive) {
      this.log(`Capacity Calc for VC  ${this.vcActive._id} `);
      this.visbocenterService.getCapacity(this.vcActive._id, this.roleID)
        .subscribe(
          visbocenter => {
            if (!visbocenter.capacity) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
              // this.vpvCost[visboprojectversions[0]._id] = [];
              this.visboCapcity = [];
            } else {
              this.log(`Store Capacity for Len ${visbocenter.capacity.length}`);
              this.visboCapcity = visbocenter.capacity;
            }
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermVersion', {'name': this.vcActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    } else if (this.vpActive && this.vpfActive){
      this.log(`Capacity Calc for VP  ${this.vpActive._id} VPF  ${this.vpfActive._id}`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive._id, this.refDate, this.roleID)
        .subscribe(
          vp => {
            if (!vp.capacity) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapcity = [];
            } else {
              this.log(`Store Capacity for Len ${vp.capacity.length}`);
              this.visboCapcity = vp.capacity;
            }
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  visboViewCapacityOverTime(): void {
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
        series: {0: {type: 'line', lineWidth: 4, pointSize: 0}},
        isStacked: true,
        vAxis: {
          title: 'Monthly Capacity',
          format: "# T\u20AC",
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
    this.graphOptionsComboChart.title = this.translate.instant('keyMetrics.chart.titleCostOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisCostOverTime');
    const graphDataCapacity: any = [];
    if (!this.visboCapcity || this.visboCapcity.length === 0) {
      return;
    }

    const capacity = this.visboCapcity;

    this.log(`ViewCapacityOverTime roleID ${this.roleID}`);

    for (let i = 0; i < capacity.length; i++) {
      const currentDate = new Date(capacity[i].month);
      graphDataCapacity.push([
        currentDate,
        Math.trunc(capacity[i].internCapa_PT || 0),
        Math.trunc(capacity[i].actualCost_PT || 0),
        Math.trunc(capacity[i].plannedCost_PT || 0)]);
    }
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    this.log(`visboCapacity len ${len} ${JSON.stringify(graphDataCapacity[len - 1])}`);
    if (len === 1) {
      graphDataCapacity.push([
        new Date(),
        graphDataCapacity[len - 1][1],
        graphDataCapacity[len - 1][2],
        graphDataCapacity[len - 1][3]
      ]);
    }

    graphDataCapacity.push([
      'Month',
      this.translate.instant('ViewCapacity.internCapaPT'),
      this.translate.instant('ViewCapacity.actualCostPT'),
      this.translate.instant('ViewCapacity.plannedCostPT')
    ]);
    graphDataCapacity.reverse();
    // this.log(`view Capacity VP Capacity budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCapacity;
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
    // if (row === undefined) {
    //   this.filterStatus = undefined;
    // } else {
    //   const index = this.statusList.findIndex(element => element === label);
    //   if (index < 0 || this.filterStatus === index) {
    //     this.filterStatus = undefined;
    //   } else {
    //     this.filterStatus = index;
    //   }
    // }
    // this.filterDeadlines();
  }


  displayCapacity(): boolean {
    let result = false;
    if (this.visboCapcity && this.visboCapcity.length > 0) {     // Capacity data available
      result = true;
    }
    return result;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewCapcity: ' + message);
  }

}
