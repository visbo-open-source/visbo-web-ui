import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VisboOrganisation, VisboOrgaStructure, VisboReducedOrgaItem,
          VisboOrgaTreeLeaf, TreeLeafSelection } from '../../_models/visbosetting';
import { VisboProject } from '../../_models/visboproject';
import { VisboCenter } from '../../_models/visbocenter';

import { VisboCapacity, VisboProjectVersion } from '../../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFParams } from '../../_models/visboportfolio';
import { VisboCenterService } from '../../_services/visbocenter.service';
import { VisboProjectService } from '../../_services/visboproject.service';
import { VisboProjectVersionService } from '../../_services/visboprojectversion.service';
import { VisboSettingService } from '../../_services/visbosetting.service';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { getErrorMessage, visboCmpDate, convertDate, validateDate, getPreView }
            from '../../_helpers/visbo.helper';
import { buildOrgaTree, expandParentTree, setTreeLeafSelection, getLeafByID, getLeafByName,
          isParentLeaf } from '../../_helpers/orga.helper';

import {ComboChartOptions} from '../../_models/_chart'
import { scale } from 'chroma-js';

// import * as XLSX from 'xlsx';
// const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
// const EXCEL_EXTENSION = '.xlsx';

const baselineColor = '#F7941E';
const capaColor = '#ff0000';

class CapaLoad {
  uid: number;
  percentOver: number;
  rankOver: number;
  percentUnder: number;
  rankUnder: number;
}

class DrillDownElement {
  currentDate: Date;
  source: boolean;
  name: string;
  variantName: string;
  plan: number;
  planTotal: number;
  budget: number;
}

class DrillDownCapa {
  id: number;
  name: string;
  localName: string;
}

class CompareCapa {
  source: VisboCapacity[];
  compare: VisboCapacity[]
}

@Component({
  selector: 'app-comp-viewcapacitycmp',
  templateUrl: './comp-viewcapacitycmp.component.html',
  styleUrls: ['./comp-viewcapacitycmp.component.css']
})
export class VisboCompViewCapacityCmpComponent implements OnInit, OnChanges {

  @Input() vcActive: VisboCenter;
  @Input() vpActive: VisboProject;
  @Input() vpfActive: VisboPortfolioVersion[];
  @Input() vpvActive: VisboProjectVersion;
  @Input() vcOrganisation: VisboOrganisation;
  @Input() refDate: Date[];
  @Input() update: Date;
  @Input() combinedPerm: VGPermission;

  lastTimestampVPF: Date[] = [];
  visboCapacity = new CompareCapa();
  visboCapacityChild = new CompareCapa();
  capaLoad: CapaLoad[];
  timeoutID: ReturnType<typeof setTimeout>;
  hasCost: boolean;
  printView = false;

  roleID: number;
  currentLeaf: VisboOrgaTreeLeaf;
  capacityFrom: Date;
  capacityTo: Date;
  currentRefDate: Date
  currentName: string;

  sumCost0 = 0;
  sumBudget0 = 0;
  sumCost1 = 0;
  sumBudget1 = 0;

  showUnit: string;
  showUnitText: string;
  refPFV = false;
  drillDown: number;
  drillDownCapa: DrillDownCapa[];
  drillDownCapaFiltered: DrillDownCapa[];
  parentThis = this;

  orga: VisboOrgaStructure;
  topLevelNodes: VisboReducedOrgaItem[];

  colorsPFV = [baselineColor, '#BDBDBD', '#BDBDBD', '#458CCB', '#BDBDBD', 'gray'];
  colorsOrga = [capaColor, capaColor, '#BDBDBD', '#458CCB', '#BDBDBD', 'gray'];
  seriesPFV = [
    {type: 'line', lineWidth: 4, pointSize: 0},
    {type: 'line', lineWidth: 4, pointSize: 0}
  ];
  seriesOrga = [
    {type: 'line', lineWidth: 4, pointSize: 0},
    {type: 'line', lineWidth: 2, lineDashStyle: [4, 4], pointSize: 1},
    // legende of Ist-Kosten visible or not
    {visibleInLegend: true},
    // legend of Plan-Kosten visible or not
    {visibleInLegend: true}
  ];

  chartActive: Date;
  graphDataComboChart = [];
  graphOptionsComboChart: ComboChartOptions;
  defaultOptionsComboChart: ComboChartOptions = {
      chartArea:{'left':100,'top':100,width:'90%'},
      width: '100%',
      height: '600',
      title: 'Monthly Capacity comparison',
      animation: {startup: true, duration: 200},
      legend: {position: 'top', maxline: 1 },
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      // curveType: 'function',
      annotations: {
        textStyle: {
          // fontName: 'Times-Roman',
          fontSize: 10
        }
      },
      bar: {},
      colors: this.colorsOrga,
      series: this.seriesOrga,
      seriesType: 'bars',
      isStacked: true,
      interpolateNulls: true,
      tooltip: {
        isHtml: true
      },
      vAxis: {
        title: 'Monthly Capacity',
        format: "###,###.## ",
        minorGridlines: {count: 0, color: 'none'}
      },
      hAxis: {
        format: 'MMM yy',
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
    this.drillDownCapa = [
      {
        id: 0,
        name: 'drillNone',
        localName: this.translate.instant('ViewCapacityCmp.lbl.drillNone')
      },
      {
        id: 1,
        name: 'drillOrga',
        localName: this.translate.instant('ViewCapacityCmp.lbl.drillOrga')
      },
      {
        id: 2,
        name: 'drillProject',
        localName: this.translate.instant('ViewCapacityCmp.lbl.drillProject')
      },
    ];
    this.drillDownCapaFiltered = this.drillDownCapa

    this.initSetting();
    if (!this.refDate) {
      const act = new Date();
      this.refDate = [act, act];
    }
    this.currentRefDate = this.refDate[0];
    if (this.showUnit == 'PD') {
      this.showUnitText = this.translate.instant('ViewCapacityCmp.lbl.pd');
    } else {
      this.showUnitText = this.translate.instant('ViewCapacityCmp.lbl.euro');
    }
    this.log(`Capacity Init  RefDate ${this.refDate[0]} Current RefDate ${this.currentRefDate}`);
    this.capaLoad = [];
    if (this.vpfActive) {
      this.lastTimestampVPF[0] = (this.vpfActive[0])?.timestamp;
      this.lastTimestampVPF[1] = (this.vpfActive[1])?.timestamp;
    } else if (this.vpvActive) {
      // this.drillDownCapaFiltered = this.drillDownCapa.filter( item => item.id != 2 );
      // this.lastTimestampVPF = this.vpvActive.timestamp;
    }

    this.visboViewOrganisationTree();
    this.getCapacity();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Capacity Changes  RefDates ${this.refDate[0]}/${this.refDate[1]} Current RefDate ${this.currentRefDate}`);
    let refresh = false;

    // in case of VP Capacity
    if (changes.vpvActive && !changes.vpvActive.firstChange ) {
      refresh = true;
    }
    // in case of VPF Capacity changing VPF Version
    if ((changes.vpfActive &&  !changes.vpfActive.firstChange)) {
      refresh = true;
    }
    if ((changes.update &&  !changes.update.firstChange)) {
      refresh = true;
    }

    if (refresh) {
      this.initSetting();
      this.getCapacity();
    }
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
    // check only width for redraw chart
    if (Math.abs(event.newRect.width - event.oldRect.width) < 5) {
      return;
    }
    this.log(`Resize ${diff} ${Math.abs(event.newRect.height - event.oldRect.height)} ${Math.abs(event.newRect.width - event.oldRect.width)}`);
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
    this.drillDown = Number(this.route.snapshot.queryParams['drillDown']) || 0;
    const unit = this.route.snapshot.queryParams['unit'];
    this.initShowUnit(unit);

    const from = this.route.snapshot.queryParams['from'];
    const to = this.route.snapshot.queryParams['to'];

    if (from && validateDate(from, false)) {
      this.capacityFrom = new Date(validateDate(from, false));
    } else if (this.vpvActive){
      // specific Project, show start & end date of the project
      this.capacityFrom = new Date(this.vpvActive.startDate);
    } else {
      // Portfolio or VC set a defined time range
      this.capacityFrom = new Date();
      this.capacityFrom.setMonth(this.capacityFrom.getMonth() - 3);
    }
    this.capacityFrom.setDate(1);
    this.capacityFrom.setHours(0, 0, 0, 0);

    if (to && validateDate(to, false)) {
      this.capacityTo = new Date(validateDate(to, false));
    } else if (this.vpvActive){
      // specific Project, show start & end date of the project
      this.capacityTo = new Date(this.vpvActive.endDate);
    } else {
      // Portfolio or VC set a defined time range
      this.capacityTo = new Date();
      this.capacityTo.setMonth(this.capacityTo.getMonth() + 9);
    }
    this.capacityTo.setDate(1);
    this.capacityTo.setHours(0, 0, 0, 0);

    if (this.vcActive) {
      this.currentName = this.vcActive.name;
    } else if (this.vpfActive && this.vpfActive[0]) {
      this.currentName = this.vpfActive[0].name;
    } else if (this.vpActive) {
      this.currentName = this.vpActive.name;
    }

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

  getCapacity(): void {
    if (this.drillDown == 2 ) {
      this.getProjectCapacity();
    } else {
      this.getCapacityOrga();
    }
  }

  getProjectCapacity(): void {
    this.visboCapacity = new CompareCapa();
    if (this.vcActive ) {
      this.log(`Capacity Calc for VC ${this.vcActive._id} role ${this.currentLeaf.name}`);
    //
    //   this.visbocenterService.getCapacity(this.vcActive._id, this.refDate, this.currentLeaf.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV, false, false, true)
    //     .subscribe(
    //       visbocenter => {
    //         if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
    //           this.log(`get VPV Calc: Reset Capacity to empty `);
    //           this.visboCapacity = [];
    //           this.visboCapacityChild = [];
    //         } else {
    //           this.log(`Store VC Project Capacity for Len ${visbocenter.capacity.length}`);
    //           let capacity = visbocenter.capacity.filter(item => item.vpid == undefined);
    //           this.visboCapacity = capacity;
    //           capacity = visbocenter.capacity.filter(item => item.vpid != undefined);
    //           this.visboCapacityChild = capacity;
    //         }
    //         this.checkCostAvailable(this.visboCapacity);
    //         this.visboViewCapacityOverTime();
    //       },
    //       error => {
    //         this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
    //         if (error.status === 403) {
    //           const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vcActive.name});
    //           this.alertService.error(message, true);
    //         } else if (error.status === 409) {
    //           const message = this.translate.instant('ViewCapacityCmp.msg.errorPermOrganisation', {'name': this.vcActive.name});
    //           this.alertService.error(message, true);
    //         } else {
    //           this.alertService.error(getErrorMessage(error), true);
    //         }
    //       }
    //     );
  } else if (this.vpActive && this.vpfActive?.length && this.currentLeaf) {
      this.log(`Capacity Calc for VP ${this.vpActive?._id} VPF ${this.vpfActive && this.vpfActive.length} role ${this.currentLeaf.name} DrillDown Project`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive[0]._id, this.refDate[0], this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV, false, false, true)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapacity.source = [];
            } else {
              this.log(`Store VPF Project Capacity for Len ${vp.capacity.length}`);
              let capacity = vp.capacity.filter(item => item.vpid == undefined);
              this.visboCapacity.source = capacity;
              capacity = vp.capacity.filter(item => item.vpid != undefined);
              this.visboCapacityChild.source = capacity;
            }
            this.checkCostAvailable(this.visboCapacity.source);

            this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive[1]._id, this.refDate[1], this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV, false, false, true)
              .subscribe(
                vp => {
                  if (!vp.capacity || vp.capacity.length === 0) {
                    this.log(`get VPF Calc: Reset Capacity to empty `);
                    this.visboCapacity.compare = [];
                  } else {
                    this.log(`Store VPF Project Capacity for Len ${vp.capacity.length}`);
                    let capacity = vp.capacity.filter(item => item.vpid == undefined);
                    this.visboCapacity.compare = capacity;
                    capacity = vp.capacity.filter(item => item.vpid != undefined);
                    this.visboCapacityChild.compare = capacity;
                  }
                  this.visboViewCapacityOverTime();
                },
                error => {
                  this.log(`get VPF Capacity Project failed: error: ${error.status} message: ${error.error && error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vpActive.name});
                    this.alertService.error(message, true);
                  } else {
                    this.alertService.error(getErrorMessage(error), true);
                  }
                }
              );
          },
          error => {
            this.log(`get VPF Capacity Project failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    }
  }

  getCapacityOrga(): void {
    this.visboCapacity = new CompareCapa();

    if (this.vcActive ) {
      this.log(`Capacity Calc for VC ${this.vcActive._id} role ${this.roleID}`);

      // this.visbocenterService.getCapacity(this.vcActive._id, this.refDate, this.currentLeaf.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV)
      //   .subscribe(
      //     visbocenter => {
      //       if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
      //         this.log(`get VPV Calc: Reset Capacity to empty `);
      //         this.visboCapacity = [];
      //         this.visboCapacityChild = [];
      //       } else {
      //         this.log(`Store Capacity for Len ${visbocenter.capacity.length}`);
      //         let capacity = visbocenter.capacity.filter(item => item.roleID == this.currentLeaf.uid.toString());
      //         this.visboCapacity = capacity;
      //         capacity = visbocenter.capacity.filter(item => item.roleID != this.currentLeaf.uid.toString());
      //         this.visboCapacityChild = capacity;
      //       }
      //       if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
      //         this.calcLoad(this.visboCapacity, this.refPFV);
      //       }
      //       this.calcLoad(this.visboCapacityChild, this.refPFV);
      //       this.visboViewCapacityOverTime();
      //     },
      //     error => {
      //       this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
      //       if (error.status === 403) {
      //         const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vcActive.name});
      //         this.alertService.error(message, true);
      //       } else if (error.status === 409) {
      //         const message = this.translate.instant('ViewCapacityCmp.msg.errorPermOrganisation', {'name': this.vcActive.name});
      //         this.alertService.error(message, true);
      //       } else {
      //         this.alertService.error(getErrorMessage(error), true);
      //       }
      //     }
      //   );
    } else if (this.vpActive && this.vpfActive && this.vpfActive[0] && this.vpfActive[1] && this.currentLeaf) {
      this.log(`Capacity Calc for VP ${this.vpActive._id} VPF ${this.vpfActive[0]._id} vs  ${this.vpfActive[1]._id} role ${this.roleID}`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive[0]._id, this.refDate[0], this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapacity.source = [];
            } else {
              this.log(`Store Capacity for Len ${vp.capacity.length}`);
              let capacity = vp.capacity.filter(item => item.roleID == this.currentLeaf.uid);
              this.visboCapacity.source = capacity;
              capacity = vp.capacity.filter(item => item.roleID != this.currentLeaf.uid);
              this.visboCapacityChild.source = capacity;
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapacity.source, this.refPFV);
            }
            this.calcLoad(this.visboCapacityChild.source, this.refPFV);
            this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive[1]._id, this.refDate[1], this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV)
              .subscribe(
                vp => {
                  if (!vp.capacity || vp.capacity.length === 0) {
                    this.log(`get VPF Calc: Reset Capacity to empty `);
                    this.visboCapacity.compare = [];
                  } else {
                    this.log(`Store Capacity for Len ${vp.capacity.length}`);
                    let capacity = vp.capacity.filter(item => item.roleID == this.currentLeaf.uid);
                    this.visboCapacity.compare = capacity;
                    capacity = vp.capacity.filter(item => item.roleID != this.currentLeaf.uid);
                    this.visboCapacityChild.compare = capacity;
                  }
                  this.visboViewCapacityOverTime();
                },
                error => {
                  this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vpActive.name});
                    this.alertService.error(message, true);
                  } else {
                    this.alertService.error(getErrorMessage(error), true);
                  }
                }
              );
          },
          error => {
            this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpvActive && this.currentLeaf) {
      // this.refPFV = true;
      // this.log(`Capacity Calc for VPV ${this.vpvActive.vpid} role ${this.roleID}`);
      // this.visboprojectversionService.getCapacity(this.vpvActive._id, this.currentLeaf.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV)
      //   .subscribe(
      //     listVPV => {
      //       if (!listVPV || listVPV.length != 1 || !listVPV[0].capacity || listVPV[0].capacity.length === 0) {
      //         this.log(`get VPF Calc: Reset Capacity to empty `);
      //         this.visboCapacity = [];
      //       } else {
      //         const vpv = listVPV[0];
      //         this.log(`Store Capacity for Len ${vpv.capacity.length}`);
      //         let capacity = vpv.capacity.filter(item => item.roleID == this.currentLeaf.uid);
      //         this.visboCapacity = capacity;
      //         capacity = vpv.capacity.filter(item => item.roleID != this.currentLeaf.uid);
      //         this.visboCapacityChild = capacity;
      //       }
      //       if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
      //         this.calcLoad(this.visboCapacity, this.refPFV);
      //       }
      //       this.calcLoad(this.visboCapacityChild, this.refPFV);
      //       this.visboViewCapacityOverTime();
      //     },
      //     error => {
      //       this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
      //       if (error.status === 403) {
      //         const message = this.translate.instant('ViewCapacityCmp.msg.errorPermCapacity', {'name': this.vpActive.name});
      //         this.alertService.error(message, true);
      //       } else {
      //         this.alertService.error(getErrorMessage(error), true);
      //       }
      //     }
      //   );
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

    function percentCalc(item: VisboCapacity, refPFV = false): number {
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
      const capa = percentCalc(capacity[i], refPFV);
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
    // this.log(`Calculated CapaLoad ${capaLoad.length} Mark ${markCount}`);

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
    // this.log(`Calculated Overall CapaLoad ${this.capaLoad.length}`);
  }

  visboViewOrganisationTree(): void {
    this.log(`Show the OrgaTree of the VC `);
    const allRoles = [];
    const roles = this.vcOrganisation?.allUnits?.filter(role => role.type == 1 || role.type == 2);
    roles?.forEach(role => allRoles[role.uid] = role);
    this.orga = buildOrgaTree(roles);

    this.topLevelNodes = roles.filter(role => role.pid == undefined);
    // if RoleIdentifier role angegeben, dann suche diese im OrgaTree
    this.currentLeaf = getLeafByID(this.orga, this.roleID);
    expandParentTree(this.currentLeaf);
    setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.SELECTED);
  }

  initShowUnit(unit: string): void {
    const strUnit = (unit == '1' || unit == 'PD') ? 'PD' : undefined;
    this.showUnit = strUnit;
    this.updateUrlParam('unit', strUnit == 'PD' ? '1' : '0')
    if (strUnit === 'PD') {
      this.showUnitText = this.translate.instant('ViewCapacityCmp.lbl.pd')
    } else {
      this.showUnitText = this.translate.instant('ViewCapacityCmp.lbl.euro')
    }
  }

  updateShowUnit(unit: string): void {
    this.initShowUnit(unit);
    this.visboViewCapacityOverTime();
  }

  updateDateRange(): void {
    if (this.compareDate()) {
      this.updateUrlParam('from', undefined)
      this.getCapacity();
    }

  }

  updateRef(): void {
    this.log(`Show Ref change to ${this.refPFV}`);
    this.updateUrlParam('pfv', this.refPFV ? '1' : '0');
    this.capaLoad = []; // reset the load indicators
    this.getCapacity();
  }

  updateDrillDown(): void {
    this.log(`Show Drilldown change to ${this.drillDown}`);
    this.updateUrlParam('drillDown', this.drillDown.toString());
    this.capaLoad = []; // reset the load indicators
    this.getCapacity();
  }

  updateUrlParam(type: string, value: string, history = false): void {
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
    } else if (type == 'drillDown') {
      queryParams.drillDown = value == '0' ? undefined : value;
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: !history,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  visboViewCapacityOverTime(): void {
    if (!this.visboCapacity.source || this.visboCapacity.source.length === 0) {
      this.graphDataComboChart = [];
      return;
    }

    let optformat: string;
    if (this.showUnit === 'PD') {
      optformat = "# " + this.translate.instant('ViewCapacityCmp.lbl.pd');
    } else {
      optformat = "###,###.## " + this.translate.instant('ViewCapacityCmp.lbl.keuro');
    }

    // create a new object to get refresh of options
    this.graphOptionsComboChart = Object.assign({}, this.defaultOptionsComboChart);
    this.graphOptionsComboChart.title = this.translate.instant(this.refPFV ? 'ViewCapacityCmp.titleCapaOverTimeBL' : 'ViewCapacityCmp.titleCapaOverTime', {name: this.currentName, roleName: this.currentLeaf.name});
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('ViewCapacityCmp.yAxisCapaOverTime');
    this.graphOptionsComboChart.vAxis.format = optformat;
    // set the colors for the Chart
    if (this.drillDown > 0) {
      delete this.graphOptionsComboChart.colors;
      this.graphOptionsComboChart.series = this.seriesPFV;
    } else if (this.refPFV) {
      this.graphOptionsComboChart.colors = this.colorsPFV;
      this.graphOptionsComboChart.series = this.seriesPFV;
    } else {
      this.graphOptionsComboChart.colors = this.colorsOrga;
      this.graphOptionsComboChart.series = this.seriesOrga;
    }

    this.log(`ViewCapacityOverTime Type ${this.drillDown ? 'DrillDown' : 'Plan/Ist'} resource ${this.currentLeaf.name}`);
    if (this.drillDown == 2) {
      this.visboViewProjectCapacityDrillDown()
    } else if (this.drillDown == 1) {
      this.visboViewCapacityDrillDown()
    } else {
      this.visboViewCapacity();
    }
  }

  calcChildNode(source: VisboCapacity[], compare: VisboCapacity[], property = 'roleName'): string[] {
    const allNames = [];
    let uniqueNames = [];
    source && source.forEach(item => {
        allNames.push(item[property] || '');
    });
    compare && compare.forEach(item => {
        allNames.push(item[property] || '');
    });
    uniqueNames = allNames.filter((name, index) => {
        return allNames.indexOf(name) === index;
    });
    return uniqueNames;
  }

  mapChildNode(list: string[]): number[] {
    const resultList = [];
    if (!list) {
      return resultList;
    }
    for (let i = 0; i < list.length; i++) {
      resultList[list[i]] = i;
    }
    return resultList;
  }

  addCapacityProjectRow(drillDownCapacity: DrillDownElement[][], element: VisboCapacity, source: boolean, childNodeList: string[]): void {
    const currentDate = new Date(element.month);
    let capa = 0, plan = 0;
    if (this.showUnit === 'PD') {
      plan = (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
    } else {
      plan = (element.actualCost || 0) + (element.plannedCost || 0);
    }
    if (this.refPFV) {
      if (this.showUnit === 'PD') {
        capa = (element.baselineCost_PT || 0);
      } else {
        capa = (element.baselineCost || 0);
      }
    } else {
      if (this.showUnit === 'PD') {
        capa = (element.internCapa_PT || 0) + (element.externCapa_PT || 0);
      } else {
        capa = (element.internCapa || 0) + (element.externCapa || 0);
      }
    }
    if (source) {
      this.sumCost0 += plan;
      this.sumBudget0 += capa;
    } else {
      this.sumCost1 += plan;
      this.sumBudget1 += capa;
    }

    const template: DrillDownElement[] = [];
    const elementDrill = new DrillDownElement();
    elementDrill.currentDate = currentDate;
    elementDrill.source = source;
    elementDrill.name = 'All';
    elementDrill.plan = plan;
    elementDrill.planTotal = plan;
    elementDrill.budget = capa;
    template.push(elementDrill)
    childNodeList.forEach(element => {
      template.push({currentDate: currentDate, source: source, name: element, variantName: '', plan: 0, planTotal: 0, budget: 0});
    });
    drillDownCapacity.push(template);
  }

  addCapacityProjectDetail(drillDownCapacity: DrillDownElement[][], element: VisboCapacity, source: boolean, mapNodeList: number[]): void {
    const currentDate = new Date(element.month);
    const row = drillDownCapacity.find(element => element[0].currentDate.getTime() == currentDate.getTime() && element[0].source == source);
    let plan = 0, budget = 0;
    if (row) {
      const index = mapNodeList[element.name];
      if (index >= 0) {
        if (this.showUnit === 'PD') {
          plan = (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
        } else {
          plan = (element.actualCost || 0) + (element.plannedCost || 0);
        }
        if (this.refPFV) {
          if (this.showUnit === 'PD') {
            budget = (element.baselineCost_PT || 0);
          } else {
            budget = (element.baselineCost || 0);
          }
        } else {
          if (this.showUnit === 'PD') {
            budget = (element.internCapa_PT || 0) + (element.externCapa_PT || 0);
          } else {
            budget = (element.internCapa || 0) + (element.externCapa || 0);
          }
        }

        row[index + 1].plan = plan;
        row[index + 1].budget = budget;
        row[index + 1].variantName = element.variantName;
      }
    } else {
      // this.log(`ViewCapacityDrillDown Date out of range ${currentDate.toISOString()}`);
    }
  }

  visboViewProjectCapacityDrillDown(): void {

    const graphDataCapacity = [];
    const initialOffset = 1    // first element in the array is the parent
    const capacity = this.visboCapacity.source;
    const capacityCmp = this.visboCapacity.compare;
    const capacityChild = this.visboCapacityChild.source;
    const capacityChildCmp = this.visboCapacityChild.compare;

    this.log(`visboViewProjectCapacityDrillDown resource ${this.currentLeaf.name}`);
    this.sumCost0 = 0;
    this.sumBudget0 = 0;
    this.sumCost1 = 0;
    this.sumBudget1 = 0;

    const strNoPFV = this.refPFV ? this.translate.instant('ViewCapacityCmp.lbl.noPFV') : '';
    const drillDownCapacity: DrillDownElement[][] = [];

    // sorting the projects for capacity-chart view projects
    // let sortedProjects: VisboCapacity[] = null;
    // sortedProjects = this.visboSortProjects(this.visboCapacityChild.source);
    // const childNodeList = this.calcChildNode(sortedProjects, 'name');
    const childNodeList = this.calcChildNode(capacityChild, capacityChildCmp, 'name');
    const mapNodeList = this.mapChildNode(childNodeList);

    capacity.forEach(item => {
      this.addCapacityProjectRow(drillDownCapacity, item, true, childNodeList);
    });
    capacityCmp.forEach(item => {
      this.addCapacityProjectRow(drillDownCapacity, item, false, childNodeList);
    });
    // now fill up with the Child Infos
    capacityChild.forEach(item => {
      this.addCapacityProjectDetail(drillDownCapacity, item, true, mapNodeList);
    });
    capacityChildCmp.forEach(item => {
      this.addCapacityProjectDetail(drillDownCapacity, item, false, mapNodeList);
    });

    for (let index = 0; index < drillDownCapacity.length; index++) {
      const element = drillDownCapacity[index];
      const currentDate = new Date(element[0].currentDate);
      const rowMatrixBudget = [];
      rowMatrixBudget.push(new Date(element[0].currentDate));
      const budget = element[0].budget || 0;
      const tooltip = this.createTooltipProjectDrillDown(element[0], this.showUnit === 'PD', this.refPFV);
      if (element[0].source) {
        rowMatrixBudget.push(budget);
        rowMatrixBudget.push(tooltip);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
      } else {
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(budget);
        rowMatrixBudget.push(tooltip);
      }
      childNodeList.forEach(() => {
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
      });
      graphDataCapacity.push(rowMatrixBudget);

      if (element[0].source) {
        currentDate.setDate(currentDate.getDate() -5);
      } else {
        currentDate.setDate(currentDate.getDate() +5);
      }
      // capa Values compared against resources of organisation
      const rowMatrix = [];
      rowMatrix.push(currentDate);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      childNodeList.forEach((item, index) => {
        rowMatrix.push(element[index + initialOffset].plan);
        const currentElement = element[index + initialOffset];
        rowMatrix.push(this.createTooltipProjectDrillDown(currentElement, this.showUnit === 'PD', this.refPFV));
        const diff = this.calcLoadDiff(currentElement, true);
        if (diff == undefined && isParentLeaf(this.currentLeaf)){
          rowMatrix.push(strNoPFV)
        // } else if (diff == undefined && (currentElement.plan + currentElement.planTotal) > 0) {
        //   rowMatrix.push(strNoPFV)
        } else if (diff > 1) {
          const diffPercent = Math.round(diff * 100);
          rowMatrix.push( '' + diffPercent + ' %')
        } else {
          rowMatrix.push(undefined)
        }
      });
      graphDataCapacity.push(rowMatrix);
    }
    // we need at least 2 items for Line Chart and show the current status for today
    // const len = graphDataCapacity.length;
    // if (len < 1) {
    //   this.log(`visboCapacity Empty`);
    // }
    // // this.log(`visboCapacity len ${len}`);
    // if (len === 1) {
    //   // add an additional month as one month could not be displayed, but do not deliver values for it
    //   const currentDate = new Date(graphDataCapacity[0][0]);
    //   currentDate.setMonth(currentDate.getMonth()+1);
    //   const rowMatrix = [];
    //   rowMatrix.push(currentDate);
    //   rowMatrix.push(undefined);
    //   rowMatrix.push(undefined);
    //   rowMatrix.push(undefined);
    //   rowMatrix.push(undefined);
    //   childNodeList.forEach(() => {
    //     rowMatrix.push(undefined);
    //     rowMatrix.push(undefined);
    //     rowMatrix.push(undefined);
    //   });
    //   graphDataCapacity.push(rowMatrix);
    // }
    const tooltip = {type: 'string', role: 'tooltip', 'p': {'html': true}};
    const annotation = {type: 'string', role: 'annotation' };
    const rowHeader = [];
    rowHeader.push('Month');
    rowHeader.push(this.translate.instant(this.refPFV ? 'ViewCapacityCmp.lbl.budget' : 'ViewCapacityCmp.lbl.totalCapa'));
    rowHeader.push(tooltip);
    rowHeader.push(this.translate.instant(this.refPFV ? 'ViewCapacityCmp.lbl.budgetCmp' : 'ViewCapacityCmp.lbl.totalCapaCmp'));
    rowHeader.push(tooltip);
    childNodeList.forEach(item => {
      rowHeader.push(item);
      rowHeader.push(tooltip);
      rowHeader.push(annotation);
    });
    graphDataCapacity.unshift(rowHeader);

    // give the capacities colors
    let orgaColors = [];
    //orgaColors = orgaColors.concat(scale(['white', 'black']).colors(childNodeList.length + 1));
    orgaColors = orgaColors.concat(scale('YlGn').colors(childNodeList.length + 3));
    orgaColors.reverse();
    orgaColors.unshift('gray');
    if (this.refPFV) {
      orgaColors.unshift(baselineColor);
    } else {
      orgaColors.unshift(capaColor);
    }
    this.graphOptionsComboChart.colors = orgaColors;
    if (this.graphOptionsComboChart.bar) {
      this.graphOptionsComboChart.bar.groupWidth = '90%';
    }

    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  addCapacityOrgaRow(drillDownCapacity: DrillDownElement[][], element: VisboCapacity, source: boolean, childNodeList: string[]): void {
    const currentDate = new Date(element.month);
    let capa = 0, plan = 0;
    if (this.showUnit === 'PD') {
      plan = (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
    } else {
      plan = (element.actualCost || 0) + (element.plannedCost || 0);
    }
    if (this.refPFV) {
      if (this.showUnit === 'PD') {
        capa = (element.baselineCost_PT || 0);
      } else {
        capa = (element.baselineCost || 0);
      }
    } else {
      if (this.showUnit === 'PD') {
        capa = (element.internCapa_PT || 0) + (element.externCapa_PT || 0);
      } else {
        capa = (element.internCapa || 0) + (element.externCapa || 0);
      }
    }
    if (source) {
      this.sumCost0 += plan;
      this.sumBudget0 += capa;
    } else {
      this.sumCost1 += plan;
      this.sumBudget1 += capa;
    }
    const template: DrillDownElement[] = [];
    const elementDrill = new DrillDownElement();
    elementDrill.currentDate = currentDate;
    elementDrill.source = source;
    elementDrill.name = this.currentLeaf.name;
    elementDrill.plan = plan;
    elementDrill.planTotal = plan;
    elementDrill.budget = capa;
    template.push(elementDrill)
    childNodeList.forEach(element => {
      template.push({currentDate: currentDate, source: source, name: element, variantName: '', plan: 0, planTotal: undefined, budget: 0});
    });
    drillDownCapacity.push(template);
  }

  addCapacityOrgaDetail(drillDownCapacity: DrillDownElement[][], element: VisboCapacity, source: boolean, mapNodeList: number[]): void {
    const currentDate = new Date(element.month);
    const row = drillDownCapacity.find(element => element[0].currentDate.getTime() == currentDate.getTime() && element[0].source == source);
    let plan = 0, budget = 0;

    if (row) {
      const index = mapNodeList[element.roleName];
      if (index >= 0) {
        if (this.showUnit === 'PD') {
          plan = (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
        } else {
          plan = (element.actualCost || 0) + (element.plannedCost || 0);
        }
        if (this.refPFV) {
          if (this.showUnit === 'PD') {
            budget = (element.baselineCost_PT || 0);
          } else {
            budget = (element.baselineCost || 0);
          }
        } else {
          if (this.showUnit === 'PD') {
            budget = (element.internCapa_PT || 0) + (element.externCapa_PT || 0);
          } else {
            budget = (element.internCapa || 0) + (element.externCapa || 0);
          }
        }

        row[index + 1].plan = plan;
        row[index + 1].budget = budget;
        if (row[0].plan >= plan) {
          row[0].plan -= plan;
        } else {
          row[0].plan = 0;
        }
      }
    }
  }

  visboViewCapacityDrillDown(): void {
    const graphDataCapacity = [];
    const initialOffset = 1    // first element in the array is the parent
    const capacity = this.visboCapacity.source;
    const capacityCmp = this.visboCapacity.compare;
    const capacityChild = this.visboCapacityChild.source;
    const capacityChildCmp = this.visboCapacityChild.compare;

    this.log(`ViewCapacityDrillDown resource ${this.currentLeaf.name}`);
    this.sumCost0 = 0;
    this.sumBudget0 = 0;
    this.sumCost1 = 0;
    this.sumBudget1 = 0;

    const childNodeList = this.calcChildNode(capacityChild, capacityChildCmp);
    const mapNodeList = this.mapChildNode(childNodeList);

    const drillDownCapacity: DrillDownElement[][] = [];
    capacity.forEach(item => {
      this.addCapacityOrgaRow(drillDownCapacity, item, true, childNodeList);
    });
    capacityCmp.forEach(item => {
      this.addCapacityOrgaRow(drillDownCapacity, item, false, childNodeList);
    });
    // now fill up with the Child Infos
    capacityChild.forEach(item => {
      this.addCapacityOrgaDetail(drillDownCapacity, item, true, mapNodeList);
    });
    capacityChildCmp.forEach(item => {
      this.addCapacityOrgaDetail(drillDownCapacity, item, false, mapNodeList);
    });

    for (let index = 0; index < drillDownCapacity.length; index++) {
      const element = drillDownCapacity[index];
      const currentDate = new Date(element[0].currentDate);
      const rowMatrixBudget = [];
      rowMatrixBudget.push(new Date(element[0].currentDate));
      const budget = element[0].budget || 0;
      const tooltip = this.createTooltipOrgaDrillDown(element[0], this.showUnit === 'PD', this.refPFV);
      if (element[0].source) {
        rowMatrixBudget.push(budget);
        rowMatrixBudget.push(tooltip);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(element[0].plan || 0); // parent planned cost
        rowMatrixBudget.push(tooltip);
      } else {
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(budget);
        rowMatrixBudget.push(tooltip);
        rowMatrixBudget.push(element[0].plan || 0); // parent planned cost
        rowMatrixBudget.push(tooltip);
      }
      childNodeList.forEach(() => {
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
        rowMatrixBudget.push(undefined);
      });
      graphDataCapacity.push(rowMatrixBudget);

      if (element[0].source) {
        currentDate.setDate(currentDate.getDate() -5);
      } else {
        currentDate.setDate(currentDate.getDate() +5);
      }
      // capa Values compared against resources of organisation
      const rowMatrix = [];
      rowMatrix.push(currentDate);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      childNodeList.forEach((item, index) => {
        rowMatrix.push(element[index + initialOffset].plan);
        rowMatrix.push(this.createTooltipOrgaDrillDown(element[index + initialOffset], this.showUnit === 'PD', this.refPFV));
        const diffPercent = Math.round(this.calcLoadDiff(element[index + initialOffset], true) * 100);
        if (diffPercent > 100) {
          rowMatrix.push( '' + diffPercent + ' %')
        } else {
          rowMatrix.push(undefined)
        }
      });
      graphDataCapacity.push(rowMatrix);
    }
    // // we need at least 2 items for Line Chart and show the current status for today
    // const len = graphDataCapacity.length;
    // if (len < 1) {
    //   this.log(`visboCapacity Empty`);
    // }
    // // this.log(`visboCapacity len ${len}`);
    // if (len === 1) {
    //   // add an additional month as one month could not be displayed, but do not deliver values for it
    //   const currentDate = new Date(graphDataCapacity[0][0]);
    //   currentDate.setMonth(currentDate.getMonth()+1);
    //   const rowMatrix = [];
    //   rowMatrix.push(currentDate);
    //   rowMatrix.push(undefined);
    //   rowMatrix.push(undefined);
    //   rowMatrix.push(undefined);
    //   rowMatrix.push(undefined);
    //   childNodeList.forEach(() => {
    //     rowMatrix.push(undefined);
    //     rowMatrix.push(undefined);
    //     rowMatrix.push(undefined);
    //   });
    //   graphDataCapacity.push(rowMatrix);
    // }

    const tooltip = {type: 'string', role: 'tooltip', 'p': {'html': true}};
    const annotation = {type: 'string', role: 'annotation' };
    const rowHeader = [];
    rowHeader.push('Month');
    rowHeader.push(this.translate.instant(this.refPFV ? 'ViewCapacityCmp.lbl.budget' : 'ViewCapacityCmp.lbl.totalCapa'));
    rowHeader.push(tooltip);
    rowHeader.push(this.translate.instant(this.refPFV ? 'ViewCapacityCmp.lbl.budgetCmp' : 'ViewCapacityCmp.lbl.totalCapaCmp'));
    rowHeader.push(tooltip);
    rowHeader.push(this.currentLeaf.name);
    rowHeader.push(tooltip);
    childNodeList.forEach(item => {
      rowHeader.push(item);
      rowHeader.push(tooltip);
      rowHeader.push(annotation);
    });
    graphDataCapacity.unshift(rowHeader);

    // give the capacities colors
    let orgaColors = [];
    orgaColors = orgaColors.concat(scale('YlGnBu').colors(childNodeList.length + 3));
    orgaColors.reverse();
    orgaColors.unshift('gray');
    if (this.refPFV) {
      // color for baseline
      orgaColors.unshift(baselineColor);
    } else {
      // color for capa
      orgaColors.unshift(capaColor);
    }
    this.graphOptionsComboChart.colors = orgaColors;
    if (this.graphOptionsComboChart.bar) {
      this.graphOptionsComboChart.bar.groupWidth = '90%';
    }

    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  addCapacityRow(list: any[], element: VisboCapacity, source: boolean): void {
      const currentDate = new Date(element.month);
      // change bar position to be left and right from the beginning of month for the two versions source/compare
      if (source) {
        currentDate.setDate(currentDate.getDate() -5);
      } else {
        currentDate.setDate(currentDate.getDate() +5);
      }
      const roleID = this.currentLeaf.uid;
      let budget: number, actualCost: number, plannedCost: number;
      let tooltip: string;
      if (this.refPFV) {
        // capa Values compared against baseline Values
        if (this.showUnit === 'PD') {
          budget = Math.round(element.baselineCost_PT * 10) / 10 || 0;
          actualCost = Math.round(element.actualCost_PT * 10) / 10 || 0;
          plannedCost = Math.round(element.plannedCost_PT * 10) / 10 || 0;
          tooltip = this.createTooltipPlanActual(element, true, this.refPFV);
          if (source) {
            this.sumCost0 += (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
            this.sumBudget0 += (element.baselineCost_PT || 0);
            list.push([
              currentDate,
              element.roleID == roleID ? budget : undefined,
              element.roleID == roleID ? tooltip : undefined,
              undefined,
              undefined,
              actualCost,
              tooltip,
              plannedCost,
              tooltip,
              undefined,
              undefined,
              undefined,
              undefined
            ]);
          } else {
            this.sumCost1 += actualCost + plannedCost;
            this.sumBudget1 += budget;
            list.push([
              currentDate,
              undefined,
              undefined,
              element.roleID == roleID ? budget : undefined,
              element.roleID == roleID ? tooltip : undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              actualCost,
              tooltip,
              plannedCost,
              tooltip
            ]);
          }
        } else {
          const budget = Math.round(element.baselineCost * 10) / 10 || 0;
          const actualCost = Math.round(element.actualCost * 10) / 10 || 0;
          const plannedCost = Math.round(element.plannedCost * 10) / 10 || 0;
          const tooltip = this.createTooltipPlanActual(element, false, this.refPFV);
          if (source) {            
            this.sumCost0 += (element.actualCost || 0) + (element.plannedCost || 0);
            this.sumBudget0 += (element.baselineCost || 0);
            list.push([
              currentDate,
              element.roleID == roleID ? budget : undefined,
              element.roleID == roleID ? tooltip : undefined,
              undefined,
              undefined,
              actualCost,
              tooltip,
              plannedCost,
              tooltip,
              undefined,
              undefined,
              undefined,
              undefined
            ]);
          } else {
            this.sumCost1 += (element.actualCost || 0) + (element.plannedCost || 0);
            this.sumBudget1 += (element.baselineCost || 0);
            list.push([
              currentDate,
              undefined,
              undefined,
              element.roleID == roleID ? budget : undefined,
              element.roleID == roleID ? tooltip : undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              actualCost,
              tooltip,
              plannedCost,
              tooltip
            ]);
          }
        }
      } else {
        // capa Values compared against resources of organisation
        let budgetIntern: number, budgetExtern: number, actualCost: number, plannedCost: number, actualCostCmp: number, plannedCostCmp: number
        let tooltip: string, tooltipCmp: string;
        if (this.showUnit === 'PD') {
          if (source) {
            budgetIntern = Math.round(element.internCapa_PT * 10) / 10 || 0;
            budgetExtern = Math.round(element.externCapa_PT * 10) / 10 || 0;
            actualCost = Math.round(element.actualCost_PT * 10) / 10 || 0;
            plannedCost = Math.round(element.plannedCost_PT * 10) / 10 || 0;
            tooltip = this.createTooltipPlanActual(element, true);                      
            this.sumCost0 += (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
            this.sumBudget0 += (element.internCapa_PT || 0) + (element.externCapa_PT || 0);
          } else {
            actualCostCmp = Math.round(element.actualCost_PT * 10) / 10 || 0;
            plannedCostCmp = Math.round(element.plannedCost_PT * 10) / 10 || 0;
            tooltipCmp = this.createTooltipPlanActual(element, true);
            this.sumCost1 += (element.actualCost_PT || 0) + (element.plannedCost_PT || 0);
            const budgetInternCmp = Math.round(element.internCapa_PT * 10) / 10 || 0;
            const budgetExternCmp = Math.round(element.externCapa_PT * 10) / 10 || 0;
            this.sumBudget1 += (element.internCapa_PT || 0) + (element.externCapa_PT || 0);
          }
          list.push([
            currentDate,
            element.roleID == roleID ? (budgetIntern + budgetExtern) : undefined,
            element.roleID == roleID ? tooltip : undefined,
            element.roleID == roleID ? budgetIntern : undefined,
            element.roleID == roleID ? tooltip : undefined,
            actualCost,
            tooltip,
            plannedCost,
            tooltip,
            actualCostCmp,
            tooltipCmp,
            plannedCostCmp,
            tooltipCmp
          ]);
        } else {
          if (source) {
            budgetIntern = Math.round(element.internCapa * 10) / 10 || 0;
            budgetExtern = Math.round(element.externCapa * 10) / 10 || 0;
            actualCost = Math.round(element.actualCost * 10) / 10 || 0;
            plannedCost = Math.round(element.plannedCost * 10) / 10 || 0;
            tooltip = this.createTooltipPlanActual(element, false);
            this.sumCost0 += (element.actualCost || 0) + (element.plannedCost || 0);
            this.sumBudget0 += (element.internCapa || 0) + (element.externCapa || 0);
          } else {
            actualCostCmp = Math.round(element.actualCost * 10) / 10 || 0;
            plannedCostCmp = Math.round(element.plannedCost * 10) / 10 || 0;
            tooltipCmp = this.createTooltipPlanActual(element, false);
            this.sumCost1 += (element.actualCost || 0) + (element.plannedCost || 0);
            const budgetInternCmp = Math.round(element.internCapa * 10) / 10 || 0;
            const budgetExternCmp = Math.round(element.externCapa * 10) / 10 || 0;
            this.sumBudget1 += (element.internCapa || 0) + (element.externCapa || 0);          }
          list.push([
            currentDate,
            element.roleID == roleID ? (budgetIntern + budgetExtern) : undefined,
            element.roleID == roleID ? tooltip : undefined,
            element.roleID == roleID ? budgetIntern : undefined,
            element.roleID == roleID ? tooltip : undefined,
            actualCost,
            tooltip,
            plannedCost,
            tooltip,
            actualCostCmp,
            tooltipCmp,
            plannedCostCmp,
            tooltipCmp
          ]);
        }
      }
  }

  visboViewCapacity(): void {
    const graphDataCapacity = [];
    const capacity = this.visboCapacity.source;
    const capacityCmp = this.visboCapacity.compare;
    if (capacity.length > 0 ) {
      this.capacityFrom =  new Date(capacity[0].month);
      this.capacityTo = new Date(capacity[capacity.length-1].month);
    }
    if (this.graphOptionsComboChart.bar) {
      this.graphOptionsComboChart.bar.groupWidth = '60%';
    }

    this.sumCost0 = 0;
    this.sumBudget0 = 0;
    this.sumCost1 = 0;
    this.sumBudget1 = 0;

    for (let i = 0; i < capacity.length; i++) {
      this.addCapacityRow(graphDataCapacity, capacity[i], true);
      this.addCapacityRow(graphDataCapacity, capacityCmp[i], false);
    }

    // set number of gridlines to a fixed count to avoid in between gridlines
    this.graphOptionsComboChart.hAxis.gridlines.count = graphDataCapacity.length;
    if (this.refPFV) {
      graphDataCapacity.unshift([
        'Month',
        this.translate.instant('ViewCapacityCmp.lbl.budget'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.budgetCmp'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.actualCost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.cost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.actualCostCmp'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.costCmp'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}}
      ]);
    } else {
      graphDataCapacity.unshift([
        'Month',
        this.translate.instant('ViewCapacityCmp.lbl.totalCapa'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.internCapa'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.actualCost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.cost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.actualCostCmp'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacityCmp.lbl.costCmp'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}}
      ]);
    }

    
    // round the sum
    this.sumCost0 = Math.round(this.sumCost0 * 10) / 10 || 0;
    this.sumBudget0 = Math.round(this.sumBudget0 * 10) / 10 || 0;
    this.sumCost1 = Math.round(this.sumCost1 * 10) / 10 || 0;
    this.sumBudget1 = Math.round(this.sumBudget1 * 10) / 10 || 0;

    // this.log(`view Capacity VP Capacity budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
    if (this.graphDataComboChart && row < this.graphDataComboChart.length) {
      if (this.drillDown == 2) {
        // navigate to the project capacity
        const vpName = this.graphDataComboChart[0][label];
        const currentDate = this.graphDataComboChart[row + 1][0];
        this.log(`chart identified Row ${currentDate} Project: ${vpName}`);
        this.gotoClickedRow(vpName);
      } else {
        const roleName = this.graphDataComboChart[0][label];
        const currentDate = this.graphDataComboChart[row + 1][0];
        this.log(`chart identified Row ${currentDate} Role: ${roleName}`);
        const leaf = getLeafByName(this.orga, roleName);
        if (leaf) {
          this.selectLeaf(leaf, true);
        }
      }
    }
  }

  gotoClickedRow(vpName: string): void {
    this.log(`goto VP ${vpName}`);
    // const element = this.visboCapacityChild.find(item => item.name == vpName);
    // if (element) {
    //   const queryParams = new VPParams();
    //   if (element.variantName) {
    //     queryParams.variantName = element.variantName;
    //   }
    //   if (this.refDate && !visboIsToday(this.refDate)) {
    //     queryParams.refDate = this.refDate.toISOString();
    //   }
    //   queryParams.unit = this.showUnit === 'PD' ? '1' : '0';
    //   if (this.roleID) {
    //     queryParams.roleID = this.roleID;
    //   }
    //   if (this.capacityFrom) {
    //     queryParams.from = this.capacityFrom.toISOString();
    //   }
    //   if (this.capacityTo) {
    //     queryParams.to = this.capacityTo.toISOString();
    //   }
    //   if (this.refDate) {
    //     queryParams.refDate = this.refDate.toISOString();
    //   }
    //   queryParams.view = 'Capacity';
    //   queryParams.drillDown = '1';
    //   this.log(`Goto vpid ${element.vpid} QueryParams ${JSON.stringify(queryParams)}`)
    //
    //   this.router.navigate(['vpKeyMetrics/'.concat(element.vpid)], {
    //     queryParams: queryParams
    //   });
    // } else {
    //   this.log(`Project ${vpName} not found`)
    // }
  }

  createTooltipPlanActual(capacity: VisboCapacity, pd: boolean, refPFV = false): string {
    const currentDate = convertDate(new Date(capacity.month), 'fullMonthYear', this.currentLang);
    //const currentDate = convertDate(new Date(capacity.month), 'fullDate', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:250px;">' +
      '<div><b>' + currentDate + '</b></div>';

    const strTotalCapa = this.translate.instant(pd ? 'ViewCapacityCmp.lbl.totalCapa' : 'ViewCapacityCmp.lbl.totalCapa_PT');
    const strInternCapa = this.translate.instant(pd ? 'ViewCapacityCmp.lbl.internCapa' : 'ViewCapacityCmp.lbl.internCapa_PT');
    const strActualCost = this.translate.instant('ViewCapacityCmp.lbl.actualCost');
    const strCost = this.translate.instant('ViewCapacityCmp.lbl.cost');
    const roleName = this.translate.instant('ViewCapacityCmp.lbl.roleName');
    const strBudget = this.translate.instant('ViewCapacityCmp.lbl.budget');
    const strDiffCost = this.translate.instant('ViewCapacityCmp.lbl.diffCost');

    let totalCapa: number, internCapa: number, actualCost: number, plannedCost: number;
    const unit = ' ' + this.translate.instant(pd ? 'ViewCapacityCmp.lbl.pd' : 'ViewCapacityCmp.lbl.keuro');

    if (pd) {
      actualCost = capacity.actualCost_PT || 0;
      plannedCost = capacity.plannedCost_PT || 0;
    } else {
      actualCost = capacity.actualCost || 0;
      plannedCost = capacity.plannedCost || 0;
    }

    if (refPFV) {
      if (pd) {
        totalCapa = capacity.baselineCost_PT || 0;
      } else {
        totalCapa = capacity.baselineCost || 0;
      }
    } else {
      if (pd) {
        internCapa = capacity.internCapa_PT || 0;
        totalCapa = ((capacity.internCapa_PT || 0) + (capacity.externCapa_PT || 0));

      } else {
        internCapa = capacity.internCapa || 0;
        totalCapa = ((capacity.internCapa || 0) + (capacity.externCapa || 0));
      }
    }
    result = result + this.addTooltipRowString(roleName + ':', capacity.roleName, false);
    result = result + this.addTooltipRowNumber(refPFV ? strBudget : strTotalCapa, totalCapa, pd ? 0 : 1, unit, false);
    if (!refPFV) {
      result = result + this.addTooltipRowNumber(strInternCapa, internCapa, pd ? 0 : 1, unit, false);
    }
    if (actualCost !== 0) {
      result = result + this.addTooltipRowNumber(strActualCost, actualCost, pd ? 0 : 1, unit, false);
    }
    result = result + this.addTooltipRowNumber(strCost, plannedCost, pd ? 0 : 1, unit, false);
    const diff = actualCost + plannedCost - totalCapa;
    if (diff != 0) {
      result = result + this.addTooltipRowNumber(strDiffCost, diff, pd ? 0 : 1, unit, true);
    }
    result = result + '</div>';

    return result;
  }

  addTooltipRowNumber(label: string, value: number, precision: number, unit: string, color: boolean): string {
    let result: string;
    result = '<div class="row">' +  '<div class="col-8">' + label;
    if (color === true && value !== 0) {
      if (value < 0) {
        result += '</div><div  class="col-4 text-right text-success font-weight-bold">'
      } else if (value > 0) {
        result += '</div><div  class="col-4 text-right text-danger font-weight-bold">'
      }
    } else {
      result += '</div><div  class="col-4 text-right font-weight-bold">'
    }
    result += this.visboRoundToString(value, precision) + unit + '</div>'
    result += '</div>'
    return result;
  }

  addTooltipRowString(label: string, value: string, color: boolean): string {
    let result: string;
    result = '<div class="row">' +  '<div class="col-4">' + label;
    result += '</div><div  class="col-8 text-right font-weight-bold">'
    result += value + '</div>'
    result += '</div>'
    return result;
  }

  createTooltipProjectDrillDown(item: DrillDownElement, PT: boolean, refPFV = false): string {
    const current = convertDate(item.currentDate, 'fullMonthYear', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:250px;">' +
      '<div><b>' + current + '</b></div>';

    const name = this.translate.instant('ViewCapacityCmp.lbl.project');
    let unit: string, strBudgetCost: string;

    const strFractionCost = this.translate.instant('ViewCapacityCmp.lbl.fractionCost');
    const strCost = this.translate.instant('ViewCapacityCmp.lbl.cost');
    if (PT) {
      unit = ' ' + this.translate.instant('ViewCapacityCmp.lbl.pd');
    } else {
      unit = ' ' + this.translate.instant('ViewCapacityCmp.lbl.keuro');
    }
    if (refPFV) {
      strBudgetCost = this.translate.instant('ViewCapacityCmp.lbl.budget');
    }

    let vpName = item.name;
    if (item.variantName) {
      vpName = vpName.concat(' (', item.variantName,')')
    }
    result = result + this.addTooltipRowString(name, vpName, false);
    const plan = item.planTotal > 0 ? item.planTotal : item.plan;
    if (refPFV) {
      result = result + this.addTooltipRowNumber(strBudgetCost, item.budget, PT ? 0 : 1, unit, false);
    }
    result = result + this.addTooltipRowNumber(strCost, plan, PT ? 0 : 1, unit, false);

    const diff = this.calcLoadDiff(item, false);
    if (diff) {
      const diffPercent = '' + Math.round(this.calcLoadDiff(item, true) * 100) + ' %';
      if (diffPercent !== undefined) {
        result = result + this.addTooltipRowString(strFractionCost, diffPercent, true);
      } else {
        result = result + this.addTooltipRowString(strFractionCost, 'Unknown', false);
      }
    }
    result = result + '</div>';
    return result;
  }

  createTooltipOrgaDrillDown(item: DrillDownElement, PT: boolean, refPFV = false): string {
    const current = convertDate(item.currentDate, 'fullMonthYear', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:250px;">' +
      '<div><b>' + current + '</b></div>';

    const roleName = this.translate.instant('ViewCapacityCmp.lbl.roleName');
    let unit: string, strBudgetCost: string;

    const strDiffCost = this.translate.instant('ViewCapacityCmp.lbl.diffCost');
    const strCost = this.translate.instant('ViewCapacityCmp.lbl.cost');
    if (PT) {
      unit = ' ' + this.translate.instant('ViewCapacityCmp.lbl.pd');
    } else {
      unit = ' ' + this.translate.instant('ViewCapacityCmp.lbl.keuro');
    }
    if (refPFV) {
      strBudgetCost = this.translate.instant('ViewCapacityCmp.lbl.budget');
    } else {
      strBudgetCost = this.translate.instant('ViewCapacityCmp.lbl.totalCapa');
    }

    result = result + this.addTooltipRowString(roleName, item.name, false);
    const plan = item.planTotal > 0 ? item.planTotal : item.plan;
    result = result + this.addTooltipRowNumber(strBudgetCost, item.budget, PT ? 0 : 1, unit, false);
    result = result + this.addTooltipRowNumber(strCost, plan, PT ? 0 : 1, unit, false);

    const diff = this.calcLoadDiff(item, false);
    if (diff != 0) {
      result = result + this.addTooltipRowNumber(strDiffCost, diff, PT ? 0 : 1, unit, true);
      const diffPercent = this.calcLoadDiff(item, true);
      if (diffPercent == undefined) {
        const str = '> 999 %'
        result = result + this.addTooltipRowString(strDiffCost, str, true);
      } else {
        const str = '' + Math.round(diffPercent * 100) + ' %'
        result = result + this.addTooltipRowString(strDiffCost, str, true);
      }
    }
    result = result + '</div>';
    return result;
  }

  calcLoadDiff(item: DrillDownElement, percent = false): number {
    const plan = item.planTotal > 0 ? item.planTotal : item.plan;
    const diff = plan - item.budget;
    if (percent) {
      if (!item.budget) {
        return plan ? undefined : 1;
      }
      return plan / item.budget;
    } else {
      return diff;
    }
  }


 visboSortProjects(capacity:VisboCapacity[]): VisboCapacity[] {
    // ------- SORT by sum value -------
    const groupKey = (value: VisboCapacity) => value.name;
    const sumValue = (value: VisboCapacity) => value.plannedCost_PT + value.actualCost_PT;
    const capacityChildGroupedByProject = capacity.reduce((accumulator, elem) => {
      const key = groupKey(elem);
      if (!accumulator.has(key)) {
        accumulator.set(key, {sum: 0, elems: []});
      }
      accumulator.get(key).elems.push(elem);
      accumulator.get(key).sum += sumValue(elem);
      return accumulator;
    }, new Map<string, {sum: number; elems: VisboCapacity[]}>());

    this.log(JSON.stringify(capacityChildGroupedByProject));

    const sortedValues = Array.from(capacityChildGroupedByProject.values())
            .sort((a, z) => z.sum - a.sum);
            //.sort((a, z) => z.sum/z.elems.length - a.sum/a.elems.length);
    const sortedArray = sortedValues.map((item) => item.elems);
    const flatArray = [].concat([], ...sortedArray);
    this.log(JSON.stringify(sortedValues));
    const sortedProjects: VisboCapacity[] = flatArray;
    return sortedProjects;
    // ------ SORT END ------
 }


  visboRoundToString(value: number, fraction = 1): string {
    const result = value || 0;
    return result.toLocaleString(this.currentLang, {minimumFractionDigits: fraction, maximumFractionDigits: fraction})
  }

  displayCapacity(): number {
    let result = -1;
    if (this.drillDown != 2 && this.vcOrganisation && this.visboCapacity?.source) {     // Orga && Capacity data available
      result = this.visboCapacity.source.length;
    } else if (this.drillDown == 2  && this.vcOrganisation && this.visboCapacityChild?.source){
      result = this.visboCapacityChild.source.length;
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

  selectLeaf(leaf: VisboOrgaTreeLeaf, showChildren = true): void {
    if (leaf.name !== this.currentLeaf.name ) {
      setTreeLeafSelection(this.currentLeaf, TreeLeafSelection.NOT_SELECTED);
      this.currentLeaf = leaf;
      this.updateUrlParam('roleID', leaf.uid.toString());
      this.getCapacity();
    }
    if (showChildren) {
      leaf.showChildren = true;
    }
    setTreeLeafSelection(leaf, TreeLeafSelection.SELECTED);
    return;
  }

  switchLeaf(leaf: VisboOrgaTreeLeaf): void {
    leaf.showChildren = !leaf.showChildren;
    this.selectLeaf(leaf, leaf.showChildren);
    return;
  }

  copyCapacity(vpv: VisboCapacity, name: string): VisboCapacity {
    const copy: VisboCapacity = Object.assign({}, vpv);
    copy.month = new Date(vpv.month);
    copy.name = name;
    delete copy.vpid;

    return copy;
  }

  exportExcel(): void {
    this.log(`Export Data to Excel ${this.visboCapacity.source?.length} ${this.visboCapacityChild.source?.length}`);
    // convert list to matix

    // const excel: VisboCapacity[] = [];
    //
    // let name = '';
    // let urlWeb = ''
    // const listURL: string[] = [];
    // const tooltip = this.translate.instant('ViewCapacityCmp.msg.viewWeb');
    // if (this.vpfActive) {
    //   name = this.vpfActive.name
    //   urlWeb = window.location.origin.concat('/vpf/', this.vpfActive.vpid, '?view=Capacity');
    // } else if (this.vpActive) {
    //   name = this.vpActive.name;
    //   urlWeb = window.location.origin.concat('/vpKeyMetrics/', this.vpActive._id, '?view=Capacity');
    // } else if (this.vcActive) {
    //   name = this.vcActive.name;
    //   urlWeb = window.location.origin.concat('/vp/', this.vcActive._id, '?view=KeyMetrics&viewCockpit=Capacity');
    // }
    // if (this.visboCapacity) {
    //   this.visboCapacity.forEach(element => {
    //     excel.push(this.copyCapacity(element, name));
    //     listURL.push(urlWeb);
    //   });
    // }
    // if (this.visboCapacityChild) {
    //   this.visboCapacityChild.forEach(element => {
    //     let urlWebDetail = urlWeb;
    //     if (element.name) {
    //       urlWebDetail = window.location.origin.concat('/vpKeyMetrics/', element.vpid, '?view=Capacity');
    //     }
    //     excel.push(this.copyCapacity(element, element.name || name));
    //     listURL.push(urlWebDetail);
    //   });
    // }
    //
    // const len = excel.length;
    // const width = Object.keys(excel[0]).length;
    // this.log(`Export Data to Excel ${excel.length}`);
    // // Add Localised header to excel
    // // eslint-disable-next-line
    // const header: any = {};
    // let colName: number, colIndex = 0;
    // for (const element in excel[0]) {
    //   this.log(`Processing Header ${element}`);
    //   if (element == 'name') {
    //     colName = colIndex;
    //   }
    //   colIndex++;
    //   header[element] = this.translate.instant('ViewCapacityCmp.lbl.'.concat(element))
    // }
    // excel.unshift(header);
    // this.log(`Header for Excel: ${JSON.stringify(header)}`)
    //
    // const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
    // for (let index = 1; index <= len; index++) {
    //   const address = XLSX.utils.encode_cell({r: index, c: colName});
    //   const url = listURL[index - 1];
    //   worksheet[address].l = { Target: url, Tooltip: tooltip };
    // }
    // const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
    // worksheet['!autofilter'] = { ref: matrix };
    // // eslint-disable-next-line
    // const sheets: any = {};
    // const sheetName = visboGetShortText(name, 30);
    // sheets[sheetName] = worksheet;
    // const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [sheetName] };
    // // eslint-disable-next-line
    // const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    // const actDate = new Date();
    // const fileName = ''.concat(
    //   actDate.getFullYear().toString(),
    //   '_',
    //   (actDate.getMonth() + 1).toString().padStart(2, "0"),
    //   '_',
    //   actDate.getDate().toString().padStart(2, "0"),
    //   '_Capacity ',
    //   (name || '')
    // );
    //
    // const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
    // const url = window.URL.createObjectURL(data);
    // const a = document.createElement('a');
    // document.body.appendChild(a);
    // a.href = url;
    // a.download = fileName.concat(EXCEL_EXTENSION);
    // this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    // a.click();
    // window.URL.revokeObjectURL(url);
  }

  parseDate(dateString: string): Date {
     if (dateString) {
       const actDate = new Date(dateString);
       actDate.setDate(1);
       actDate.setHours(0, 0, 0, 0);
       return actDate;
    }
    return null;
  }

  compareDate(): boolean {
    const start = this.capacityFrom;
    const end = this.capacityTo;

    const stDate = new Date(start);
    const enDate = new Date(end);
    const compDate = visboCmpDate(enDate,stDate);

    if(compDate >= 0) {
      return true;
    } else {
      // alert("Please Enter the correct date ");
      return false;
    }
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewCapcity: ' + message);
  }

}
