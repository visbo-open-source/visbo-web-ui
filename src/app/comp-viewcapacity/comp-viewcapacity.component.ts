import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboSetting, VisboOrganisation, VisboOrgaStructure, VisboReducedOrgaItem,
          VisboOrgaTreeLeaf, TreeLeafSelection } from '../_models/visbosetting';
import { getCustomFieldDouble, getCustomFieldString, VisboProject, VPParams, constSystemVPStatus } from '../_models/visboproject';
import { VisboCenter } from '../_models/visbocenter';

import { VisboCapacity, VisboProjectVersion} from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFParams } from '../_models/visboportfolioversion';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, convertDate, validateDate, visboIsToday,
          visboGetShortText, getPreView, excelColorToRGBHex } from '../_helpers/visbo.helper';
import { buildOrgaTree, expandParentTree, setTreeLeafSelection, getLeafByID, getLeafByName,
          isParentLeaf } from '../_helpers/orga.helper';

import { scale } from 'chroma-js';

import * as XLSX from 'xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

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
  name: string;
  variantName: string;
  businessUnit: string;
  strategicFit: number;
  plan: number;
  planTotal: number;
  budget: number;
  budgetIntern: number;
}

class DrillDownCapa {
  id: number;
  name: string;
  localName: string;
}

class DropDownStatus {
  name: string;
  localName: string;
}

class VPProperties {
  _bu: string;
  _strategicFit: number;
  _risk: number;
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
  @Input() listVP: VisboProject[];
  @Input() customize: VisboSetting;
  @Input() vpvActive: VisboProjectVersion;
  @Input() vcOrganisation: VisboOrganisation;
  @Input() refDate: Date;
  @Input() combinedPerm: VGPermission;

  lastTimestampVPF: Date;
  visboCapacity: VisboCapacity[];
  visboCapacityChild: VisboCapacity[];
  visboprojectversions: VisboProjectVersion[];

  capaLoad: CapaLoad[];
  timeoutID: number;
  timeoutFilterID: number;
  hasCost: boolean;
  printView = false;

  roleID: number;
  currentLeaf: VisboOrgaTreeLeaf;
  capacityFrom: Date;
  capacityTo: Date;
  currentRefDate: Date
  currentName: string;

  sumCost = 0;
  sumBudget = 0;

  filter: string;
  filterStrategicFit: number;
  filterRisk: number;
  filterBU: string;
  dropDownBU: string[];
  filterVPStatusIndex: number;
  dropDownVPStatus: DropDownStatus[];

  listVPProperties: VPProperties[];

  showUnit: string;
  showUnitText: string;
  refPFV = false;
  drillDown: number;
  drillDownCapa: DrillDownCapa[];
  drillDownCapaFiltered: DrillDownCapa[];
  parentThis = this;

  orga: VisboOrgaStructure;
  topLevelNodes: VisboReducedOrgaItem[];

  colorsPFV = [baselineColor, '#BDBDBD', '#458CCB','#adc7f1'];
  colorsOrga = [capaColor, capaColor, '#BDBDBD', '#458CCB','#adc7f1'];
  seriesPFV = [
    {type: 'line', lineWidth: 4, pointSize: 0}
  ];
  seriesOrga = [
    {type: 'line', lineWidth: 4, pointSize: 0},
    {type: 'line', lineWidth: 2, lineDashStyle: [4, 4], pointSize: 1},
    // legende of Ist-Kosten visible or not
    {visibleInLegend: true},
    // legend of Plan-Kosten visible or not
    {visibleInLegend: true},
    // legend of otherActivity-Kosten visible or not
    {visibleInLegend: true}
  ];

  chartActive: Date;
  graphDataComboChart = [];
  graphOptionsComboChart = {
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
      colors: this.colorsOrga,
      series: this.seriesOrga,
      seriesType: 'bars',
      isStacked: true,
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
        minorGridlines: {count: 0, color: '#FFF'},
        slantedText: true,
        slantedTextAngle: 90
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
        localName: this.translate.instant('ViewCapacity.lbl.drillNone')
      },
      {
        id: 1,
        name: 'drillOrga',
        localName: this.translate.instant('ViewCapacity.lbl.drillOrga')
      },
      {
        id: 2,
        name: 'drillProject',
        localName: this.translate.instant('ViewCapacity.lbl.drillProject')
      },
      {
        id: 3,
        name: 'drillProjectBU',
        localName: this.translate.instant('ViewCapacity.lbl.drillProjectBU')
      },
    ];
    this.drillDownCapaFiltered = this.drillDownCapa;

    this.initSetting();
    if (!this.refDate) { this.refDate = new Date(); }
    this.currentRefDate = this.refDate;
    if (this.showUnit == 'PD') {
      this.showUnitText = this.translate.instant('ViewCapacity.lbl.pd');
    } else {
      this.showUnitText = this.translate.instant('ViewCapacity.lbl.euro');
    }
    this.log(`Capacity Init  RefDate ${this.refDate} Current RefDate ${this.currentRefDate}`);
    this.capaLoad = [];
    if (this.vpfActive) {
      this.lastTimestampVPF = this.vpfActive.timestamp;
    } else if (this.vpvActive) {
      this.drillDownCapaFiltered = this.drillDownCapa.filter( item => (item.id != 2)  && (item.id != 3));
      this.lastTimestampVPF = this.vpvActive.timestamp;
    }
    this.initVPProperties();
    this.getProjectVersions();
    this.visboViewOrganisationTree();
    this.getCapacity();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Capacity Changes  RefDate ${this.refDate} Current RefDate ${this.currentRefDate}`);
    let refresh = false;

    // in case of VP Capacity
    if (changes.vpvActive?.previousValue && changes.vpvActive?.currentValue?.timestamp &&  changes.vpvActive?.currentValue?.timestamp != changes.vpvActive?.previousValue?.timestamp ) {
      refresh = true;
    }
    // in case of VPF Capacity changing VPF Version
    if (changes.vpfActive?.previousValue && changes.vpfActive?.currentValue?.timestamp &&  changes.vpfActive?.currentValue?.timestamp != changes.vpfActive?.previousValue?.timestamp) {
      refresh = true;
    }
    // refresh calculation if refDate has changed or the timestamp of the VPF has changed
    if (refresh || (this.currentRefDate !== undefined && this.refDate.getTime() !== this.currentRefDate.getTime())) {
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

  initVPProperties(): void {
      if (!this.listVP) { return; }
      this.listVPProperties = [];
      this.listVP.forEach(vp => {
        const properties = new VPProperties();
        properties._bu = getCustomFieldString(vp, "_businessUnit")?.value;
        properties._strategicFit = getCustomFieldDouble(vp, "_strategicFit")?.value;
        properties._risk = getCustomFieldDouble(vp, "_risk")?.value;
        this.listVPProperties[vp._id] = properties;
      });
      return;
  }

  initSetting(): void {
    this.chartActive = undefined;
    this.roleID = this.route.snapshot.queryParams['roleID'];
    const pfv = this.route.snapshot.queryParams['pfv'];
    this.refPFV = pfv && Number(pfv) ? true : false;
    const unit = this.route.snapshot.queryParams['unit'];
    this.initShowUnit(unit);

    const filter = this.route.snapshot.queryParams['filter'] || undefined;
    const filterVPStatus = this.route.snapshot.queryParams['filterVPStatus'] || '';
    const filterVPStatusIndex = constSystemVPStatus.findIndex(item => item == filterVPStatus);
    const filterBU = this.route.snapshot.queryParams['filterBU'] || undefined;
    let filterParam = this.route.snapshot.queryParams['filterRisk'];
    const filterRisk = filterParam ? filterParam.valueOf() : undefined;
    filterParam = this.route.snapshot.queryParams['filterStrategicFit'];
    const filterStrategicFit = filterParam ? filterParam.valueOf() : undefined;
    if (filter) {
      this.filter = filter;
    }
    this.filterBU = filterBU;
    this.filterRisk = filterRisk;
    this.filterStrategicFit = filterStrategicFit;
    this.filterVPStatusIndex = filterVPStatusIndex >= 0 ? filterVPStatusIndex + 1: undefined;
    this.log(`Call init Filter ${this.visboprojectversions && this.visboprojectversions.length}`);
    this.initFilter(this.listVP);
    let drillDown = Number(this.route.snapshot.queryParams['drillDown']);
    if (!(drillDown >= 0)) {
      drillDown =  this.checkFilter() ? 2 : 0;
    }
    this.drillDown = drillDown;

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
    } else if (this.vpfActive) {
      this.currentName = this.vpfActive.name;
    } else if (this.vpActive) {
      this.currentName = this.vpActive.name;
    }
    this.initBUDropDown();
    this.initVPStateDropDown();

    this.log(`Capacity From / To ${this.capacityFrom} / ${this.capacityTo}`);
  }

  filterVP(vpList: VisboProject[]): VisboProject[] {
    const filter = this.filter;

    if (!vpList) { return undefined }
    const listVPFilter: VisboProject[] = [];
    vpList.forEach(item => {
      if (item.vpType != 0) {
        return;
      }
      if (filter
        && !(item.name.toLowerCase().indexOf(filter) >= 0
          // || (item.VorlagenName || '').toLowerCase().indexOf(filter) >= 0
          // || (item.leadPerson || '').toLowerCase().indexOf(filter) >= 0
          || (item.description || '').toLowerCase().indexOf(filter) >= 0
        )
      ) {
        return;
      }
      if (this.filterVPStatusIndex > 0) {
        const setting = item.vpStatus;
        if (setting !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
          return;
        }
      }
      if (this.filterBU) {
        const setting = getCustomFieldString(item, '_businessUnit');
        if (setting && setting.value !== this.filterBU) {
          return;
        }
      }
      if (this.filterRisk >= 0) {
        const setting = getCustomFieldDouble(item, '_risk');
        if (setting && setting.value < this.filterRisk) {
          return;
        }
      }
      if (this.filterStrategicFit >= 0) {
        const setting = getCustomFieldDouble(item, '_strategicFit');
        if (setting && setting.value < this.filterStrategicFit) {
          return;
        }
      }
      listVPFilter.push(item);
    })
    return listVPFilter;
  }

  filterVPV(vpvList: VisboProjectVersion[]): VisboProjectVersion[] {
    const filter = this.filter;

    const vpvFiltered: VisboProjectVersion[] = [];
    if (!vpvList) { return vpvFiltered }
    vpvList.forEach(item => {
      if (!item.vp) {
        return;
      }
      if (item.vp.vpType != 0) {
        return;
      }
      if (filter
        && !(item.vp.name.toLowerCase().indexOf(filter) >= 0
          || (item.VorlagenName || '').toLowerCase().indexOf(filter) >= 0
          || (item.leadPerson || '').toLowerCase().indexOf(filter) >= 0
          || (item.vp.description || '').toLowerCase().indexOf(filter) >= 0
        )
      ) {
        return;
      }
      if (this.filterVPStatusIndex > 0) {
        const setting = item.vp.vpStatus;
        if (setting !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
          return;
        }
      }
      if (this.filterBU) {
        const setting = getCustomFieldString(item.vp, '_businessUnit');
        if (setting && setting.value !== this.filterBU) {
          return;
        }
      }
      if (this.filterRisk >= 0) {
        const setting = getCustomFieldDouble(item.vp, '_risk');
        if (setting && setting.value < this.filterRisk) {
          return;
        }
      }
      if (this.filterStrategicFit >= 0) {
        const setting = getCustomFieldDouble(item.vp, '_strategicFit');
        if (setting && setting.value < this.filterStrategicFit) {
          return;
        }
      }
      vpvFiltered.push(item);
    })
    return vpvFiltered;
  }

  initFilter(vpList: VisboProject[]): void {
    let lastValueRisk: number;
    let lastValueSF: number;
    let lastValueVPStatus: string;
    let lastValueBU: string;
    if (!vpList || vpList.length < 1) {
      return;
    }

    vpList.forEach( item => {
      this.log(`initFilter check vp ${item.name}`)
      if (item.customFieldDouble) {
        if (this.filterStrategicFit === undefined) {
          const customField = getCustomFieldDouble(item, '_strategicFit');
          if (customField) {
            this.log(`initFilter check vp ${item.name} strategicFit ${customField}`);
            if ( this.filterStrategicFit == undefined && lastValueSF >= 0 && customField.value != lastValueSF) {
              this.filterStrategicFit = 0;
            }
            lastValueSF = customField.value
          }
        }
        if (this.filterRisk === undefined) {
          const customField = getCustomFieldDouble(item, '_risk');
          if (customField) {
            this.log(`initFilter check vp ${item.name} risk ${customField}`);
            if ( this.filterRisk == undefined && lastValueRisk >= 0 && customField.value != lastValueRisk) {
              this.filterRisk = 0;
            }
            lastValueRisk = customField.value
          }
        }
      }
      if (item.customFieldString) {
        if (this.filterBU === undefined) {
          const customField = getCustomFieldString(item, '_businessUnit');
          if (customField) {
            this.log(`initFilter check vp ${item.name} BU ${customField}`);
            if ( this.filterBU == undefined && lastValueBU && customField.value != lastValueBU) {
              this.filterBU = '';
            }
            lastValueBU = customField.value
          }
        }
      }
      const vpStatus = item.vpStatus;
      if (vpStatus) {
        if ( this.filterVPStatusIndex == undefined && lastValueVPStatus && vpStatus != lastValueVPStatus) {
          this.filterVPStatusIndex = 0;
        }
        lastValueVPStatus = vpStatus
      }
    });
  }

  checkFilter(): boolean {
    if ( this.filter
      || this.filterStrategicFit > 0
      || this.filterRisk > 0
      || this.filterBU
      || this.filterVPStatusIndex > 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  initBUDropDown(): void {
    const listBU = this.customize?.value?.businessUnitDefinitions;
    if (!listBU) return;
    this.dropDownBU = [];
    listBU.forEach(item => {
      this.dropDownBU.push(item.name);
    });
    if (this.dropDownBU.length > 1) {
      this.dropDownBU.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
      this.dropDownBU.unshift(this.translate.instant('compViewBoard.lbl.all'));
    } else {
      this.dropDownBU = undefined;
    }
  }

  initVPStateDropDown(): void {
    this.dropDownVPStatus = [];
    constSystemVPStatus.forEach(item => {
      this.dropDownVPStatus.push({name: item, localName: this.translate.instant('vpStatus.' + item)});
    });
    if (this.dropDownVPStatus.length > 1) {
      // this.dropDownVPStatus.sort(function(a, b) { return visboCmpString(a.localName.toLowerCase(), b.localName.toLowerCase()); });
      this.dropDownVPStatus.unshift({name: undefined, localName: this.translate.instant('compViewBoard.lbl.all')});
    } else {
      this.dropDownVPStatus = undefined;
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

  getCapacity(): void {
    if ((this.drillDown == 2)|| (this.drillDown == 3)) {
      this.getProjectCapacity();
    } else {
      this.getCapacityOrga();
    }
  }

  getProjectVersions(): void {
    this.visboprojectversions = undefined;

    if (this.vcActive ) {
      this.log(`Get VPV of VC ${this.vcActive._id}`);
      this.visboprojectversionService.getVisboCenterProjectVersions(this.vcActive._id)
        .subscribe(
          vpv => {
            // map vp to the list
            vpv.forEach(item => {
              item.vp = this.listVP.find(element => element._id.toString() == item.vpid.toString());
            })
            this.visboprojectversions = vpv;
          },
          error => {
            this.log(`get VC Project Versions failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vcActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpfActive) {
      this.log(`Get VPV of VPF ${this.vpActive._id} VPF ${this.vpfActive._id}`);
      this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id)
        .subscribe(
          vpv => {
            // map vp to the list
            vpv.forEach(item => {
              item.vp = this.listVP.find(element => element._id.toString() == item.vpid.toString());
            })
            this.visboprojectversions = vpv;
          },
          error => {
            this.log(`get VPF Project Versions failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    }
  }

  getProjectCapacity(): void {
    this.visboCapacity = undefined;

    if (this.vcActive ) {
      this.log(`Capacity Calc for VC ${this.vcActive._id} role ${this.currentLeaf.name}`);

      this.visbocenterService.getCapacity(this.vcActive._id, this.refDate, this.currentLeaf.uid.toString(),this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV, false, false, true)
        .subscribe(
          visbocenter => {
            if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
              this.visboCapacity = [];
              this.visboCapacityChild = [];
            } else {
              this.log(`Store VC Project Capacity for Len ${visbocenter.capacity.length}`);
              let capacity = visbocenter.capacity.filter(item => item.vpid != undefined);
              const listVPVFilter = this.filterVPV(this.visboprojectversions);
              capacity.forEach(item => {
                const vpv = listVPVFilter.find(vpv => vpv.vpid == item.vpid);
                item.vp = vpv && vpv.vp;
              });
              capacity = capacity.filter(item => item.vp != undefined);
              this.visboCapacityChild = capacity;
              if (this.checkFilter() && this.refPFV) {
                this.visboCapacity = this.sumCapacityChild(this.visboCapacityChild);
              } else {
                this.visboCapacity = visbocenter.capacity.filter(item => item.vpid == undefined);
              }
            }
            this.checkCostAvailable(this.visboCapacity);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vcActive.name});
              this.alertService.error(message, true);
            } else if (error.status === 409) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermOrganisation', {'name': this.vcActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpfActive && this.currentLeaf) {
      this.log(`Capacity Calc for VP ${this.vpActive._id} VPF ${this.vpfActive._id} role ${this.currentLeaf.name} DrillDown Project`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive._id, this.refDate, this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV, false, false, true)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapacity = [];
              this.visboCapacityChild = [];
            } else {
              let capacity: VisboCapacity[];
              this.log(`Store VPF Project Capacity for Len ${vp.capacity.length}`);
              capacity = vp.capacity.filter(item => item.vpid != undefined);
              const listVPVFilter = this.filterVPV(this.visboprojectversions);
              capacity.forEach(item => {
                const vpv = listVPVFilter.find(vpv => vpv.vpid == item.vpid);
                item.vp = vpv && vpv.vp;
              });
              capacity = capacity.filter(item => item.vp != undefined);
              this.visboCapacityChild = capacity;
              if (this.checkFilter() && this.refPFV) {
                this.visboCapacity = this.sumCapacityChild(this.visboCapacityChild);
              } else {
                this.visboCapacity = vp.capacity.filter(item => item.vpid == undefined);
              }
            }
            this.checkCostAvailable(this.visboCapacity);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VPF Capacity Project failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    }
  }

  sumCapacityChild(capacityChild: VisboCapacity[]): VisboCapacity[] {
    if (!capacityChild) { return undefined; }
    const capacityParent: VisboCapacity[] = [];
    capacityChild.forEach(item => {
      let capacity = capacityParent.find(element => element.month == item.month);
      if (!capacity) {
        capacity = new VisboCapacity();
        capacity.month = item.month;
        capacity.roleID = item.roleID;
        capacity.roleName = item.roleName;
        capacity.name = 'All';
        capacity.baselineCost = 0;
        capacity.baselineCost_PT = 0;
        capacityParent.push(capacity);
      }
      capacity.baselineCost += item.baselineCost;
      capacity.baselineCost_PT += item.baselineCost_PT;

      this.log(`Cumulate Child ${item.name} ${item.month}`);
    });
    return capacityParent;
  }

  getCapacityOrga(): void {
    this.visboCapacity = undefined;

    if (this.vcActive ) {
      this.log(`Capacity Calc for VC ${this.vcActive._id} role ${this.roleID}`);

      this.visbocenterService.getCapacity(this.vcActive._id, this.refDate, this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV)
        .subscribe(
          visbocenter => {
            if (!visbocenter.capacity || visbocenter.capacity.length === 0) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
              this.visboCapacity = [];
              this.visboCapacityChild = [];
            } else {
              this.log(`Store Capacity for Len ${visbocenter.capacity.length}`);
              let capacity = visbocenter.capacity.filter(item => item.roleID == this.currentLeaf.uid.toString());
              this.visboCapacity = capacity;
              capacity = visbocenter.capacity.filter(item => item.roleID != this.currentLeaf.uid.toString());
              this.visboCapacityChild = capacity;
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapacity, this.refPFV);
            }
            this.calcLoad(this.visboCapacityChild, this.refPFV);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VC Capacity failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vcActive.name});
              this.alertService.error(message, true);
            } else if (error.status === 409) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermOrganisation', {'name': this.vcActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpfActive && this.currentLeaf) {
      this.log(`Capacity Calc for VP ${this.vpActive._id} VPF ${this.vpfActive._id} role ${this.roleID}`);
      this.visboprojectService.getCapacity(this.vpActive._id, this.vpfActive._id, this.refDate, this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(),this.capacityFrom, this.capacityTo, true, this.refPFV)
        .subscribe(
          vp => {
            if (!vp.capacity || vp.capacity.length === 0) {
              this.log(`get VPF Calc: Reset Capacity to empty `);
              this.visboCapacity = [];
            } else {
              this.log(`Store Capacity for Len ${vp.capacity.length}`);
              let capacity = vp.capacity.filter(item => item.roleID == this.currentLeaf.uid);
              this.visboCapacity = capacity;
              capacity = vp.capacity.filter(item => item.roleID != this.currentLeaf.uid);
              this.visboCapacityChild = capacity;
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapacity, this.refPFV);
            }
            this.calcLoad(this.visboCapacityChild, this.refPFV);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vpActive.name});
              this.alertService.error(message, true);
            } else {
              this.alertService.error(getErrorMessage(error), true);
            }
          }
        );
    } else if (this.vpActive && this.vpvActive && this.currentLeaf) {
      this.refPFV = true;
      this.log(`Capacity Calc for VPV ${this.vpvActive.vpid} role ${this.roleID} ${this.currentLeaf.uid} ${this.currentLeaf.parent?.uid}`);
      this.visboprojectversionService.getCapacity(this.vpvActive._id, this.currentLeaf.uid.toString(), this.currentLeaf.parent.uid.toString(), this.capacityFrom, this.capacityTo, true, this.refPFV)
        .subscribe(
          listVPV => {
            if (!listVPV || listVPV.length != 1 || !listVPV[0].capacity || listVPV[0].capacity.length === 0) {
              this.log(`get VPV Calc: Reset Capacity to empty `);
              this.visboCapacity = [];
            } else {
              const vpv = listVPV[0];
              this.log(`Store Capacity for Len ${vpv.capacity.length}`);
              let capacity = vpv.capacity.filter(item => item.roleID == this.currentLeaf.uid);
              this.visboCapacity = capacity;
              capacity = vpv.capacity.filter(item => item.roleID != this.currentLeaf.uid);
              this.visboCapacityChild = capacity;
            }
            if (this.topLevelNodes.findIndex(item => item.uid == this.currentLeaf.uid) >= 0) {
              this.calcLoad(this.visboCapacity, this.refPFV);
            }
            this.calcLoad(this.visboCapacityChild, this.refPFV);
            this.visboViewCapacityOverTime();
          },
          error => {
            this.log(`get VPF Capacity failed: error: ${error.status} message: ${error.error && error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('ViewCapacity.msg.errorPermCapacity', {'name': this.vpActive.name});
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

    // calculate the overload/underload only for current&future months if there were at least 1
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    let onlyFuture = false;
    const first = new Date(capacity[0].month);
    const last = new Date(capacity[capacity.length - 1].month);
    if (first.getTime() >= startOfMonth.getTime() || last.getTime() >= startOfMonth.getTime()) {
      onlyFuture = true;
    }

    let capaLoad: CapaLoad[] = [];
    for (let i=0; i < capacity.length; i++) {
      const act = new Date(capacity[i].month);
      if (onlyFuture && act.getTime() < startOfMonth.getTime()) {
        continue;
      }
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
    let showDays = true;
    if (this.hasVPPerm(this.permVP.ViewAudit) && (unit != '1' && unit != 'PD')) {
      showDays = false;
    }
    this.showUnit = showDays ? 'PD' : 'PE';
    this.updateUrlParam('unit', this.showUnit);
    if (showDays) {
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

  filterKeyBoardEvent(event: KeyboardEvent): void {
    if (!event) { this.log('No Keyboard Event'); }
    // let keyCode = event.keyCode;
    // if (keyCode == 13) {    // return key
      this.updateUrlParam('filter', undefined)
    // }
    if (this.timeoutFilterID) { clearTimeout(this.timeoutFilterID); }
    this.timeoutFilterID = setTimeout(() => {
      this.getCapacity();
      this.timeoutFilterID = undefined;
    }, 500);
  }

  filterEventBU(index: number): void {
    if (index <= 0 || index >= this.dropDownBU.length) {
      this.filterBU = '';
    } else {
      this.filterBU = this.dropDownBU[index];
    }
    this.updateUrlParam('filter', undefined);
    this.getCapacity();
  }

  filterEventVPStatus(index: number): void {
    if (index <= 0 || index >= this.dropDownVPStatus.length) {
      this.filterVPStatusIndex = 0;
    } else {
      this.filterVPStatusIndex = index;
    }
    this.updateUrlParam('filter', undefined);
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
    } if (type == 'filter') {
      queryParams.filter = this.filter;
      localStorage.setItem('vpfFilter', this.filter || '');
      queryParams.filterVPStatus = this.getVPStatus(false);
      localStorage.setItem('vpfFilterVPSStatus', this.getVPStatus(false) || '');
      queryParams.filterBU = this.filterBU ? this.filterBU : undefined;
      localStorage.setItem('vpfFilterBU', this.filterBU || '');
      queryParams.filterRisk = this.filterRisk > 0 ? this.filterRisk.toString() : undefined;
      localStorage.setItem('vpfFilterRisk', (this.filterRisk || 0).toString());
      queryParams.filterStrategicFit = this.filterStrategicFit > 0 ? this.filterStrategicFit.toString() : undefined;
      localStorage.setItem('vpfFilterStrategicFit', (this.filterStrategicFit || 0).toString());
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
    if (!this.visboCapacity || this.visboCapacity.length === 0) {
      this.graphDataComboChart = [];
      return;
    }

    let optformat: string;
    if (this.showUnit === 'PD') {
      optformat = "# " + this.translate.instant('ViewCapacity.lbl.pd');
    } else {
      optformat = "###,###.## " + this.translate.instant('ViewCapacity.lbl.keuro');
    }

    this.graphOptionsComboChart.title = this.translate.instant(this.refPFV ? 'ViewCapacity.titleCapaOverTimeBL' : 'ViewCapacity.titleCapaOverTime', {name: this.currentName, roleName: this.currentLeaf.name});
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('ViewCapacity.yAxisCapaOverTime');
    this.graphOptionsComboChart.vAxis.format = optformat;
    // set the colors for the Chart
    if (this.drillDown > 3) {
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
    if ((this.drillDown == 2) || (this.drillDown == 3)) {
      this.visboViewProjectCapacityDrillDown()
    } else if (this.drillDown == 1) {
      this.visboViewCapacityDrillDown()
    } else {
      this.visboViewCapacity();
    }
  }

  calcChildNode(capacity: VisboCapacity[], property = 'roleName'): string[] {
    const allNames = [];
    let uniqueNames = [];
    if (!capacity) {
      return allNames;
    }
    capacity.forEach(item => {
        allNames.push(item[property] || '');
    });
    // allNames.sort(function(a, b) { return visboCmpString(a.toString(), b.toString()); });
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

  visboViewProjectCapacityDrillDown(): void {

    const graphDataCapacity = [];
    const initialOffset = 1    // first element in the array is the parent

    this.log(`visboViewProjectCapacityDrillDown resource ${this.currentLeaf.name}`);
    this.sumCost = 0;
    this.sumBudget = 0;
    const strNoPFV = this.refPFV ? this.translate.instant('ViewCapacity.lbl.noPFV') : '';

    const drillDownCapacity: DrillDownElement[][] = [];

    // sorting the projects for capacity-chart view projects
    let sortedProjects: VisboCapacity[] = null;
    if (this.drillDown == 2) {
      sortedProjects = this.visboSortProjects(this.visboCapacityChild, "cost");
    } else {
      sortedProjects = this.visboSortProjects(this.visboCapacityChild, "businessUnit");
    }
    const childNodeList = this.calcChildNode(sortedProjects, 'name');
    const mapNodeList = this.mapChildNode(childNodeList);


    this.visboCapacity.forEach(item => {
      const currentDate = new Date(item.month);
      let capa = 0, capaIntern = 0, plan = 0;
      if (this.showUnit === 'PD') {
        plan = (item.actualCost_PT || 0) + (item.plannedCost_PT || 0);
      } else {
        plan = (item.actualCost || 0) + (item.plannedCost || 0);
      }
      if (this.refPFV) {
        if (this.showUnit === 'PD') {
          capa = (item.baselineCost_PT || 0);
        } else {
          capa = (item.baselineCost || 0);
        }
      } else {
        if (this.showUnit === 'PD') {
          capaIntern = (item.internCapa_PT || 0);
          capa = capaIntern + (item.externCapa_PT || 0);
        } else {
          capaIntern = (item.internCapa || 0);
          capa = capaIntern + (item.externCapa || 0);
        }
      }
      this.sumCost += plan;
      this.sumBudget += capa;


      const template: DrillDownElement[] = [];
      const elementDrill = new DrillDownElement();
      elementDrill.currentDate = currentDate;
      elementDrill.name = 'All';
      elementDrill.plan = plan;
      elementDrill.planTotal = plan;
      elementDrill.budget = capa;
      elementDrill.budgetIntern = capaIntern;
      template.push(elementDrill);
      childNodeList.forEach(element => {
        template.push({currentDate: currentDate, name: element, variantName: '', plan: 0, planTotal: 0, budget: 0, budgetIntern: 0, businessUnit: '', strategicFit: 0});
      });
      drillDownCapacity.push(template);
    });

    // console.log(drillDownCapacity);

    // now fill up with the Child Infos
    // this.visboCapacityChild.forEach(item => {
      sortedProjects.forEach(item => {
      const currentDate = new Date(item.month);
      const row = drillDownCapacity.find(item => item[0].currentDate.getTime() == currentDate.getTime());
      if (row) {
        const index = mapNodeList[item.name];
        if (index >= 0) {
          let plan = 0,  capa = 0, capaIntern = 0;
          if (this.showUnit === 'PD') {
            plan = (item.actualCost_PT || 0) + (item.plannedCost_PT || 0);
          } else {
            plan = (item.actualCost || 0) + (item.plannedCost || 0);
          }
          if (this.refPFV) {
            if (this.showUnit === 'PD') {
              capa = (item.baselineCost_PT || 0);
            } else {
              capa = (item.baselineCost || 0);
            }
          } else {
            if (this.showUnit === 'PD') {
              capaIntern = (item.internCapa_PT || 0);
              capa = capaIntern + (item.externCapa_PT || 0);
            } else {
              capaIntern = (item.internCapa || 0);
              capa = capaIntern + (item.externCapa || 0);
            }
          }
          row[index + 1].businessUnit = getCustomFieldString(item.vp, "_businessUnit")?.value;
          row[index + 1].strategicFit = getCustomFieldDouble(item.vp, "_strategicFit")?.value;
          row[index + 1].plan = plan;
          row[index + 1].budget = capa;
          row[index + 1].budgetIntern = capaIntern;
          row[index + 1].variantName = item.variantName;
        }
      } else {
        // this.log(`ViewCapacityDrillDown Date out of range ${currentDate.toISOString()}`);
      }
    });

    for (let index = 0; index < drillDownCapacity.length; index++) {
      const element = drillDownCapacity[index];
      const currentDate = element[0].currentDate;
      // capa Values compared against resources of organisation
      const rowMatrix = [];
      rowMatrix.push(currentDate);
      rowMatrix.push(element[0].budget || 0); // parent planned cost
      const tooltip = this.createTooltipProjectDrillDown(element[0], this.showUnit === 'PD', this.refPFV);
      rowMatrix.push(tooltip);
      if (!this.refPFV) {
        rowMatrix.push(element[0].budgetIntern || 0);
        rowMatrix.push(tooltip);
      }
      childNodeList.forEach((item, index) => {
        rowMatrix.push(element[index + initialOffset].plan);
        const currentElement = element[index + initialOffset];
        rowMatrix.push(this.createTooltipProjectDrillDown(currentElement, this.showUnit === 'PD', this.refPFV));

        // sorted according to businessUnit
        if (this.drillDown == 3) {
          rowMatrix.push(undefined)
        }
        // sorted accordint to sum of cost
        if (this.drillDown == 2) {
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
        }

      });
      graphDataCapacity.push(rowMatrix);
    }
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    if (len < 1) {
      this.log(`visboCapacity Empty`);
    }
    // this.log(`visboCapacity len ${len}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(graphDataCapacity[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      const rowMatrix = [];
      rowMatrix.push(currentDate);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      if (!this.refPFV) {
        rowMatrix.push(undefined);
        rowMatrix.push(undefined);
      }
      childNodeList.forEach(() => {
        rowMatrix.push(undefined);
        rowMatrix.push(undefined);
        rowMatrix.push(undefined);
      });
      graphDataCapacity.push(rowMatrix);
    }
    const tooltip = {type: 'string', role: 'tooltip', 'p': {'html': true}};
    const annotation = {type: 'string', role: 'annotation' };
    const rowHeader = [];
    rowHeader.push('Month');
    rowHeader.push(this.translate.instant(this.refPFV ? 'ViewCapacity.lbl.budget' : 'ViewCapacity.lbl.totalCapa'));
    rowHeader.push(tooltip);
    if (!this.refPFV) {
      rowHeader.push(this.translate.instant('ViewCapacity.lbl.internCapa'));
      rowHeader.push(tooltip);
    }
    childNodeList.forEach(item => {
      rowHeader.push(item);
      rowHeader.push(tooltip);
      rowHeader.push(annotation);
    });
    graphDataCapacity.unshift(rowHeader);

    // give the capacities colors
    let orgaColors =[];
    if (this.drillDown == 2) {
        // for cost coloring
        orgaColors = orgaColors.concat(scale('YlGn').colors(childNodeList.length + 3));
        // sorted - sum of Cost, the darkest color should be nearest to x-Axis
        orgaColors.reverse();
    } else {
        // for BU coloring
        const drillDownElementSorted = drillDownCapacity.length> 0 && drillDownCapacity[0];
        const buDefs = [];
        for ( let j = 0; j < this.customize?.value?.businessUnitDefinitions?.length; j++) {
          buDefs[this.customize.value.businessUnitDefinitions[j].name] = this.customize.value.businessUnitDefinitions[j].color;
        }
        for (let s = 1; drillDownElementSorted && s < drillDownElementSorted.length; s++) {
          // s runs beginning as 1 because in the first element there is the sum over all projects
          const defaultColor = '#59a19e';
          const bu = drillDownElementSorted[s].businessUnit;
          const buColor = buDefs[bu];
          const rgbHex = buColor ? excelColorToRGBHex(buColor): defaultColor;
          orgaColors.push(rgbHex);
        }
    }
    if (this.refPFV) {
      orgaColors.unshift(baselineColor);
    } else {
      orgaColors.unshift(capaColor);   // color for Capa
      orgaColors.unshift(capaColor);   // color for internal capa
    }
    this.graphOptionsComboChart.colors = orgaColors;
    this.setGridline(graphDataCapacity.length);

    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  visboViewCapacityDrillDown(): void {

    const graphDataCapacity = [];
    const initialOffset = 1    // first element in the array is the parent

    this.log(`ViewCapacityDrillDown resource ${this.currentLeaf.name}`);
    this.sumCost = 0;
    this.sumBudget = 0;
    const childNodeList = this.calcChildNode(this.visboCapacityChild);
    const mapNodeList = this.mapChildNode(childNodeList);

    const drillDownCapacity: DrillDownElement[][] = [];
    this.visboCapacity.forEach(item => {
      const currentDate = new Date(item.month);
      let capa = 0, capaIntern = 0, plan = 0;
      if (this.showUnit === 'PD') {
        plan = (item.actualCost_PT || 0) + (item.plannedCost_PT || 0);
      } else {
        plan = (item.actualCost || 0) + (item.plannedCost || 0);
      }
      if (this.refPFV) {
        if (this.showUnit === 'PD') {
          capa = (item.baselineCost_PT || 0);
        } else {
          capa = (item.baselineCost || 0);
        }
      } else {
        if (this.showUnit === 'PD') {
          capaIntern = (item.internCapa_PT || 0);
          capa = capaIntern + (item.externCapa_PT || 0);
        } else {
          capaIntern = (item.internCapa || 0);
          capa = capaIntern + (item.externCapa || 0);
        }
      }
      this.sumCost += plan;
      this.sumBudget += capa;

      const template: DrillDownElement[] = [];
      const elementDrill = new DrillDownElement();
      elementDrill.currentDate = currentDate;
      elementDrill.name = this.currentLeaf.name;
      elementDrill.plan = plan;
      elementDrill.planTotal = plan;
      elementDrill.budget = capa;
      elementDrill.budgetIntern = capaIntern;
      template.push(elementDrill)
      childNodeList.forEach(element => {
        template.push({currentDate: currentDate, name: element, variantName: '', plan: 0, planTotal: undefined, budget: 0, budgetIntern: 0, businessUnit: '', strategicFit: 0});
      });
      drillDownCapacity.push(template);
    });
    // now fill up with the Child Infos
    this.visboCapacityChild.forEach(item => {
      const currentDate = new Date(item.month);
      const row = drillDownCapacity.find(item => item[0].currentDate.getTime() == currentDate.getTime());
      if (row) {
        const index = mapNodeList[item.roleName];
        if (index >= 0) {
          let plan = 0, budget = 0 , capaIntern = 0;
          if (this.showUnit === 'PD') {
            plan = (item.actualCost_PT || 0) + (item.plannedCost_PT || 0);
          } else {
            plan = (item.actualCost || 0) + (item.plannedCost || 0);
          }
          if (this.refPFV) {
            if (this.showUnit === 'PD') {
              budget = (item.baselineCost_PT || 0);
            } else {
              budget = (item.baselineCost || 0);
            }
          } else {
            if (this.showUnit === 'PD') {
              capaIntern = (item.internCapa_PT || 0);
              budget = capaIntern + (item.externCapa_PT || 0);
            } else {
              capaIntern = (item.internCapa || 0);
              budget = capaIntern + (item.externCapa || 0);
            }
          }

          row[index + 1].plan = plan;
          row[index + 1].budget = budget;
          row[index + 1].budgetIntern = capaIntern
          if (row[0].plan >= plan) {
            row[0].plan -= plan;
          } else {
            row[0].plan = 0;
          }
        }
      } else {
        // this.log(`ViewCapacityDrillDown Date out of range ${currentDate.toISOString()}`);
      }
    });

    for (let index = 0; index < drillDownCapacity.length; index++) {
      const element = drillDownCapacity[index];
      const currentDate = element[0].currentDate;
      // capa Values compared against resources of organisation
      const rowMatrix = [];
      rowMatrix.push(currentDate);
      rowMatrix.push(element[0].budget || 0);
      const tooltip = this.createTooltipOrgaDrillDown(element[0], this.showUnit === 'PD', this.refPFV);
      rowMatrix.push(tooltip);
      if (!this.refPFV) {
        rowMatrix.push(element[0].budgetIntern || 0);
        rowMatrix.push(tooltip);
      }
      rowMatrix.push(element[0].plan || 0); // parent planned cost
      rowMatrix.push(tooltip);
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
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    if (len < 1) {
      this.log(`visboCapacity Empty`);
    }
    // this.log(`visboCapacity len ${len}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(graphDataCapacity[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      const rowMatrix = [];
      rowMatrix.push(currentDate);
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      if (!this.refPFV) {
        rowMatrix.push(undefined);
        rowMatrix.push(undefined);
      }
      rowMatrix.push(undefined);
      rowMatrix.push(undefined);
      childNodeList.forEach(() => {
        rowMatrix.push(undefined);
        rowMatrix.push(undefined);
        rowMatrix.push(undefined);
      });
      graphDataCapacity.push(rowMatrix);
    }
    const tooltip = {type: 'string', role: 'tooltip', 'p': {'html': true}};
    const annotation = {type: 'string', role: 'annotation' };
    const rowHeader = [];
    rowHeader.push('Month');
    rowHeader.push(this.translate.instant(this.refPFV ? 'ViewCapacity.lbl.budget' : 'ViewCapacity.lbl.totalCapa'));
    rowHeader.push(tooltip);
    if (!this.refPFV) {
      rowHeader.push(this.translate.instant('ViewCapacity.lbl.internCapa'));
      rowHeader.push(tooltip);
    }
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
    if (this.refPFV) {
      // color for baseline
      orgaColors.unshift(baselineColor);
    } else {
      // color for capa intern & total
      orgaColors.unshift(capaColor);
      orgaColors.unshift(capaColor);
    }
    this.graphOptionsComboChart.colors = orgaColors;
    this.setGridline(graphDataCapacity.length);

    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  visboViewCapacity(): void {
    const graphDataCapacity = [];
    const capacity = this.visboCapacity;
    if (capacity.length > 0 ) {
      this.capacityFrom =  new Date(capacity[0].month);
      this.capacityTo = new Date(capacity[capacity.length-1].month);
    }

    this.sumCost = 0;
    this.sumBudget = 0;

    for (let i = 0; i < capacity.length; i++) {
      const currentDate = new Date(capacity[i].month);
      const roleID = this.currentLeaf.uid;
      if (this.refPFV) {
        // capa Values compared against baseline Values
        if (this.showUnit === 'PD') {
          const budget = Math.round(capacity[i].baselineCost_PT * 10) / 10 || 0;
          const actualCost = Math.round(capacity[i].actualCost_PT * 10) / 10 || 0;
          const plannedCost = Math.round(capacity[i].plannedCost_PT * 10) / 10 || 0;
          const otherActiviyCost = Math.round(capacity[i].otherActivityCost_PT * 10) / 10 || 0;
          this.sumCost += actualCost + plannedCost + otherActiviyCost;
          this.sumBudget += budget;
          const tooltip = this.createTooltipPlanActual(capacity[i], true, this.refPFV);
          graphDataCapacity.push([
            currentDate,
            capacity[i].roleID == roleID ? budget : undefined,
            capacity[i].roleID == roleID ? tooltip : undefined,
            actualCost,
            tooltip,
            plannedCost,
            tooltip,
            otherActiviyCost,
            tooltip
          ]);
        } else {
          const budget = Math.round((capacity[i].baselineCost * 10) / 10 || 0);
          const actualCost = Math.round((capacity[i].actualCost * 10) / 10 || 0);
          const plannedCost = Math.round((capacity[i].plannedCost * 10) / 10 || 0);
          const otherActiviyCost = Math.round(capacity[i].otherActivityCost * 10) / 10 || 0;
          this.sumCost += actualCost + plannedCost + otherActiviyCost;
          this.sumBudget += budget;
          const tooltip = this.createTooltipPlanActual(capacity[i], false, this.refPFV);
          graphDataCapacity.push([
            currentDate,
            capacity[i].roleID == roleID ? budget : undefined,
            capacity[i].roleID == roleID ? tooltip : undefined,
            actualCost,
            tooltip,
            plannedCost,
            tooltip,
            otherActiviyCost,
            tooltip
          ]);
        }
      } else {
        // capa Values compared against resources of organisation
        if (this.showUnit === 'PD') {
          const budgetIntern = Math.round(capacity[i].internCapa_PT * 10) / 10 || 0;
          const budgetExtern = Math.round(capacity[i].externCapa_PT * 10) / 10 || 0;
          const actualCost = Math.round(capacity[i].actualCost_PT * 10) / 10 || 0;
          const plannedCost = Math.round(capacity[i].plannedCost_PT * 10) / 10 || 0;
          const otherActiviyCost = Math.round(capacity[i].otherActivityCost_PT * 10) / 10 || 0;
          this.sumCost += actualCost + plannedCost;
          this.sumBudget += budgetIntern + budgetExtern;
          const tooltip = this.createTooltipPlanActual(capacity[i], true);
          graphDataCapacity.push([
            currentDate,
            capacity[i].roleID == roleID ? (budgetIntern + budgetExtern) : undefined,
            capacity[i].roleID == roleID ? tooltip : undefined,
            capacity[i].roleID == roleID ? budgetIntern : undefined,
            capacity[i].roleID == roleID ? tooltip : undefined,
            actualCost,
            tooltip,
            plannedCost,
            tooltip,
            otherActiviyCost,
            tooltip
          ]);
        } else {
          const budgetIntern = Math.round((capacity[i].internCapa * 10) / 10 || 0);
          const budgetExtern = Math.round((capacity[i].externCapa * 10) / 10 || 0);
          const actualCost = Math.round((capacity[i].actualCost * 10) / 10 || 0);
          const plannedCost = Math.round((capacity[i].plannedCost * 10) / 10 || 0);
          const otherActiviyCost = Math.round(capacity[i].otherActivityCost * 10) / 10 || 0;
          this.sumCost += actualCost + plannedCost;
          this.sumBudget += budgetIntern + budgetExtern;
          const tooltip = this.createTooltipPlanActual(capacity[i], false);
          graphDataCapacity.push([
            currentDate,
            capacity[i].roleID == roleID ? (budgetIntern + budgetExtern) : undefined,
            capacity[i].roleID == roleID ? tooltip : undefined,
            capacity[i].roleID == roleID ? budgetIntern : undefined,
            capacity[i].roleID == roleID ? tooltip : undefined,
            actualCost,
            tooltip,
            plannedCost,
            tooltip,
            otherActiviyCost,
            tooltip
          ]);
        }
      }
    }
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCapacity.length;
    if (len < 1) {
      this.log(`visboCapacity Empty`);
    }
    // this.log(`visboCapacity len ${len}`);
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(graphDataCapacity[0][0]);
      currentDate.setMonth(currentDate.getMonth()+1);
      if (this.refPFV) {
        graphDataCapacity.push([
          currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
        ]);
      } else {
        graphDataCapacity.push([
          currentDate, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
        ]);
      }

    }
    // set number of gridlines to a fixed count to avoid in between gridlines
    this.setGridline(graphDataCapacity.length);
    if (this.refPFV) {
      graphDataCapacity.unshift([
        'Month',
        this.translate.instant('ViewCapacity.lbl.budget'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.actualCost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.cost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.otherActivityCost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}}
      ]);
    } else {
      graphDataCapacity.unshift([
        'Month',
        this.translate.instant('ViewCapacity.lbl.totalCapa'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.internCapa'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.actualCost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.cost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}},
        this.translate.instant('ViewCapacity.lbl.otherActivityCost'),
        {type: 'string', role: 'tooltip', 'p': {'html': true}}
      ]);
    }

    // graphDataCapacity.reverse();
    // this.log(`view Capacity VP Capacity budget  ${JSON.stringify(graphDataCost)}`);
    this.setGridline(graphDataCapacity.length);
    this.graphDataComboChart = graphDataCapacity;
    this.chartActive = new Date();
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
    if (this.graphDataComboChart && row < this.graphDataComboChart.length) {
      if (this.drillDown == 2 || this.drillDown == 3) {
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
    const element = this.visboCapacityChild.find(item => item.name == vpName);
    if (element) {
      const queryParams = new VPParams();
      if (element.variantName) {
        queryParams.variantName = element.variantName;
      }
      if (this.refDate && !visboIsToday(this.refDate)) {
        queryParams.refDate = this.refDate.toISOString();
      }
      queryParams.unit = this.showUnit === 'PD' ? '1' : '0';
      if (this.roleID) {
        queryParams.roleID = this.roleID;
      }
      if (this.capacityFrom) {
        queryParams.from = this.capacityFrom.toISOString();
      }
      if (this.capacityTo) {
        queryParams.to = this.capacityTo.toISOString();
      }
      if (this.refDate) {
        queryParams.refDate = this.refDate.toISOString();
      }
      queryParams.view = 'Capacity';
      queryParams.drillDown = '1';
      this.log(`Goto vpid ${element.vpid} QueryParams ${JSON.stringify(queryParams)}`)

      this.router.navigate(['vpKeyMetrics/'.concat(element.vpid)], {
        queryParams: queryParams
      });
    } else {
      this.log(`Project ${vpName} not found`)
    }
  }

  createTooltipPlanActual(capacity: VisboCapacity, PT: boolean, refPFV = false): string {
    const currentDate = convertDate(new Date(capacity.month), 'fullMonthYear', this.currentLang);
    //const currentDate = convertDate(new Date(capacity.month), 'fullDate', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:250px;">' +
      '<div><b>' + currentDate + '</b></div>';

    const strTotalCapa = this.translate.instant('ViewCapacity.lbl.totalCapa');
    const strInternCapa = this.translate.instant('ViewCapacity.lbl.internCapa');
    const strActualCost = this.translate.instant('ViewCapacity.lbl.actualCost');
    const strCost = this.translate.instant('ViewCapacity.lbl.cost');
    const strOtherActivity = this.translate.instant('ViewCapacity.lbl.otherActivityCost')
    const roleName = this.translate.instant('ViewCapacity.lbl.roleName');
    const strBudget = this.translate.instant('ViewCapacity.lbl.budget');
    const strDiffCost = this.translate.instant('ViewCapacity.lbl.diffCost');

    let totalCapa: number, internCapa: number, actualCost: number, plannedCost: number, otherActivityCost: number;
    const unit = ' ' + this.translate.instant(PT ? 'ViewCapacity.lbl.pd' : 'ViewCapacity.lbl.keuro');

    if (PT) {
      actualCost = capacity.actualCost_PT || 0;
      plannedCost = capacity.plannedCost_PT || 0;
      otherActivityCost = capacity.otherActivityCost_PT || 0;
    } else {
      actualCost = capacity.actualCost || 0;
      plannedCost = capacity.plannedCost || 0;
      otherActivityCost = capacity.otherActivityCost || 0;
    }

    if (refPFV) {
      if (PT) {
        totalCapa = capacity.baselineCost_PT || 0;
      } else {
        totalCapa = capacity.baselineCost || 0;
      }
    } else {
      if (PT) {
        internCapa = capacity.internCapa_PT || 0;
        totalCapa = ((capacity.internCapa_PT || 0) + (capacity.externCapa_PT || 0));

      } else {
        internCapa = capacity.internCapa || 0;
        totalCapa = ((capacity.internCapa || 0) + (capacity.externCapa || 0));
      }
    }
    result = result + this.addTooltipRowString(roleName + ':', capacity.roleName, false);
    result = result + this.addTooltipRowNumber(refPFV ? strBudget : strTotalCapa, totalCapa, 1, unit, false);
    if (!refPFV) {
      result = result + this.addTooltipRowNumber(strInternCapa, internCapa, 1, unit, false);
    }
    if (actualCost !== 0) {
      result = result + this.addTooltipRowNumber(strActualCost, actualCost, 1, unit, false);
    }
    result = result + this.addTooltipRowNumber(strCost, plannedCost, 1, unit, false);

    if (otherActivityCost !== 0) {
    result = result + this.addTooltipRowNumber(strOtherActivity, otherActivityCost, 1, unit, false);
    }
    let diff: number;
    if (!refPFV) {
      diff = actualCost + plannedCost  + otherActivityCost - totalCapa;
    } else {
      diff = actualCost + plannedCost - totalCapa;
    }
    if (diff != 0) {
      result = result + this.addTooltipRowNumber(strDiffCost, diff, 1, unit, true);
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

    const name = this.translate.instant('ViewCapacity.lbl.project');
    let unit: string, strBudgetCost: string, strInternCapa: string;

    const strFractionCost = this.translate.instant('ViewCapacity.lbl.fractionCost');
    const strCost = this.translate.instant('ViewCapacity.lbl.cost');
    if (PT) {
      unit = ' ' + this.translate.instant('ViewCapacity.lbl.pd');
    } else {
      unit = ' ' + this.translate.instant('ViewCapacity.lbl.keuro');
    }
    if (refPFV) {
      strBudgetCost = this.translate.instant('ViewCapacity.lbl.budget');
    } else {
      strBudgetCost = this.translate.instant('ViewCapacity.lbl.totalCapa');
      strInternCapa = this.translate.instant('ViewCapacity.lbl.internCapa');
    }

    let vpName = item.name;
    if (item.variantName) {
      vpName = vpName.concat(' (', item.variantName,')')
    }
    result = result + this.addTooltipRowString(name, vpName, false);
    const plan = item.planTotal > 0 ? item.planTotal : item.plan;
    if (refPFV) {
      result = result + this.addTooltipRowNumber(strBudgetCost, item.budget, 1, unit, false);
    } else {
      result = result + this.addTooltipRowNumber(strBudgetCost, item.budget, 1, unit, false);
      result = result + this.addTooltipRowNumber(strInternCapa, item.budgetIntern, 1, unit, false);
    }
    result = result + this.addTooltipRowNumber(strCost, plan, 1, unit, false);

    const diff = this.calcLoadDiff(item, false);
    if (diff) {
      const diffPercent = '' + Math.round(this.calcLoadDiff(item, true) * 100) + ' %';
      if (diffPercent !== undefined) {
        result = result + this.addTooltipRowString(strFractionCost, diffPercent, true);
      } else {
        result = result + this.addTooltipRowString(strFractionCost, 'Unknown', false);
      }
    }
    if ((this.drillDown == 3) && (vpName != "All")) {
      result = result + this.addTooltipRowString("BusinessUnit", item.businessUnit, false);
      result = result + this.addTooltipRowNumber("StrategicFit", item.strategicFit, 0, '', false);
    }

    result = result + '</div>';
    return result;
  }

  createTooltipOrgaDrillDown(item: DrillDownElement, PT: boolean, refPFV = false): string {
    const current = convertDate(item.currentDate, 'fullMonthYear', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:250px;">' +
      '<div><b>' + current + '</b></div>';

    const roleName = this.translate.instant('ViewCapacity.lbl.roleName');
    let unit: string, strBudgetCost: string, strInternCapa: string;

    const strDiffCost = this.translate.instant('ViewCapacity.lbl.diffCost');
    const strCost = this.translate.instant('ViewCapacity.lbl.cost');
    if (PT) {
      unit = ' ' + this.translate.instant('ViewCapacity.lbl.pd');
    } else {
      unit = ' ' + this.translate.instant('ViewCapacity.lbl.keuro');
    }
    if (refPFV) {
      strBudgetCost = this.translate.instant('ViewCapacity.lbl.budget');
    } else {
      strBudgetCost = this.translate.instant('ViewCapacity.lbl.totalCapa');
      strInternCapa = this.translate.instant('ViewCapacity.lbl.internCapa');
    }

    result = result + this.addTooltipRowString(roleName, item.name, false);
    const plan = item.planTotal > 0 ? item.planTotal : item.plan;
    if (refPFV) {
      result = result + this.addTooltipRowNumber(strBudgetCost, item.budget, 1, unit, false);
    } else {
      result = result + this.addTooltipRowNumber(strBudgetCost, item.budget, 1, unit, false);
      result = result + this.addTooltipRowNumber(strInternCapa, item.budgetIntern, 1, unit, false);
    }
    result = result + this.addTooltipRowNumber(strCost, plan, 1, unit, false);

    const diff = this.calcLoadDiff(item, false);
    if (diff != 0) {
      result = result + this.addTooltipRowNumber(strDiffCost, diff, 1, unit, true);
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

  visboSortProjects(capacity:VisboCapacity[], criterion: "cost" | "businessUnit"): VisboCapacity[] {
    switch(criterion) {
      case "cost":
        return this.sortProjectsByCost(capacity);
      case "businessUnit":
        return this.sortProjectsByBusinessUnit(capacity);
    }
    return capacity;
  }

  sortProjectsByCost(capacity:VisboCapacity[]): VisboCapacity[] {
    // ------- SORT by sum value -------
    const groupKey = (value: VisboCapacity) => value.vpid;
    const sumValue = (value: VisboCapacity) => value.plannedCost_PT + value.actualCost_PT;
    const capacityChildGroupedByProject = capacity.reduce((accumulator, elem) => {
      const key = groupKey(elem);
      if (!accumulator.has(key)) {
        accumulator.set(key, {sum: 0, vpid: key});
      }
      accumulator.get(key).sum += sumValue(elem);
      return accumulator;
    }, new Map<string, {sum: number, vpid: string}>());

    // generate an indexed array based on vpid
    const sumCapacityProject = [];
    capacityChildGroupedByProject.forEach(item => sumCapacityProject[item.vpid] = item.sum);

    capacity.sort((a, z) => (sumCapacityProject[z.vpid] || 0) - (sumCapacityProject[a.vpid] || 0));
    return capacity;
    // ------ SORT END ------
  }

  sortProjectsByBusinessUnit(capacity: VisboCapacity[]): VisboCapacity[] {
    const listVPProperties = this.listVPProperties;
    capacity.sort((a, z) => {
      // sorts the businessUnit alphanumerical ascending
      const aBU = listVPProperties[a.vpid]?._bu || "zzzzzz";
      const zBU = listVPProperties[z.vpid]?._bu || "zzzzzz";
      if(aBU < zBU) { return -1; }
      if(aBU > zBU) { return 1; }
      // sorts the strategicFit descending
      const aStrategicFit = listVPProperties[a.vpid]?._strategicFit || -1;
      const zStrategicFit = listVPProperties[z.vpid]?._strategicFit || -1;
      if(aStrategicFit != zStrategicFit) { return zStrategicFit - aStrategicFit; }
      return 0
    })
    return capacity;
  }

  visboRoundToString(value: number, fraction = 1): string {
    const result = value || 0;
    return result.toLocaleString(this.currentLang, {minimumFractionDigits: fraction, maximumFractionDigits: fraction})
  }

  displayCapacity(): number {
    let result = -1;
    if (this.drillDown != 2 && this.vcOrganisation && this.visboCapacity) {     // Orga && Capacity data available
      result = this.visboCapacity.length;
    } else if (this.drillDown == 2  && this.vcOrganisation && this.visboCapacityChild){
      result = this.visboCapacityChild.length;
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
    if ((leaf.name !== this.currentLeaf.name)
      || (leaf.parent && this.currentLeaf.parent && (leaf.parent.uid !== this.currentLeaf.parent.uid))) {
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
    this.log(`Export Data to Excel ${this.visboCapacity?.length} ${this.visboCapacityChild?.length}`);
    // convert list to matix

    const excel: VisboCapacity[] = [];

    let name = '';
    let urlWeb = ''
    const listURL: string[] = [];
    const tooltip = this.translate.instant('ViewCapacity.msg.viewWeb');
    if (this.vpfActive) {
      name = this.vpfActive.name
      urlWeb = window.location.origin.concat('/vpf/', this.vpfActive.vpid, '?view=Capacity');
    } else if (this.vpActive) {
      name = this.vpActive.name;
      urlWeb = window.location.origin.concat('/vpKeyMetrics/', this.vpActive._id, '?view=Capacity');
    } else if (this.vcActive) {
      name = this.vcActive.name;
      urlWeb = window.location.origin.concat('/vp/', this.vcActive._id, '?view=KeyMetrics&viewCockpit=Capacity');
    }
    if (this.visboCapacity) {
      this.visboCapacity.forEach(element => {
        excel.push(this.copyCapacity(element, name));
        listURL.push(urlWeb);
      });
    }
    if (this.visboCapacityChild) {
      this.visboCapacityChild.forEach(element => {
        let urlWebDetail = urlWeb;
        if (element.name) {
          urlWebDetail = window.location.origin.concat('/vpKeyMetrics/', element.vpid, '?view=Capacity');
        }
        excel.push(this.copyCapacity(element, element.name || name));
        listURL.push(urlWebDetail);
      });
    }

    const len = excel.length;
    const width = Object.keys(excel[0]).length;
    this.log(`Export Data to Excel ${excel.length}`);
    // Add Localised header to excel
    // eslint-disable-next-line
    const header: any = {};
    let colName: number, colIndex = 0;
    for (const element in excel[0]) {
      // this.log(`Processing Header ${element}`);
      if (element == 'name') {
        colName = colIndex;
      }
      colIndex++;
      header[element] = this.translate.instant('ViewCapacity.lbl.'.concat(element))
    }
    excel.unshift(header);
    // this.log(`Header for Excel: ${JSON.stringify(header)}`)

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
    for (let index = 1; index <= len; index++) {
      const address = XLSX.utils.encode_cell({r: index, c: colName});
      const url = listURL[index - 1];
      worksheet[address].l = { Target: url, Tooltip: tooltip };
    }
    const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
    worksheet['!autofilter'] = { ref: matrix };
    // eslint-disable-next-line
    const sheets: any = {};
    const sheetName = visboGetShortText(name, 30);
    sheets[sheetName] = worksheet;
    const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [sheetName] };
    // eslint-disable-next-line
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const actDate = new Date();
    const fileName = ''.concat(
      actDate.getFullYear().toString(),
      '_',
      (actDate.getMonth() + 1).toString().padStart(2, "0"),
      '_',
      actDate.getDate().toString().padStart(2, "0"),
      '_Capacity ',
      (name || '')
    );

    const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName.concat(EXCEL_EXTENSION);
    this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getVPStatus(local: boolean, original: string = undefined): string {
    if (!this.dropDownVPStatus) {
      return undefined;
    }
    let result = this.dropDownVPStatus[0];
    if (original) {
      result = this.dropDownVPStatus.find(item => item.name == original) || result;
    } else if (this.dropDownVPStatus && this.filterVPStatusIndex >= 0 && this.filterVPStatusIndex < this.dropDownVPStatus.length) {
      result = this.dropDownVPStatus[this.filterVPStatusIndex];
    }
    if (local) {
      return result.localName;
    } else {
      return result.name;
    }
  }

  setGridline(count: number): void {
    if (count > 0 && count <= 18) {
        // only majorGridlines
        this.graphOptionsComboChart.hAxis.gridlines.count = count;
        this.graphOptionsComboChart.hAxis.minorGridlines = {count: 0, color: 'none'};
    } else {
        // only majorGridlines
        this.graphOptionsComboChart.hAxis.gridlines.count = -1;
        this.graphOptionsComboChart.hAxis.minorGridlines = {count: count, color: '#FFF'};
    }
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
    // console.log('CompVisboViewCapcity: ' + message);
  }

}
