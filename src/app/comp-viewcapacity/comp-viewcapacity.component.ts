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
    this.currentLang = this.translate.currentLang;
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

    if (this.vcActive) {
      this.log(`Capacity Calc for VC  ${this.vcActive._id} `);

      this.visbocenterService.getCapacity(this.vcActive._id,  this.refDate, this.ressourceID)
        .subscribe(
          visbocenter => {
            if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
              // this.vpvCost[visboprojectversions[0]._id] = [];
              this.visboCapcity = [];
            } else {
              this.log(`Store Capacity for Len ${visbocenter.capacity.length}`);
              this.visboCapcity = visbocenter.capacity;
            }
            // show the RessourceID which is actual calculated
            if (!this.ressourceID) {
              this.ressourceID = this.actOrga?.allRoles[0]?.name;
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
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive._id, this.refDate, this.ressourceID)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapcity = [];
            } else {
              this.log(`Store Capacity for Len ${vp.capacity.length}`);
              this.visboCapcity = vp.capacity;
            }
            // show the RessourceID which is actual calculated
            if (!this.ressourceID) {
              this.ressourceID = this.actOrga?.allRoles[0]?.name;
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
    const allRoles = [];
    this.log(`get all roles of the organisation, prepared for direct access`);
    for (let  i = 0; organisation && organisation.allRoles && organisation.allRoles && i < organisation.allRoles.length; i++) {
      allRoles[organisation.allRoles[i].uid] = organisation.allRoles[i];
    }
    this.log(`get all roles of the organisation, prepared for the TreeView`);
    const topLevelNodes = this.buildTopNodes(allRoles);
    this.orgaTreeData = this.buildOrgaTree(topLevelNodes, allRoles);
    this.log(`initialize the orgaTreeData with one of the topLevel`);
    this.currentLeaf = this.orgaTreeData.children[0];
    this.setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.SELECTED);
    // console.log(this.orgaTreeData);

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
    // this.graphOptionsComboChart.title = this.translate.instant('ViewCapacity.titleCapaOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('ViewCapacity.yAxisCapaOverTime');
    const graphDataCapacity: any = [];
    if (!this.visboCapcity || this.visboCapcity.length === 0) {
      this.graphDataComboChart = [];
      return;
    }

    const capacity = this.visboCapcity;

    // if (!this.capacityFrom){
    //   this.capacityFrom = new Date();
    //   this.capacityFrom.setMonth(this.capacityFrom.getMonth() - 3);
    //   this.capacityFrom.setDate(1);
    // }
    if (!this.capacityTo) {
      this.capacityTo = new Date();
      this.capacityTo.setMonth(this.capacityTo.getMonth() + 9);
      this.capacityTo.setDate(1);
    }

    // if (!this.capacityFrom) {
    //   this.capacityFrom = new Date(capacity[0].month);
    // }
    // if (!this.capacityTo) {
    //   this.capacityTo = new Date(capacity[capacity.length - 1].month);
    // }

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

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
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
    const summaryRoles = [];
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
      for ( i = 0; allRoles &&  i <= allRoles.length; i++ ) {
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

  getParentOfRole(roleID: number, allRoles: VisboRole[], sumRoles: VisboRole[]): unknown {
    let parentRole = undefined;

    this.log(`get the parentRole of roleID ${{roleID}}`);
    if (allRoles[roleID]) {

      let notFound = true;
      for (let k = 0; sumRoles && k < sumRoles.length; k++) {

        const hrole = sumRoles[k];
        if (hrole)	{
          for ( let i = 0; notFound && hrole && hrole.subRoleIDs && i < hrole.subRoleIDs.length; i++ ) {
            if ( hrole.subRoleIDs[i] && hrole.subRoleIDs[i].key === roleID) {
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


  buildOrgaTree(topLevelNodes: VisboRole[], allRoles: VisboRole[]) {

    type subRole = {
      key: number;
      value: number;
    };

    this.log(`build the OrgaTree used for the selectionTree of the organisation`);

    const tree = new VisboOrgaTreeLeaf();
    tree.uid = 0;
    tree.name = 'root';
    tree.children = [];
    tree.showChildren = true;

    function makeLeaf(value: subRole): VisboOrgaTreeLeaf {
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
        // alternativ (Philipp):
        // topLevelLeaf.children = sRoles.map(makeLeaf);
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
      this.visboCapacityCalc();
      this.setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.NOT_SELECTED);
      this.currentLeaf = leaf;
    }
    this.setTreeLeafSelection(leaf, TreeLeafSelection.SELECTED);
    return;
  }

  changeOrga(): void {
    // this.visboCapacityCalc();
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
