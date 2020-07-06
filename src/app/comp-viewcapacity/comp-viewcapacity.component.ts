import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboSetting, VisboSettingListResponse, VisboOrganisation , VisboRole, VisboOrgaTreeLeaf, VisboOrganisationListResponse, TreeLeafSelection} from '../_models/visbosetting';
import { VisboProject } from '../_models/visboproject';
import { VisboCenter } from '../_models/visbocenter';

import { VisboProjectVersion, VisboCapacity } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import * as moment from 'moment';
import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewcapacity',
  templateUrl: './comp-viewcapacity.component.html',
  styleUrls: ['./comp-viewcapacity.component.css']
})
export class VisboCompViewCapacityComponent implements OnInit, OnChanges {

  @Input() vcActive: VisboCenter;
  @Input() vpActive: VisboProject;
  @Input() vpfActive: VisboPortfolioVersion;
  @Input() vcOrganisation: VisboSettingListResponse;
  @Input() refDate: Date;
  @Input() combinedPerm: VGPermission;

  visboCapcity: VisboCapacity[];
  vcorganisation: VisboSetting[];
  actOrga: VisboOrganisation;

  role: any;
  roleUID: number;
  ressourceID: string;
  currentLeaf: VisboOrgaTreeLeaf;
  capacityFrom: Date;
  capacityTo: Date;
  currentRefDate: Date;

  showUnit: string;
  parentThis: any;

  orgaTreeData: VisboOrgaTreeLeaf;


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
    private visboprojectService: VisboProjectService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.role =  this.route.snapshot.queryParams['roleID'];
    this.currentLang = this.translate.currentLang;
    moment.locale(this.currentLang);
    this.parentThis = this;
    if (!this.refDate) { this.refDate = new Date(); }
    this.currentRefDate = this.refDate;
    this.showUnit = this.translate.instant('ViewCapacity.lbl.pd');
    if (!this.capacityFrom) {
      this.capacityFrom = new Date();
      this.capacityFrom.setMonth(this.capacityFrom.getMonth() - 3);
      this.capacityFrom.setDate(1);
      this.capacityFrom.setHours(0, 0, 0, 0);
    }
    this.capacityTo = new Date();
    this.capacityTo.setMonth(this.capacityTo.getMonth() + 9);
    this.capacityTo.setDate(1);
    this.visboGetOrganisation();
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

  visboGetOrganisation() {
    let vcid: string;
    if (this.vcActive) {
      vcid = this.vcActive._id;
    } else if (this.vpActive) {
      vcid = this.vpActive.vcid;
    }
    if (vcid) {
      this.log(`Organisaions for CapacityCalc for Object  ${vcid}`);
      this.visbosettingService.getVCOrganisations(vcid)
        .subscribe(
          vcsetting => {
            if (vcsetting.length === 0) {
              this.log(`get VCOrganisations - result is empty `);
              this.vcorganisation = [];
            } else {
              this.log(`Store Organisation for Len ${vcsetting.length}`);
              this.vcorganisation = vcsetting;
              this.actOrga = this.vcorganisation[0].value;

              // if (this.actOrga) {
              //   const organisation = this.actOrga;
              //   let allRoles = [];
              //   this.log(`get all roles of the organisation, prepared for direct access`);
              //   for (let  i = 0; organisation && organisation.allRoles && organisation.allRoles && i < organisation.allRoles.length; i++) {
              //     allRoles[organisation.allRoles[i].uid] = organisation.allRoles[i];
              //   }
              // }

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

    }
  }

  visboCapacityCalc(): void {
    this.visboCapcity = undefined;

    if (this.vcActive ) {
      this.log(`Capacity Calc for VC  ${this.vcActive._id}  role  ${this.role}`);

      this.visbocenterService.getCapacity(this.vcActive._id,  this.refDate, this.role)
        .subscribe(
          visbocenter => {
            if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
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
    } else if (this.vpActive && this.vpfActive) {
      this.log(`Capacity Calc for VP  ${this.vpActive._id} VPF  ${this.vpfActive._id}`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive._id, this.refDate, this.role)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
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

  visboViewOrganisationTree(): void {
    this.log(`Show the OrgaTree of the VC `);
    const organisation = this.actOrga;
    let allRoles = [];
    let allRoleNames = [];

    this.log(`get all roles of the organisation, prepared for direct access`);
    for (let  i = 0; organisation && organisation.allRoles && organisation.allRoles && i < organisation.allRoles.length; i++) {
      allRoles[organisation.allRoles[i].uid] = organisation.allRoles[i];
      allRoleNames[organisation.allRoles[i].name] = organisation.allRoles[i];
    }
    this.log(`get all roles of the organisation, prepared for the TreeView`);
    const topLevelNodes = this.buildTopNodes(allRoles);
    this.orgaTreeData = this.buildOrgaTree(topLevelNodes, allRoles);
    this.log(`initialize the orgaTreeData with one of the topLevel`);
    // if RoleIdentifier role angegeben, dann suche diese im OrgaTree
    let roleName: string;
    if (this.role) {
      if ( isNaN(parseInt(this.role, 10)) ) {
        roleName = this.role;
      } else {
        this.roleUID = parseInt(this.role, 10);
        roleName = allRoles[this.roleUID].name;
      }
      this.currentLeaf = this.getMappingLeaf(roleName);
    }
    if (!this.role || !this.currentLeaf) {
      this.currentLeaf = this.orgaTreeData.children[0];
    }
    this.setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.SELECTED);
    this.ressourceID = this.currentLeaf.name;
  }

  updateShowUnit(unit: string): void {
    this.showUnit = this.translate.instant(unit);
    this.visboViewCapacityOverTime();
  }

  visboViewCapacityOverTime(): void {
    let optformat = "###,###.## T\u20AC";
    if (this.showUnit === this.translate.instant('ViewCapacity.lbl.pd')) {
      optformat = "# PT";
    }
    this.graphOptionsComboChart = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        // title: 'Monthly Capacity comparison: plan-to-date vs. baseline',
        animation: {startup: true, duration: 200},
        legend: {position: 'bottom'},
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
          format: optformat,
          minorGridlines: {count: 0, color: 'none'}
        },
        hAxis: {
          format: 'MMM YY',
          // textStyle: {fontSize: 15},
          gridlines: {
            color: '#FFF',
            count: -1
          }
        }
      };
    // this.graphOptionsComboChart.title = this.translate.instant('ViewCapacity.titleCapaOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('ViewCapacity.yAxisCapaOverTime');
    const graphDataCapacity: any = [];
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

    this.log(`ViewCapacityOverTime ressourceID ${this.ressourceID}`);

    for (let i = 0; i < capacity.length; i++) {

      const currentDate = new Date(capacity[i].month);
      currentDate.setHours(2, 0, 0, 0);
      if ((currentDate >= this.capacityFrom && currentDate <= this.capacityTo)) {
        if (this.showUnit === this.translate.instant('ViewCapacity.lbl.pd')) {
          graphDataCapacity.push([
            currentDate,
            Math.trunc((capacity[i].internCapa_PT + capacity[i].externCapa_PT) || 0),
            this.createCustomHTMLContent(capacity[i], true),
            Math.trunc(capacity[i].internCapa_PT || 0),
            this.createCustomHTMLContent(capacity[i], true),
            Math.trunc(capacity[i].actualCost_PT || 0),
            this.createCustomHTMLContent(capacity[i], true),
            Math.trunc(capacity[i].plannedCost_PT || 0),
            this.createCustomHTMLContent(capacity[i], true)]);
        } else {
          graphDataCapacity.push([
            currentDate,
            Math.trunc((capacity[i].internCapa + capacity[i].externCapa) || 0),
            this.createCustomHTMLContent(capacity[i], false),
            Math.trunc(capacity[i].internCapa || 0),
            this.createCustomHTMLContent(capacity[i], false),
            Math.trunc(capacity[i].actualCost || 0),
            this.createCustomHTMLContent(capacity[i], false),
            Math.trunc(capacity[i].plannedCost || 0),
            this.createCustomHTMLContent(capacity[i], false)]);
        }
      }
    }
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    this.log(`visboCapacity len ${len} ${JSON.stringify(graphDataCapacity[len - 1])}`);
    if (len < 1) {

    }
    this.log(`visboCapacity len ${len} ${JSON.stringify(graphDataCapacity[len - 1])}`);
    if (len === 1) {
      graphDataCapacity.push([
        new Date(),
        graphDataCapacity[len - 1][1],
        graphDataCapacity[len - 1][2],
        graphDataCapacity[len - 1][3],
        graphDataCapacity[len - 1][4],
        graphDataCapacity[len - 1][5],
        graphDataCapacity[len - 1][6],
        graphDataCapacity[len - 1][7],
        graphDataCapacity[len - 1][8]
      ]);
    }
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
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
  }



  createCustomHTMLContent(capacity: VisboCapacity, PT: boolean): string {
    const currentDate = moment(capacity.month).format('MMM YYYY');
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + currentDate + '</b></div>' + '<div>' +
      '<table>';

    const totalCapaPT = this.translate.instant('ViewCapacity.totalCapaPT');
    const internCapaPT = this.translate.instant('ViewCapacity.internCapaPT');
    const actualCostPT = this.translate.instant('ViewCapacity.actualCostPT');
    const plannedCostPT = this.translate.instant('ViewCapacity.plannedCostPT');

    if (PT) {
      result = result + '<tr>' + '<td>' + totalCapaPT + ':</td>' + '<td><b>' +
                (Math.round((capacity.internCapa_PT + capacity.externCapa_PT) * 10) / 10).toFixed(0) + ' PT</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + internCapaPT + ':</td>' + '<td><b>' + (Math.round(capacity.internCapa_PT * 10) / 10).toFixed(0) + ' PT</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + actualCostPT + ':</td>' + '<td><b>' + (Math.round(capacity.actualCost_PT * 10) / 10).toFixed(0) + ' PT</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + plannedCostPT + ':</td>' + '<td><b>' + (Math.round(capacity.plannedCost_PT * 10) / 10).toFixed(0) + ' PT</b></td>' + '</tr>';
      result = result + '</table>' + '</div>' + '</div>';
    } else {
      result = result + '<tr>' + '<td>' + totalCapaPT + ':</td>' + '<td><b>' + (Math.round((capacity.internCapa + capacity.externCapa) * 10) / 10).toFixed(1) + '  T\u20AC</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + internCapaPT + ':</td>' + '<td><b>' + (Math.round(capacity.internCapa * 10) / 10).toFixed(1) + '  T\u20AC</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + actualCostPT + ':</td>' + '<td><b>' +
                (Math.round(capacity.actualCost * 10) / 10).toFixed(1) + '  T\u20AC</b></td>' + '</tr>';
      result = result + '<tr>' + '<td>' + plannedCostPT + ':</td>' + '<td><b>' +
                (Math.round(capacity.plannedCost * 10) / 10).toFixed(1) + '  T\u20AC</b></td>' + '</tr>';
      result = result + '</table>' + '</div>' + '</div>';
    }
    return result;
  }

  displayCapacity(): number {
    let result = -1;
    if (this.actOrga &&  this.visboCapcity) {     // Orga && Capacity data available
      result = this.visboCapcity.length;
    }
    return result;
  }

// find summary Roles
  getSummaryRoles(allRoles: VisboRole[], roleID: number): VisboRole[] {
    let summaryRoles = [];
    this.log(`get all summary roles of the organisation roleID ${{roleID}}`);

    function findSummaryRoles(value: any) {
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
    let parentRole = undefined;

    this.log(`get the parentRole of roleID ${{roleID}}`);
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
    let topLevelNodes = [];
    let topLevel = [];
    let i = 1;

    this.log(`get all TopNodes of the organisation`);

    // find all summaryRoles
    const sumRoles = this.getSummaryRoles(allRoles, undefined);

    while (i <= allRoles.length) {
      let currentRole = allRoles[i];
      if (currentRole) {
        // get parent of currentRole
        let parent = this.getParentOfRole(currentRole.uid, allRoles, sumRoles);
        if (!parent && !topLevel[currentRole.uid]) {
          topLevel[currentRole.uid] = currentRole;
          topLevelNodes.push(currentRole);
        }
      }
      i++;
    }
    return topLevelNodes;
  }


  buildOrgaTree(topLevelNodes: VisboRole[], allRoles: VisboRole[]) {

    type subRole = {
      key: number;
      value: number;
    };

    this.log(`build the OrgaTree used for the selectionTree of the organisation`);

    let tree = new VisboOrgaTreeLeaf();
    tree.uid = 0;
    tree.name = 'root';
    tree.children = [];
    tree.showChildren = true;

    function makeLeaf(value: subRole): VisboOrgaTreeLeaf {
      let leaf = new VisboOrgaTreeLeaf();
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
      let topLevelLeaf = new VisboOrgaTreeLeaf();
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

  setTreeLeafSelection(leaf: VisboOrgaTreeLeaf, value: TreeLeafSelection) {
    leaf.isSelected = value;
    if (!leaf.children || leaf.children.length === 0) {
      return;
    }
    leaf.children.forEach((child) => {
      this.setTreeLeafSelection(child, value === TreeLeafSelection.SELECTED ? TreeLeafSelection.PARENT_SELECTED : value);
    });

  }


  selectLeaf(leaf: VisboOrgaTreeLeaf) {
    if (leaf.name !== this.ressourceID ) {
      this.ressourceID = leaf.name;
      this.role = this.ressourceID;
      this.visboCapacityCalc();
      this.setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.NOT_SELECTED);
      this.currentLeaf = leaf;
    }
    this.setTreeLeafSelection(leaf, TreeLeafSelection.SELECTED);
    return;
  }

  getMappingLeaf(roleName: string): VisboOrgaTreeLeaf {
    let resultLeaf = undefined;
    const curLeaf = this.orgaTreeData;
    let found = false;

    function findMappingLeaf(value: any) {
      // value is the Id of one subrole
      const leaf = value;
      if (leaf.name === roleName) {
        if (leaf && leaf.children && leaf.children.length > 0) {  leaf.showChildren = true;
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

  changeOrga(): void {
    // this.visboCapacityCalc();
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
    this.messageService.add('VisboViewCapcity: ' + message);
  }

}
