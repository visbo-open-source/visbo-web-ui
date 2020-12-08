import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboSetting, VisboSettingListResponse, VisboOrganisation , VisboSubRole, VisboRole, VisboOrgaTreeLeaf, TreeLeafSelection} from '../_models/visbosetting';
import { VisboProject } from '../_models/visboproject';
import { VisboCenter } from '../_models/visbocenter';

import { VisboCapacity, VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFParams } from '../_models/visboportfolioversion';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpDate, convertDate, validateDate } from '../_helpers/visbo.helper';

class CapaLoad {
  uid: number;
  percentOver: number;
  rankOver: number;
  percentUnder: number;
  rankUnder: number;
}

@Component({
  selector: 'app-comp-viewcapacity',
  templateUrl: './comp-viewcapacity.component.html',
  styleUrls: ['./comp-viewcapacity.component.css']
})
export class VisboCompViewCapacityComponent implements OnInit, OnChanges {

  @Input() vcActive: VisboCenter;
  @Input() vpActive: VisboProject;
  @Input() vpfActive: VisboPortfolioVersion;
  @Input() vpvActive: VisboProjectVersion;
  @Input() vcOrganisation: VisboSettingListResponse;
  @Input() refDate: Date;
  @Input() combinedPerm: VGPermission;

  visboCapcity: VisboCapacity[];
  visboCapcityChild: VisboCapacity[];
  vcorganisation: VisboSetting[];
  actOrga: VisboOrganisation;
  capaLoad: CapaLoad[];
  timeoutID: number;
  hasCost: boolean;

  roleID: number;
  currentLeaf: VisboOrgaTreeLeaf;
  capacityFrom: Date;
  capacityTo: Date;
  currentRefDate: Date;

  sumCost = 0;
  sumBudget = 0;

  showUnit: string;
  showUnitText: string;
  refPFV = false;
  parentThis = this;

  orgaTreeData: VisboOrgaTreeLeaf;
  topLevelNodes: VisboRole[];

  colors = ['#F7941E', '#F7941E', '#BDBDBD', '#458CCB'];

  chartActive: Date;
  graphDataComboChart = [];
  graphOptionsComboChart = {
      chartArea:{'left':100,'top':100,width:'100%','height':'80%'},
      width: '100%',
      height: '600',
      title: 'Monthly Capacity comparison',
      animation: {startup: true, duration: 200},
      legend: {position: 'top'},
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      // curveType: 'function',
      colors: this.colors,
      seriesType: 'bars',
      series: {0: {type: 'line', lineWidth: 4, pointSize: 0}, 1: {type: 'line', lineWidth: 2, lineDashStyle: [4, 4], pointSize: 1}},
      isStacked: true,
      tooltip: {
        isHtml: true
      },
      vAxis: {
        title: 'Monthly Capacity',
        // format: "# T\u20AC",
        // minValue: 0,
        format: "###,###.## T\u20AC",
        minorGridlines: {count: 0, color: 'none'}
      },
      hAxis: {
        format: 'MMM YY',
        // textStyle: {fontSize: 15},
        gridlines: {
          color: '#FFF',
          count: -1
        },
        minorGridlines: {count: 0, color: 'none'}
      }
    };
  currentLang: string;

  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private visboprojectversionService: VisboProjectVersionService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.initSetting();
    if (!this.refDate) { this.refDate = new Date(); }
    this.currentRefDate = this.refDate;
    if (this.showUnit == 'PD') {
      this.showUnitText = this.translate.instant('ViewCapacity.lbl.pd')
    } else {
      this.showUnitText = this.translate.instant('ViewCapacity.lbl.euro')
    }
    this.capaLoad = [];

    this.visboGetOrganisation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Capacity Changes  RefDate ${this.refDate} Current RefDate ${this.currentRefDate}, Changes: ${JSON.stringify(changes)}`);
    if (this.currentRefDate !== undefined && this.refDate.getTime() !== this.currentRefDate.getTime()) {
      this.initSetting();
      this.getCapacity();
    }
    // else if (changes.vpvActive) {
    //   this.getCapacity();
    // }
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    let diff = 0;
    if (this.chartActive) {
      diff = (new Date()).getTime() - this.chartActive.getTime()
    }
    if (diff < 1000) {
      return;
    }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.visboViewCapacityOverTime();
      this.timeoutID = undefined;
    }, 500);
  }

  initSetting(): void {
    this.chartActive = undefined;
    this.roleID = this.route.snapshot.queryParams['roleID'];
    const pfv = this.route.snapshot.queryParams['pfv'];
    this.refPFV = pfv && Number(pfv) ? true : false;
    const unit = this.route.snapshot.queryParams['unit'];
    this.initShowUnit(unit);

    const from = this.route.snapshot.queryParams['from'];
    const to = this.route.snapshot.queryParams['to'];

    if (from && validateDate(from, false)) {
      this.capacityFrom = new Date(validateDate(from, false));
    } else {
      this.capacityFrom = new Date();
      this.capacityFrom.setMonth(this.capacityFrom.getMonth() - 3);
    }
    this.capacityFrom.setDate(1);
    this.capacityFrom.setHours(0, 0, 0, 0);

    if (to && validateDate(to, false)) {
      this.capacityTo = new Date(validateDate(to, false));
    } else {
      this.capacityTo = new Date();
      this.capacityTo.setMonth(this.capacityFrom.getMonth() + 9);
    }
    this.capacityTo.setDate(1);
    this.capacityTo.setHours(0, 0, 0, 0);

    this.log(`Capacity From / To ${this.capacityFrom} / ${this.capacityTo}`);
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

  visboGetOrganisation(): void {
    let vcid: string;
    if (this.vcActive) {
      vcid = this.vcActive._id;
    } else if (this.vpActive) {
      vcid = this.vpActive.vcid;
    }
    if (vcid) {
      this.log(`Organisaions for CapacityCalc for Object  ${vcid}`);
      this.visbosettingService.getVCOrganisations(vcid, false, (new Date()).toISOString())
        .subscribe(
          vcsetting => {
            if (vcsetting.length === 0) {
              this.log(`get VCOrganisations - result is empty `);
              this.vcorganisation = [];
            } else {
              this.log(`Store Organisation for Len ${vcsetting.length}`);
              this.vcorganisation = vcsetting;
              this.vcorganisation.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
              this.actOrga = this.vcorganisation[this.vcorganisation.length-1].value;
            }
            this.visboViewOrganisationTree();
            this.getCapacity();
          },
          error => {
            this.log(`get VCOrganisations failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              let name: string;
              if (this.vpActive) {
                name = this.vpActive.name;
              } else if (this.vcActive) {
                name = this.vcActive.name;
              }
              const message = this.translate.instant('ViewCapacity.msg.errorPermOrganisation', {'name': name});
              this.log(`Alert: ${message}`);
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    }
  }

  getCapacity(): void {
    this.visboCapcity = undefined;

    if (this.vcActive ) {
      this.log(`Capacity Calc for VC ${this.vcActive._id} role ${this.currentLeaf.name}`);

      this.visbocenterService.getCapacity(this.vcActive._id, this.refDate, this.currentLeaf.uid.toString(), true, this.refPFV)
        .subscribe(
          visbocenter => {
            if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
              this.visboCapcity = [];
              this.visboCapcityChild = [];
            } else {
              this.log(`Store Capacity for Len ${visbocenter.capacity.length}`);
              this.visboCapcity = visbocenter.capacity.filter(item => item.roleID == this.currentLeaf.uid.toString());
              this.visboCapcityChild = visbocenter.capacity.filter(item => item.roleID != this.currentLeaf.uid.toString());
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapcity, this.refPFV);
            }
            this.calcLoad(this.visboCapcityChild, this.refPFV);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermVersion', {'name': this.vcActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpfActive) {
      this.log(`Capacity Calc for VP ${this.vpActive._id} VPF ${this.vpfActive._id} role ${this.currentLeaf.name}`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive._id, this.refDate, this.currentLeaf.uid.toString(), true, this.refPFV)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapcity = [];
            } else {
              this.log(`Store Capacity for Len ${vp.capacity.length}`);
              this.visboCapcity = vp.capacity.filter(item => item.roleID == this.currentLeaf.uid.toString());
              this.visboCapcityChild = vp.capacity.filter(item => item.roleID != this.currentLeaf.uid.toString());
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapcity, this.refPFV);
            }
            this.calcLoad(this.visboCapcityChild, this.refPFV);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpvActive) {
      this.refPFV = true;
      this.log(`Capacity Calc for VPV ${this.vpvActive.vpid} role ${this.currentLeaf.name}`);
      this.visboprojectversionService.getCapacity(this.vpvActive._id, this.currentLeaf.uid.toString(), true, this.refPFV)
        .subscribe(
          listVPV => {
            if (!listVPV || listVPV.length != 1 || !listVPV[0].capacity || listVPV[0].capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapcity = [];
            } else {
              const vpv = listVPV[0];
              this.log(`Store Capacity for Len ${vpv.capacity.length}`);
              this.visboCapcity = vpv.capacity.filter(item => item.roleID == this.currentLeaf.uid);
              this.visboCapcityChild = vpv.capacity.filter(item => item.roleID != this.currentLeaf.uid);
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapcity, this.refPFV);
            }
            this.calcLoad(this.visboCapcityChild, this.refPFV);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    }
  }

  checkCostAvailable(capacity: VisboCapacity[]): void {
    let result = false;
    if (capacity && capacity.length > 0) {
      result = capacity[0].actualCost != undefined ||
                capacity[0].plannedCost != undefined ||
                capacity[0].baselineCost != undefined;
    }
    this.hasCost = result;
  }

  calcLoad(capacity: VisboCapacity[], refPFV = false): number {
    if (!capacity || capacity.length == 0) {
      return undefined;
    }
    this.checkCostAvailable(capacity);

    function percentCalc(item: VisboCapacity, from: Date, to: Date, refPFV = false): number {
      const current = new Date(item.month);
      if (current.getTime() < from.getTime() || current.getTime() > to.getTime()) {
        return 0;
      }
      let capa = 0, cost = 0;
      if (refPFV) {
        capa = (item?.baselineCost_PT|| 0);
      } else {
        capa = (item?.internCapa_PT|| 0) + (item?.externCapa_PT || 0);
      }
      cost = (item?.actualCost_PT|| 0) + (item?.plannedCost_PT || 0);

      if (cost > 0 && capa === 0) {
        capa = 1;
      }
      return (cost / capa) - 1;
    }

    let capaLoad: CapaLoad[] = [];
    for (let i=0; i < capacity.length; i++) {
      const capa = percentCalc(capacity[i], this.capacityFrom, this.capacityTo, refPFV);
      const roleID = capacity[i].roleID;
      if (!capaLoad[roleID]) {
        const load = new CapaLoad();
        load.uid = roleID;
        load.percentOver = 0;
        load.percentUnder = 0;
        capaLoad[roleID] = load;
      }
      if (capa > 0) {
        capaLoad[roleID].percentOver += capa;
      } else if (capa < 0) {
        capaLoad[roleID].percentUnder += capa;
      }
    }
    // remove empty items
    capaLoad = capaLoad.filter(item => item.uid >= 0);
    let markCount = Math.round(capaLoad.length / 4);
    if (markCount < 3) {
      markCount = Math.min(3, capaLoad.length);
    }
    this.log(`Calculated CapaLoad ${capaLoad.length} Mark ${markCount}`);

    capaLoad.sort(function(a, b) { return b.percentOver - a.percentOver; });
    for (let i=0; i < markCount; i++) {
      if (capaLoad[i].percentOver <= 0) break;
      capaLoad[i].rankOver = markCount - i;
    }
    capaLoad.sort(function(a, b) { return a.percentUnder - b.percentUnder; });
    for (let i=0; i < markCount; i++) {
      if (capaLoad[i].percentUnder >= 0) break; // no more items with under capacity
      if (capaLoad[i].rankOver > 0) continue;   // item is marked with rankOver, do not mark both
      capaLoad[i].rankUnder = markCount - i;
    }
    for (let i=0; i < capaLoad.length; i++) {
      this.capaLoad[capaLoad[i].uid] = capaLoad[i];
    }
    this.log(`Calculated Overall CapaLoad ${this.capaLoad.length}`);
  }

  visboViewOrganisationTree(): void {
    this.log(`Show the OrgaTree of the VC `);
    const organisation = this.actOrga;

    const allRoles = [];
    const allRoleNames = [];
    this.log(`get all roles of the organisation, prepared for direct access`);
    for (let  i = 0; organisation && organisation.allRoles && organisation.allRoles && i < organisation.allRoles.length; i++) {
      allRoles[organisation.allRoles[i].uid] = organisation.allRoles[i];
      allRoleNames[organisation.allRoles[i].name] = organisation.allRoles[i];
    }
    this.log(`get all roles of the organisation, prepared for the TreeView`);
    this.topLevelNodes = this.buildTopNodes(allRoles);
    this.orgaTreeData = this.buildOrgaTree(this.topLevelNodes, allRoles);
    this.log(`initialize the orgaTreeData with one of the topLevel`);
    // if RoleIdentifier role angegeben, dann suche diese im OrgaTree
    if (this.roleID >= 0 && this.roleID < allRoles.length) {
      this.currentLeaf = this.getMappingLeaf(allRoles[this.roleID].name);
    }
    if (!this.currentLeaf) {
      this.currentLeaf = this.orgaTreeData.children[0];
    }
    this.setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.SELECTED);
  }

  initShowUnit(unit: string): void {
    unit = 'PD' ? 'PD' : undefined;
    this.showUnit = unit;
    this.updateUrlParam('unit', unit == 'PD' ? '1' : '0')
    if (unit === 'PD') {
      this.showUnitText = this.translate.instant('ViewCapacity.lbl.pd')
    } else {
      this.showUnitText = this.translate.instant('ViewCapacity.lbl.euro')
    }
  }

  updateShowUnit(unit: string): void {
    this.initShowUnit(unit);
    this.visboViewCapacityOverTime();
  }

  updateDateRange(): void {
    this.updateUrlParam('from', undefined)
    this.visboViewCapacityOverTime();
  }

  updateRef(): void {
    this.log(`Show Ref change: ${status} to ${this.refPFV}`);
    this.updateUrlParam('pfv', this.refPFV ? '1' : '0');
    this.capaLoad = []; // reset the load indicators
    this.getCapacity();
  }

  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPFParams();
    if (type == 'roleID') {
      queryParams.roleID = Number(value);
    } else if (type == 'from' || type == 'to') {
      queryParams.from = this.capacityFrom.toISOString();
      queryParams.to = this.capacityTo.toISOString();
    } else if (type == 'unit') {
      queryParams.unit = value;
    } else if (type == 'pfv') {
      queryParams.pfv = value;
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  visboViewCapacityOverTime(): void {
    let optformat = "###,###.## T\u20AC";
    if (this.showUnit === 'PD') {
      optformat = "# " + this.translate.instant('ViewCapacity.lbl.pd');
    }
    this.graphOptionsComboChart.title = this.translate.instant('ViewCapacity.titleCapaOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('ViewCapacity.yAxisCapaOverTime');
    this.graphOptionsComboChart.vAxis.format = optformat;

    const graphDataCapacity = [];
    if (!this.visboCapcity || this.visboCapcity.length === 0) {
      this.graphDataComboChart = [];
      return;
    }

    const capacity = this.visboCapcity;

    if (!this.capacityTo) {
      this.capacityTo = new Date();
      this.capacityTo.setMonth(this.capacityTo.getMonth() + 9);
      this.capacityTo.setDate(1);
    }

    if (this.capacityTo < this.capacityFrom) {
      this.capacityTo.setMonth(this.capacityFrom.getMonth() + 12);
    }

    this.log(`ViewCapacityOverTime resource ${this.currentLeaf.name}`);
    this.sumCost = 0;
    this.sumBudget = 0;

    for (let i = 0; i < capacity.length; i++) {

      const currentDate = new Date(capacity[i].month);
      currentDate.setHours(2, 0, 0, 0);
      if ((currentDate >= this.capacityFrom && currentDate <= this.capacityTo)) {
        const roleID = this.currentLeaf.uid;
        if (this.refPFV) {
          // capa Values compared against baseline Values
          if (this.showUnit === 'PD') {
            const budget = Math.round(capacity[i].baselineCost_PT * 10) / 10 || 0;
            const actualCost = Math.round(capacity[i].actualCost_PT * 10) / 10 || 0;
            const plannedCost = Math.round(capacity[i].plannedCost_PT * 10) / 10 || 0;
            this.sumCost += actualCost + plannedCost;
            this.sumBudget += budget;
            graphDataCapacity.push([
              currentDate,
              capacity[i].roleID == roleID ? budget : undefined,
              capacity[i].roleID == roleID ? this.createCustomHTMLContent(capacity[i], true, this.refPFV) : undefined,
              capacity[i].roleID == roleID ? 0 : undefined,
              capacity[i].roleID == roleID ? 0 : undefined,
              actualCost,
              this.createCustomHTMLContent(capacity[i], true, this.refPFV),
              plannedCost,
              this.createCustomHTMLContent(capacity[i], true, this.refPFV)
            ]);
          } else {
            const budget = Math.round((capacity[i].baselineCost * 10) / 10 || 0);
            const actualCost = Math.round((capacity[i].actualCost * 10) / 10 || 0);
            const plannedCost = Math.round((capacity[i].plannedCost * 10) / 10 || 0);
            this.sumCost += actualCost + plannedCost;
            this.sumBudget += budget;
            graphDataCapacity.push([
              currentDate,
              capacity[i].roleID == roleID ? budget : undefined,
              capacity[i].roleID == roleID ? this.createCustomHTMLContent(capacity[i], false, this.refPFV) : undefined,
              capacity[i].roleID == roleID ? 0 : undefined,
              capacity[i].roleID == roleID ? 0 : undefined,
              actualCost,
              this.createCustomHTMLContent(capacity[i], false, this.refPFV),
              plannedCost,
              this.createCustomHTMLContent(capacity[i], false, this.refPFV)
            ]);
          }
        } else {
          // capa Values compared against resources of organisation
          if (this.showUnit === 'PD') {
            const budgetIntern = Math.round(capacity[i].internCapa_PT * 10) / 10 || 0;
            const budgetExtern = Math.round(capacity[i].externCapa_PT * 10) / 10 || 0;
            const actualCost = Math.round(capacity[i].actualCost_PT * 10) / 10 || 0;
            const plannedCost = Math.round(capacity[i].plannedCost_PT * 10) / 10 || 0;
            this.sumCost += actualCost + plannedCost;
            this.sumBudget += budgetIntern + budgetExtern;
            graphDataCapacity.push([
              currentDate,
              capacity[i].roleID == roleID ? (budgetIntern + budgetExtern) : undefined,
              capacity[i].roleID == roleID ? this.createCustomHTMLContent(capacity[i], true) : undefined,
              capacity[i].roleID == roleID ? budgetIntern : undefined,
              capacity[i].roleID == roleID ? this.createCustomHTMLContent(capacity[i], true) : undefined,
              actualCost,
              this.createCustomHTMLContent(capacity[i], true),
              plannedCost,
              this.createCustomHTMLContent(capacity[i], true)
            ]);
          } else {
            const budgetIntern = Math.round((capacity[i].internCapa * 10) / 10 || 0);
            const budgetExtern = Math.round((capacity[i].externCapa * 10) / 10 || 0);
            const actualCost = Math.round((capacity[i].actualCost * 10) / 10 || 0);
            const plannedCost = Math.round((capacity[i].plannedCost * 10) / 10 || 0)
            this.sumCost += actualCost + plannedCost;
            this.sumBudget += budgetIntern + budgetExtern;
            graphDataCapacity.push([
              currentDate,
              capacity[i].roleID == roleID ? (budgetIntern + budgetExtern) : undefined,
              capacity[i].roleID == roleID ? this.createCustomHTMLContent(capacity[i], false) : undefined,
              capacity[i].roleID == roleID ? budgetIntern : undefined,
              capacity[i].roleID == roleID ? this.createCustomHTMLContent(capacity[i], false) : undefined,
              actualCost,
              this.createCustomHTMLContent(capacity[i], false),
              plannedCost,
              this.createCustomHTMLContent(capacity[i], false)
            ]);
          }
        }
      }
    }
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    if (len < 1) {
      this.log(`visboCapacity Empty`);
    }
    this.log(`visboCapacity len ${len}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(graphDataCapacity[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      graphDataCapacity.push([
        currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
      ]);
    }
    // set number of gridlines to a fixed count to avoid in between gridlines
    // this.graphOptionsComboChart.hAxis.gridlines.count = graphDataCapacity.length;
    graphDataCapacity.unshift([
      'Month',
      this.translate.instant('ViewCapacity.totalCapaPT'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('ViewCapacity.internCapaPT'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('ViewCapacity.actualCostPT'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('ViewCapacity.plannedCostPT'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    // graphDataCapacity.reverse();
    // this.log(`view Capacity VP Capacity budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
  }

  createCustomHTMLContent(capacity: VisboCapacity, PT: boolean, refPFV = false): string {
    const currentDate = convertDate(new Date(capacity.month), 'fullDate', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + currentDate + '</b></div>' + '<div>' +
      '<table>';

    const totalCapaPT = this.translate.instant('ViewCapacity.totalCapaPT');
    const internCapaPT = this.translate.instant('ViewCapacity.internCapaPT');
    const actualCostPT = this.translate.instant('ViewCapacity.actualCostPT');
    const plannedCostPT = this.translate.instant('ViewCapacity.plannedCostPT');
    const roleName = this.translate.instant('ViewCapacity.roleName');

    let internCapa: string, totalCapa: string, actualCost: string, plannedCost: string;
    let unit: string;
    if (PT) {
      unit = ' ' + this.translate.instant('ViewCapacity.lbl.pd');
      actualCost = (capacity.actualCost_PT || 0).toFixed(0);
      plannedCost = (capacity.plannedCost_PT || 0).toFixed(0);
      if (refPFV) {
        internCapa = (capacity.baselineCost_PT || 0).toFixed(0);
        totalCapa = (capacity.baselineCost_PT || 0).toFixed(0);
      } else {
        internCapa = (capacity.internCapa_PT || 0).toFixed(0);
        totalCapa = ((capacity.internCapa_PT || 0) + (capacity.externCapa_PT || 0)).toFixed(0);
      }
    } else {
      unit = ' ' + this.translate.instant('ViewCapacity.lbl.euro');
      actualCost = (capacity.actualCost || 0).toFixed(1);
      plannedCost = (capacity.plannedCost || 0).toFixed(1);
      if (refPFV) {
        internCapa = (capacity.baselineCost || 0).toFixed(1);
        totalCapa = (capacity.baselineCost || 0).toFixed(1);
      } else {
        internCapa = (capacity.internCapa || 0).toFixed(1);
        totalCapa = ((capacity.internCapa || 0) + (capacity.externCapa || 0)).toFixed(1);
      }
    }

    result = result + '<tr>' + '<td>' + roleName + ':</td>' + '<td><b>' +
              capacity.roleName + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + totalCapaPT + ':</td>' + '<td align="right"><b>' + totalCapa + unit + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + internCapaPT + ':</td>' + '<td align="right"><b>' + internCapa + unit + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + actualCostPT + ':</td>' + '<td align="right"><b>' + actualCost + unit + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + plannedCostPT + ':</td>' + '<td align="right"><b>' + plannedCost + unit + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  displayCapacity(): number {
    let result = -1;
    if (this.actOrga &&  this.visboCapcity) {     // Orga && Capacity data available
      result = this.visboCapcity.length;
    }
    return result;
  }

  getLevel(plan: number, baseline: number): number {
    let percentCalc = 1
    if (baseline) {
      percentCalc = plan/baseline;
    }
    if (percentCalc <= 1) return 1;
    else if (percentCalc <= 1.05) return 2;
    else return 3;
  }

// find summary Roles
  getSummaryRoles(allRoles: VisboRole[], roleID: number): VisboRole[] {
    this.log(`get all summary roles of the organisation roleID ${{roleID}}`);
    const summaryRoles = [];

    function findSummaryRoles(value: VisboSubRole) {
      // value is the Id of one subrole
      const hroleID = value.key;
      const hrole = allRoles[hroleID];
      if (hrole.subRoleIDs.length > 0) {
        summaryRoles[hroleID] = hrole;
        const shroles = hrole.subRoleIDs;
        shroles.forEach(findSummaryRoles);
      }
    }

    // all summary roles
    if (roleID === undefined && allRoles) {
      let i = 0;
      for (i = 0; allRoles &&  i <= allRoles.length; i++ ) {
        const hrole = allRoles[i];
        if (hrole && hrole.subRoleIDs.length > 0 ) { summaryRoles[allRoles[i].uid] = allRoles[i]; }
      }
      return summaryRoles;
    }

    // only summary roles that are children of the role roleID
    if (roleID && allRoles) {
      const role = allRoles[roleID];

      if (role.subRoleIDs && role.subRoleIDs.length > 0) {

        const subRoles = role.subRoleIDs;
        if (subRoles.length > 0 ) {
          summaryRoles[role.uid] = role;
          subRoles.forEach(findSummaryRoles);
        }
      }
      return summaryRoles;
    }
  }

  getParentOfRole (roleID: number, allRoles: VisboRole[], sumRoles: VisboRole[]): unknown {
    let parentRole;

    // this.log(`get the parentRole of roleID ${JSON.stringify(roleID)}`);
    if (allRoles[roleID]) {

      let notFound = true;
      for (let k = 0; sumRoles && k < sumRoles.length; k++) {
        const hrole = sumRoles[k];
        if (hrole)	{
          for ( let i = 0; notFound && hrole && hrole.subRoleIDs && i < hrole.subRoleIDs.length; i++ ) {
            // asked Philipp for the difference: hrole.subRoleIDs[i].key is a string with the value 'roleID' and roleID is a number
            // therefore it isn't possible to put === instead for ==, now the multiplikation with 1 makes a number of it
            if ( hrole.subRoleIDs[i] && (hrole.subRoleIDs[i].key * 1 === roleID) ) {
              parentRole = hrole;
              notFound = false;
            }
          }
        }
      }
      return parentRole;
    }
  }

  buildTopNodes(allRoles: VisboRole[]): VisboRole[] {
    const topLevelNodes = [];
    const topLevel = [];
    let i = 1;

    this.log(`get all TopNodes of the organisation`);

    // find all summaryRoles
    const sumRoles = this.getSummaryRoles(allRoles, undefined);

    while (i <= allRoles.length) {
      const currentRole = allRoles[i];
      if (currentRole) {
        // get parent of currentRole
        const parent = this.getParentOfRole(currentRole.uid, allRoles, sumRoles);
        if (!parent && !topLevel[currentRole.uid]) {
          topLevel[currentRole.uid] = currentRole;
          topLevelNodes.push(currentRole);
        }
      }
      i++;
    }
    return topLevelNodes;
  }


  buildOrgaTree(topLevelNodes: VisboRole[], allRoles: VisboRole[]): VisboOrgaTreeLeaf {

    class SubRole {
      key: number;
      value: number;
    }

    this.log(`build the OrgaTree used for the selectionTree of the organisation`);

    const tree = new VisboOrgaTreeLeaf();
    tree.uid = 0;
    tree.name = 'root';
    tree.children = [];
    tree.showChildren = true;

    function makeLeaf(value: SubRole): VisboOrgaTreeLeaf {
      const leaf = new VisboOrgaTreeLeaf();
      const hroleID = value.key;
      const hrole = allRoles[hroleID];
      const hroleName = hrole?.name;
      leaf.children = [];
      leaf.uid = hroleID;
      leaf.name = hroleName;
      const children = hrole.subRoleIDs;
      children.forEach(function(child) {
        leaf.children.push(makeLeaf(child));
      });
      return leaf;
    }

    for (let i = 0; topLevelNodes && i < topLevelNodes.length; i++) {
      const topLevelLeaf = new VisboOrgaTreeLeaf();
      topLevelLeaf.children = [];
      topLevelLeaf.uid = topLevelNodes[i].uid;
      topLevelLeaf.name = topLevelNodes[i].name;
      topLevelLeaf.showChildren = false;

      if (topLevelNodes && topLevelNodes[i].subRoleIDs && topLevelNodes[i].subRoleIDs.length > 0) {
        const sRoles = topLevelNodes[i].subRoleIDs;
        sRoles.forEach(function(sRole) {
          topLevelLeaf.children.push(makeLeaf(sRole));
        });
      }
      tree.children.push(topLevelLeaf);
    }
    return tree;
  }

  setTreeLeafSelection(leaf: VisboOrgaTreeLeaf, value: TreeLeafSelection): void {
    leaf.isSelected = value;
    if (!leaf.children || leaf.children.length === 0) {
      return;
    }
    leaf.children.forEach((child) => {
      this.setTreeLeafSelection(child, value === TreeLeafSelection.SELECTED ? TreeLeafSelection.PARENT_SELECTED : value);
    });
  }

  selectLeaf(leaf: VisboOrgaTreeLeaf, showChildren = true): void {
    if (leaf.name !== this.currentLeaf.name ) {
      this.setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.NOT_SELECTED);
      this.currentLeaf = leaf;
      this.updateUrlParam('roleID', leaf.uid.toString())
      this.getCapacity();
    }
    if (showChildren) {
      leaf.showChildren = true;
    }
    this.setTreeLeafSelection(leaf, TreeLeafSelection.SELECTED);
    return;
  }

  switchLeaf(leaf: VisboOrgaTreeLeaf): void {
    leaf.showChildren = !leaf.showChildren;
    this.selectLeaf(leaf, leaf.showChildren);
    return;
  }

  getMappingLeaf(roleName: string): VisboOrgaTreeLeaf {
    let resultLeaf;
    const curLeaf = this.orgaTreeData;
    let found = false;

    function findMappingLeaf(value: VisboOrgaTreeLeaf) {
      // value is the Id of one subrole
      const leaf = value;
      if (leaf.name === roleName) {
        if (leaf && leaf.children && leaf.children.length > 0) {
          leaf.showChildren = true;
        }
        resultLeaf = leaf;
        found = true;
      } else {
        const children = leaf.children;
        for ( let i = 0; !found && children && i < children.length; i++) {
          findMappingLeaf(children[i]);
        }
      }
    }

    for (let j = 0; !found && curLeaf && curLeaf.children && j < curLeaf.children.length; j++) {
      findMappingLeaf(curLeaf.children[j]);
    }
    return resultLeaf;
  }

  parseDate(dateString: string): Date {
     if (dateString) {
       return new Date(dateString);
    //   var d = Date.parse(dateString);
    //   if (d > 0) {
    //     return new Date(d);
    // }
    }
    return null;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewCapcity: ' + message);
  }

}
