import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';

import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboUser } from '../_models/visbouser';
import { VisboProject, VPVariant, getCustomFieldDouble, getCustomFieldString, constSystemVPStatus } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFItem, VPFParams } from '../_models/visboportfolio';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';
import { VisboCenterService } from '../_services/visbocenter.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboIsToday, visboIsSameDay, visboGetBeginOfDay, convertDate, getPreView } from '../_helpers/visbo.helper';
import { VisboSetting, VisboOrganisation } from '../_models/visbosetting';

import {TimeLineOptions} from '../_models/_chart'

class DropDown {
  name: string;
  version?: number;
  variantName: string;
  description?: string;
  longDescription?: string;
  timestamp?: Date;
  email?: string;
}

class vpCheckItem {
  isChecked: boolean;
  variantName: string;
  description?: string;
  hasVariants: boolean;
  vp: VisboProject;
}

class DropDownStatus {
  name: string;
  localName: string;
}

@Component({
  selector: 'app-visboportfolio',
  templateUrl: './visboportfolio.component.html',
  styleUrls: ['./visboportfolio.component.css']
})
export class VisboPortfolioVersionsComponent implements OnInit, OnChanges {

    listVPF: VisboPortfolioVersion[];
    listVPV: VisboProjectVersion[];
    listVP: VisboProject[];
    vpvCount: number;

    listVPFVariant: DropDown[] = [];
    activeVPFVariant: DropDown;
    newVPFVariant: DropDown;

    views = ['KeyMetrics', 'KeyMetric', 'Capacity', 'ProjectBoard', 'List'];

    user: VisboUser;
    vpSelected: string;
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    vpvRefDateStr: string;
    vpfid: string;
    deleted = false;
    timeoutID: number;
    initEnvironment = true;

    defaultVariant: string;
    currentLang: string;
    listCalcVPV: VisboProjectVersion[];
    switchVariantCount: number;
    switchVariant: string;
    newVariant: VPVariant;

    vpCheckListAll: vpCheckItem[] = [];
    vpCheckListFiltered: vpCheckItem[] = [];
    vpFilterIndex: number;
    vpfListFilter: string;
    filterVPStatusIndex: number;
    filterStrategicFit: number;
    filterRisk: number;
    dropDownVPStatus: DropDownStatus[];
    filterBU: string;
    dropDownBU: string[];

    hasOrga = false;
    vcOrga: VisboOrganisation[];
    customize: VisboSetting;
    calcPredict = false;

    pageParams = new VPFParams();
    isGlobalChecked = false;
    vcUser = new Map<string, VisboUser>();

    parentThis = this;

    viewVersions = false;
    viewAllVariants = false;
    graphDataTimeline = [];
    graphOptionsTimeline: TimeLineOptions;
    defaultOptionsTimeline: TimeLineOptions = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        height: 150,
        // colors:[],
        tooltip: {
          trigger: 'focus',
          isHtml: true
        },
        hAxis: {
          format: 'dd.MM',
          gridlines: {
            color: '#FFF',
            count: -1
          }
        },
        timeline: {
          showBarLabels: false
        }
        // animation: {startup: true, duration: 200}
      };

    sortAscending: boolean;
    sortColumn: number;

    combinedPerm: VGPermission = undefined;
    permVC = VGPVC;
    permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private router: Router,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.newVariant = new VPVariant();
    this.user = this.authenticationService.getActiveUser();
    this.titleService.setTitle(this.translate.instant('vpfVersion.title'));
    this.defaultVariant = this.translate.instant('vpfVersion.lbl.defaultVariant');
    // const filterVPStatus = this.route.snapshot.queryParams['filterVPStatus'] || '';
    // const filterVPStatusIndex = constSystemVPStatus.findIndex(item => item == filterVPStatus);
    // this.filterVPStatusIndex = filterVPStatusIndex >= 0 ? filterVPStatusIndex + 1 : 0;
    // this.filterBU = this.route.snapshot.queryParams['filterBU'] || undefined;
    this.log(`Init VPF with Transaltion: ${this.translate.instant('vpfVersion.title')}`);

    localStorage.removeItem('vpfFilter');
    const refDate = this.route.snapshot.queryParams['refDate'];
    this.calcPredict = this.route.snapshot.queryParams['calcPredict'] ? true : false;
    const nextView = this.route.snapshot.queryParams['view'] || 'KeyMetrics';
    this.vpfid = this.route.snapshot.queryParams['vpfid'] || undefined;
    // const filter = this.route.snapshot.queryParams['filter'] || null;
    this.vpvRefDate = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.setRefDateStr(this.vpvRefDate);
    this.changeView(nextView, refDate ? this.vpvRefDate : undefined, undefined, this.vpfid, false);
    this.initVPStateDropDown();
    const id = this.route.snapshot.paramMap.get('id');
    this.getVisboProject(id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Portfolio Changes ${JSON.stringify(changes)}`);
  }

  onResized(event: ResizedEvent): void {
    this.log('Resize');
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.viewVPFOverTime();
      this.timeoutID = undefined;
    }, 500);
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

  getVPManager(vp: VisboProject, withEmail = true): string {
    let fullName = '';
    if (vp.managerId) {
      const user = this.vcUser.get(vp.managerId);
      if (user) {
        if (user.profile) {
          fullName = user.profile.firstName.concat(' ', user.profile.lastName)
        }
        if (!fullName || withEmail) {
          fullName = fullName.concat(' (', user.email, ')');
        }
      }
    }
    return fullName || '';
  }

  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm?.vp & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    let result = false;
    if ((this.combinedPerm?.vc & perm) > 0) {
      result = true;
    }
    return result;
  }

  getVisboProject(id): void {
    this.vpSelected = id;
    this.log(`get VP name if ID is used ${id}`);
    this.visboprojectService.getVisboProject(id)
      .subscribe(
        visboproject => {
          this.vpActive = visboproject;
          this.deleted = visboproject.deletedAt ? true : false;
          this.combinedPerm = visboproject.perm;
          this.titleService.setTitle(this.translate.instant('vpfVersion.titleName', {name: visboproject.name}));
          this.initProjectList(this.vpActive);
          this.variantListInit();
          this.getVisboPortfolioVersions();
          if (this.initEnvironment) {
            this.getVisboCenterUsers();
            this.getVisboCenterOrga();
            this.getVisboCenterCustomization();
            this.initEnvironment = false;
          }
        },
        error => {
          this.log(`get Portfolio VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVP');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
      });
  }

  getVisboCenterUsers(): void {
    this.log(`VisboCenter UserList of: ${this.vpActive?.vcid} Deleted ${this.deleted}`);
    if (!this.vpActive?.vcid) { return; }
    this.visbocenterService.getVCUser(this.vpActive.vcid, false, this.deleted)
      .subscribe(
        user => {
          user.forEach(user => this.vcUser.set(user._id, user));
          this.updateVPManager();
          this.log(`fetched Users ${this.vcUser.size}`);
        },
        error => {
          this.log(`Get VC Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  updateVPManager(): void {
    if (!this.listVP || !this.vcUser) {
      return;
    }
    this.listVP.forEach(vp => {
      vp.manager = this.vcUser.get(vp.managerId);
      vp.vpStatusLocale = this.translate.instant('vpStatus.' + (vp.vpStatus || 'initialized'))
    });

    this.vpActive.manager = this.vcUser.get(this.vpActive.managerId);
  }

  initProjectList(vp: VisboProject): void {
    this.vpfListFilter = undefined;
    if (!vp && !vp.vcid) {
      this.log("No Portfolio found");
      return;
    }
    this.visboprojectService.getVisboProjects(vp.vcid, false, false)
      .subscribe(
        visboprojects => {
          this.listVP = visboprojects;
          this.updateVPManager();
          this.initVPF();
        },
        error => {
          this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getVisboCenterOrga(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      if (this.vcOrga == undefined || this.vcOrga.length > 0) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vpActive.vcid}`);
        this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, (new Date()).toISOString(), false, false)
          .subscribe(
            organisation => {
              this.vcOrga = organisation;
              this.hasOrga = organisation.length > 0 && organisation[0] != null;
            },
            error => {
              if (error.status === 403) {
                const message = this.translate.instant('vpfVersion.msg.errorPermVP');
                this.alertService.error(message);
              } else {
                this.alertService.error(getErrorMessage(error));
              }
          });
      }
    }
  }

  getVisboPortfolioVersions(): void {
    this.log(`get Portfolio Versions ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
    this.visboprojectversionService.getVisboPortfolioVersions(this.vpActive._id, this.deleted)
      .subscribe(
        listVPF => {
          this.listVPF = listVPF;
          let index = 0;
          if (this.vpfid ) {
            index = listVPF.findIndex(item => item._id.toString() === this.vpfid);
            if (index < 0) { index = 0; }
          }
          if (listVPF.length > 0) {
            this.vpfActive = listVPF[index];
            this.switchVariantByName(this.vpfActive.variantName);
            this.viewVPFOverTime();
            this.getVisboPortfolioKeyMetrics();
            this.log(`get VPF Length ${this.listVPF.length}`);
          } else if (this.hasVPPerm(this.permVP.Modify)) {
            // initiate the edit if user has permission
            document.getElementById("editVPFList").click();
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVersion', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  viewVPFOverTime(): void {
    let list = this.listVPF?.filter(vpv => vpv.variantName != 'pfv');
    if (!this.viewAllVariants && this.vpfActive) {
      list = list?.filter(vpv => vpv.variantName == this.vpfActive.variantName);
    }
    if (!list) return;
    list.sort(function(a, b) {
      let result = visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase());
      if (!result) {
        result = visboCmpDate(a.timestamp, b.timestamp)
      }
      return result;
    });
    this.graphDataTimeline = [];
    const graphDataTimeline = [];
    if (!(list?.length > 0)) return;

    // process all except the last one
    let index = 0;
    let validUntil: Date, ts:Date;
    for (; index < list.length - 1; index++) {
      ts = new Date(list[index].timestamp);
      if (list[index].variantName != list[index+1].variantName) {
        validUntil = new Date();
        validUntil = visboGetBeginOfDay(validUntil, 1); // to make it visible it goes 1 day into future
      } else {
        // if (visboIsSameDay(new Date(list[index].timestamp), new Date(list[index + 1].timestamp))) {
        //   // skip multiple versions for same day and variant
        //   continue
        // }
        validUntil = new Date(list[index + 1].timestamp);
        const diffHours = (validUntil.getTime() - ts.getTime()) / 1000 / 60 / 60;
        if (diffHours > 48) {
          validUntil.setHours(validUntil.getHours() - 24);
        } else if (diffHours > 12) {
          validUntil.setHours(validUntil.getHours() - 6);
        } else if (diffHours > 2) {
          validUntil.setHours(validUntil.getHours() - 1);
        }
      }
      graphDataTimeline.push([
        list[index].variantName || this.defaultVariant,
        list[index].variantName,
        this.createCustomHTMLContent(list[index]),
        ts,
        validUntil
      ]);
    }
    validUntil = visboGetBeginOfDay(new Date(), 1); // to make it visible it goes 1 day into future
    graphDataTimeline.push([
      list[index].variantName || this.defaultVariant,
      list[index].variantName,
      this.createCustomHTMLContent(list[index]),
      new Date(list[index].timestamp),
      validUntil
    ]);
    graphDataTimeline.unshift([
      'variantName',
      'version',
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      'timestamp',
      'validUntil'
    ]);
    this.graphDataTimeline = graphDataTimeline;

    let rows = 1
    if (this.viewAllVariants) {
      const list = this.vpActive?.variant?.filter(variant => (variant.variantName != 'pfv' && variant.vpfCount > 0));
      rows += list.length;
    }
    this.graphOptionsTimeline = Object.assign({}, this.defaultOptionsTimeline);
    this.graphOptionsTimeline.height = 60 + 40 * rows;
  }

  createCustomHTMLContent(vpf: VisboPortfolioVersion): string {
    const strTimestamp = this.translate.instant('vpfVersion.lbl.timestamp');
    const ts = new Date(vpf.timestamp);
    const tsDate = convertDate(ts, 'fullDate', this.currentLang);
    const tsTime = ts.toLocaleTimeString();

    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + (vpf.variantName || this.defaultVariant)  + '</b></div>' + '<div>' +
      '<table>';

    result = result + '<tr>' + '<td>' + strTimestamp + ':</td>'
                    + '<td align="right"><b>' + tsDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td></td>'
                    + '<td align="right"><b>' + tsTime + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  timelineSelectRow(row: number): void {
    // this.log(`timeline Select Row ${row} ${JSON.stringify(this.graphDataTimeline[row + 1])} `);
    let variantName = '';
    const item = this.graphDataTimeline[row + 1];
    if (item[0] != this.defaultVariant) {
      variantName = item[0];
    }

    const ts = new Date(item[3]);
    this.log(`timeline Goto ${variantName} ${ts}`);
    this.switchPFVersion(variantName, ts);
  }

  getVisboPortfolioKeyMetrics(): void {
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate, false, this.calcPredict, this.vpActive.vcid)
      .subscribe(
        listVPV => {
          this.listVPV = listVPV;
          this.calcVPVList();
          this.initFilter(this.listVPV);
          this.log(`get VPF Key metrics: Get ${listVPV.length} Project Versions`);
          if (listVPV.length > 0) {
            this.log(`First VPV: ${listVPV[0]._id} ${listVPV[0].timestamp} ${listVPV[0].keyMetrics?.endDateCurrent} `);
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVP');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  changeRefDate(): void {
    this.log(`changeRefDate ${this.vpvRefDateStr} ${this.vpvRefDate.toISOString()}`);
    this.vpvRefDate = new Date(this.vpvRefDateStr);
    this.changeView(undefined, this.vpvRefDate);
    this.getVisboPortfolioKeyMetrics();

  }

  getVisboCenterCustomization(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      // check if appearance is available
      this.log(`get VC Setting Customization ${this.vpActive.vcid}`);
      this.visbosettingService.getVCSettingByName(this.vpActive.vcid, 'customization')
        .subscribe(
          vcsettings => {
            if (vcsettings.length > 0) {
              this.customize = vcsettings[0];
              this.initBUDropDown();
            }
          },
          error => {
            if (error.status === 403) {
              const message = this.translate.instant('vpfVersion.msg.errorPermVP');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }

  initVPF(): void {
    this.switchVariantByName(this.vpfActive?.variantName || '');
    this.initFilter(this.listVPV);
    this.isGlobalChecked = false;
    this.vpCheckListAll = [];
    this.listVP?.forEach(item => {
      if (item.vpType == 0) {
        const entry = new vpCheckItem();
        const vpfMember = this.getVPFMember(item);
        if (vpfMember) {
          entry.isChecked = true;
          entry.variantName = vpfMember.variantName;
          if (entry.variantName) {
            entry.description = item.variant.find(element => element.variantName == entry.variantName).description;
          }
        } else {
          entry.isChecked = false;
          entry.variantName = '';
        }
        entry.vp = item;
        if (this.getVariants(item).length > 0) {
          entry.hasVariants = true;
        }
        this.vpCheckListAll.push(entry);
      }
    });
    this.vpCheckListAll.sort(function(a, b) {
      return visboCmpString(a.vp.name.toLowerCase(), b.vp.name.toLowerCase());
    });
    this.filterVPList();
  }

  initFilter(list: VisboProjectVersion[]): void {
    let lastValueRisk: number;
    let lastValueSF: number;
    let lastValueVPStatus: string;
    let lastValueBU: string;
    this.filterBU = undefined;
    this.filterRisk = undefined;
    this.filterStrategicFit = undefined;
    this.filterVPStatusIndex = undefined;
    if (!list || list.length < 1) {
      return;
    }
    list.forEach( item => {
      if (item.vp?.customFieldDouble) {
        if (this.filterStrategicFit === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_strategicFit');
          if (customField) {
            if ( this.filterStrategicFit == undefined && lastValueSF >= 0 && customField.value != lastValueSF) {
              this.filterStrategicFit = 0;
            }
            lastValueSF = customField.value
          }
        }
        if (this.filterRisk === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_risk');
          if (customField) {
            if ( this.filterRisk == undefined && lastValueRisk >= 0 && customField.value != lastValueRisk) {
              this.filterRisk = 0;
            }
            lastValueRisk = customField.value
          }
        }
      }
      if (item.vp?.customFieldString) {
        if (this.filterBU === undefined) {
          const customField = getCustomFieldString(item.vp, '_businessUnit');
          if (customField) {
            if ( this.filterBU == undefined && lastValueBU && customField.value != lastValueBU) {
              this.filterBU = '';
            }
            lastValueBU = customField.value
          }
        }
      }
      const vpStatus = item.vp?.vpStatus;
      if (vpStatus) {
        if ( this.filterVPStatusIndex == undefined && lastValueVPStatus && vpStatus != lastValueVPStatus) {
          this.filterVPStatusIndex = 0;
        }
        lastValueVPStatus = vpStatus
      }
    });
  }

  getVariants(vp: VisboProject): VPVariant[] {
    const result: VPVariant[] = [];
    if (vp && vp.variant) {
      vp.variant.forEach(item => {
        if (item.variantName != 'pfv' && item.vpvCount > 0) {
          result.push(item);
        }
      });
      result.sort(function (a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase()); });
    }
    return result;
  }

  getVPFVariantList(): DropDown[] {
    return this.listVPFVariant?.filter(item => item.version > 0);
  }

  getVariantName(): string {
    if (this.activeVPFVariant?.variantName) {
      return '('.concat(this.activeVPFVariant.variantName, ')');
    }
    return '';
  }

  getVPFMember(vp: VisboProject): VPFItem {
    let result: VPFItem;
    if (this.vpfActive && this.vpfActive.allItems) {
      result = this.vpfActive.allItems.find(item => item.vpid.toString() == vp._id.toString());
    }
    return result;
  }

  getVPDouble(vp: VisboProject, key: string): number {
    const property = getCustomFieldDouble(vp, key);
    return property?.value;
  }

  globalChecked(): void {
    this.log(`Switch Global Check ${this.isGlobalChecked}`);
    this.vpCheckListFiltered.forEach(item => {
      item.isChecked = this.isGlobalChecked;
    });
  }

  filterKeyBoardEvent(event: KeyboardEvent): void {
    if (!event) { this.log('No Keyboard Event'); }
    this.filterVPList();
  }

  filterVPList(clear = false): void {
    if (clear) { this.vpfListFilter = undefined; }
    let allOn = true;
    const list = [];
    const vpfListFilter = this.vpfListFilter ? this.vpfListFilter.toLowerCase() : undefined;
    this.vpCheckListAll.forEach( item => {
      if (vpfListFilter
      && !(item.vp.name.toLowerCase().indexOf(vpfListFilter) >= 0)
      || item.vp.variant.findIndex(variant => variant.variantName.toLowerCase().indexOf(vpfListFilter) >= 0)
      || this.getVPManager(item.vp, true).toLowerCase().indexOf(vpfListFilter) >= 0
      ) {
        return;
      }
      if (this.filterVPStatusIndex > 0
      && item.vp.vpStatus !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
        return;
      }
      if (this.filterBU) {
        const fieldBU = getCustomFieldString(item.vp, '_businessUnit');
        if ((fieldBU?.value || '') !== this.filterBU) {
          return;
        }
      }
      if (this.filterStrategicFit >= 0) {
        const fieldSF = getCustomFieldDouble(item.vp, '_strategicFit');
        if ((fieldSF?.value || 0) < this.filterStrategicFit) {
          return;
        }
      }
      if (this.filterRisk >= 0) {
        const fieldSF = getCustomFieldDouble(item.vp, '_risk');
        if ((fieldSF?.value || 0) < this.filterRisk) {
          return;
        }
      }
      if (!item.isChecked) { allOn = false; }
      list.push(item);
    });
    this.vpCheckListFiltered = list;
    this.isGlobalChecked = allOn;
  }

  filterEventVPStatus(index: number): void {
    if (index <= 0 || index >= this.dropDownVPStatus.length) {
      this.filterVPStatusIndex = 0;
    } else {
      this.filterVPStatusIndex = index;
    }
    this.filterVPList(true);
  }

  filterEventBU(index: number): void {
    if (index <= 0 || index >= this.dropDownBU.length) {
      this.filterBU = undefined;
    } else {
      this.filterBU = this.dropDownBU[index];
    }
    this.filterVPList(true);
  }

  initVariantChange(index: number): void {
    this.log(`init Change Variant of VPs ${index}`);
    if (index >= 0 && index < this.vpCheckListFiltered.length) {
      const element = this.vpCheckListFiltered[index];
      this.vpFilterIndex = index;
      this.log(`Found VP ${element.vp.name} Variant Selected ${element.variantName}`);
      this.switchVariantCount = 0;
      this.switchVariant = element.variantName || '';
      if (element.variantName) {
        // count the number of projects who have this Variant
        this.vpCheckListFiltered.forEach(item => {
          if (item.vp && item.vp.variant && item.vp.variant.length > 0) {
            item.vp.variant.forEach(variant => {
              if (variant.variantName == element.variantName && variant.vpvCount > 0) {
                  this.switchVariantCount += 1;
              }
            })
          }
        });
        this.log(`Change to Variant ${element.variantName} for count ${this.switchVariantCount} VPs`);
      } else {
        // count the number of projects who have this Variant
        this.vpCheckListFiltered.forEach(item => {
          if (item.variantName) {
            this.switchVariantCount += 1;
          }
        });
        this.log(`Change to Standard for count ${this.switchVariantCount} VPs`);
      }
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

  changeVPVariant(): void {
    this.log(`Change Variant ${this.switchVariant || 'Standard'} of ${this.switchVariantCount} VPs`);
    if (this.switchVariant) {
      this.vpCheckListFiltered.forEach(item => {
        if (item.vp && item.vp.variant && item.vp.variant.length > 0) {
          item.vp.variant.forEach(variant => {
            if (variant.variantName == this.switchVariant) {
                item.variantName = this.switchVariant;
            }
          })
        }
      });
    } else {
      // reset to Standard
      this.vpCheckListFiltered.forEach(item => {
        if (item.variantName) {
          item.variantName = '';
        }
      });
    }
  }

  checkUpdateVPF(): boolean {
    let result = false;
    if (this.vpfActive
    && this.vpfActive.variantName == this.activeVPFVariant?.variantName
    && visboIsToday(new Date(this.vpfActive.timestamp))) {
      if (this.hasVPPerm(this.permVP.Modify)) {
        result = true;
      } else if (this.hasVPPerm(this.permVP.CreateVariant)
      && this.user._id == this.vpfActive.updatedFrom?.userId) {
        result = true;
      }
    }
    return result;
  }

  checkCreateVPF(): boolean {
    let result = false;
    if (this.hasVPPerm(this.permVP.Modify)) {
      result = true;
    } else if (this.hasVPPerm(this.permVP.CreateVariant)
    && this.user.email == this.newVPFVariant?.email) {
      result = true;
    }
    return result;
  }

  initCreateVPF(): void {
    this.newVPFVariant = this.activeVPFVariant
    if (!this.newVPFVariant) {
      this.newVPFVariant = new DropDown();
      this.newVPFVariant.variantName = '';
      this.newVPFVariant.name = this.defaultVariant;
    }
    if (!this.vpfActive) {
      this.vpfActive = new VisboPortfolioVersion();
      this.vpfActive.variantName = '';
    }
  }

  createVPVariant(): void {
    this.log(`Create Variant ${this.newVariant?.variantName}`);
    this.newVariant.variantName = (this.newVariant.variantName || '').trim();
    this.newVariant.description =  (this.newVariant.description || '').trim();
    if (!this.newVariant?.variantName) {
      // ignore empty variant
      return;
    } else if (this.vpActive.variant.find(item => item.variantName.toLowerCase() == this.newVariant.variantName.toLowerCase())) {
      this.log(`Variant does already exists ${this.newVariant?.variantName}`);
      return;
    }
    this.visboprojectService.createVariant(this.newVariant, this.vpActive._id )
      .subscribe(
        variant => {
          // Add Variant to list
          this.vpActive.variant.push(variant);
          this.variantListInit(variant.variantName);
          const message = this.translate.instant('vpDetail.msg.createVariantSuccess', {'name': variant.variantName});
          this.alertService.success(message);
        },
        error => {
          this.log(`Create Variant error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorCreateVariantPerm');
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpDetail.msg.errorVariantConflict', {'name': this.newVariant.variantName});
            this.alertService.error(message);
          } else {
            this.log(`Error during creating Variant ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  updateVPF(): void {
    this.log(`init VPF Item List for Update`);
    const newVPF = new VisboPortfolioVersion();
    newVPF.allItems = [new VPFItem()];
    newVPF.allItems.pop();
    let zeile = 0;
    this.vpCheckListAll.forEach(item => {
      if (item.isChecked) {
        const entry = new VPFItem();
        entry.vpid = item.vp._id;
        entry.name = item.vp.name;
        entry.variantName = item.variantName;
        entry.show = true;
        entry.zeile = ++zeile;
        newVPF.allItems.push(entry);
      }
    });
    newVPF.variantName = this.activeVPFVariant?.variantName || '';
    this.log(`update VPF List ${this.vpCheckListAll.length}`);
    newVPF._id = this.vpfActive._id;
    this.visboprojectversionService.updateVisboPortfolioVersion(this.vpActive, newVPF).subscribe(
      vpf => {
        console.log("update VPF %s with ID %s VPF Len %s", vpf.name, vpf._id, vpf.allItems.length);
        const message = this.translate.instant('vpfVersion.msg.createVPFSuccess', {name: this.vpActive.name});
        this.alertService.success(message, true);
        // Update VPF List
        if (this.listVPF.findIndex(item => item._id == vpf._id) >= 0) {
          this.vpfActive = vpf;
          this.getVisboPortfolioKeyMetrics();
        }
      },
      error => {
        this.log(`add VPF failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vpfVersion.msg.errorVPFPerm', {name: name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  createVPF(): void {
    this.log(`init VPF Item List cor CreateVPF`);
    const newVPF = new VisboPortfolioVersion();
    newVPF.allItems = [new VPFItem()];
    newVPF.allItems.pop();
    let zeile = 0;
    this.vpCheckListAll.forEach(item => {
      if (item.isChecked) {
        const entry = new VPFItem();
        entry.vpid = item.vp._id;
        entry.name = item.vp.name;
        entry.variantName = item.variantName;
        entry.show = true;
        entry.zeile = ++zeile;
        newVPF.allItems.push(entry);
      }
    });
    newVPF.variantName = this.newVPFVariant?.variantName || '';
    this.log(`create VPF List ${this.vpCheckListAll.length}`);
    this.visboprojectversionService.addVisboPortfolioVersion(this.vpActive, newVPF).subscribe(
      vpf => {
        console.log("add VPF %s with ID %s VPF Len %s", vpf.name, vpf._id, vpf.allItems.length);
        const message = this.translate.instant('vpfVersion.msg.createVPFSuccess', {name: this.vpActive.name});
        this.alertService.success(message, true);

        this.switchVPF(vpf);
        this.getVisboProject(this.vpActive._id);
      },
      error => {
        this.log(`add VPF failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vpfVersion.msg.errorVPFPerm', {name: name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  deleteVPF(vpf: VisboPortfolioVersion): void {
    this.log(`Remove VisboPortfolioVersion: ${vpf.name} from:  ${vpf.timestamp}`);
    this.visboprojectversionService.deleteVisboPortfolioVersion(vpf)
      .subscribe(
        () => {
          const from = this.datePipe.transform(vpf.timestamp, 'dd.MM.yy');
          // const from = vpf.timestamp.toISOString();
          const message = this.translate.instant('vpfVersion.msg.removeVPFSuccess', {'name': vpf.name, 'from': from });
          const index = this.listVPF.findIndex(item => item._id == vpf._id);
          this.listVPF.splice(index, 1);
          // serach a VPF from same variant, if none available fall back to main
          const newVPF = this.listVPF.find(item => item.variantName == vpf.variantName);
          this.switchVPF(newVPF || this.listVPF[0]);
          this.getVisboProject(this.vpActive._id);
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboPortfolioVersion error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPerm', {'name': vpf.name});
            this.alertService.error(message);
          } else {
            this.log(`Error during VisboPortfolioVersion ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  changeView(nextView: string, refDate: Date = undefined, filter:string = undefined, vpfid:string = undefined, refreshPage = true): void {
    if (nextView) {
      if (this.views.findIndex(item => item === nextView) < 0) {
        nextView = this.views[0];
      }
      this.pageParams.view = nextView;
    }
    if (filter) {
      this.pageParams.filter = filter.trim();
    } else if (filter === null) {
      delete this.pageParams.filter
    } else {
      this.pageParams.filter = localStorage.getItem('vpfFilter') || undefined;
    }
    if (refDate) {
      if (visboIsToday(refDate)) {
        this.pageParams.refDate = undefined;
      } else {
        this.pageParams.refDate = refDate.toISOString();
      }
    }
    if (vpfid) {
      this.pageParams.vpfid = vpfid;
    }
    if (refreshPage) { this.updateUrlParam(); }
  }

  updateUrlParam(): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    const queryParams = new VPFParams();
    queryParams.filter = this.pageParams.filter || null;
    queryParams.vpfid = this.pageParams.vpfid || null;
    queryParams.refDate = this.pageParams.refDate || null;
    queryParams.view = this.pageParams.view || null;
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  getKM(vp: VisboProject): number {
    const vpv = this.listVPV?.find(item => item.vpid.toString() == vp._id.toString())
    // we only know if there is a version, if it contains already to the portfolio list and we have fetched the related versions
    // RESULT 0: no Version of the VP either because no version or no permission, 1 vpv with keyMetrics available, 2: no keyMetrics because of missing baseline
    const isStored = this.vpfActive?.allItems?.find(item => item.vpid.toString() == vp._id.toString());
    let result = isStored ? 0 : 1;
    if (vpv) {
      result = vpv.keyMetrics ? 1 : 2;
    }
    return result;
  }

  isVersionMismatch(): boolean {
    let result = false;
    if (!this.listCalcVPV || !this.vpfActive || !this.vpfActive.allItems) {
      return result;
    }

    if (this.vpfActive.allItems.length !== this.vpvCount) {
      result = true;
    }
    return result;
  }

  calcVPVList(): void {
    this.listVPV.forEach(vpv => {
        vpv.vp = this.listVP.find(vp => vp._id == vpv.vpid);
    });
    if (!this.vpfActive && !this.vpfActive.allItems) { return; }
    this.listCalcVPV = [];
    this.vpvCount = 0;
    for (let i = 0; i < this.vpfActive.allItems.length; i++) {
      const item = this.vpfActive.allItems[i];
      const nextVPV = this.listVPV.find(vpvItem => vpvItem.vpid === item.vpid);
      if (nextVPV) {
        this.vpvCount += 1;
        this.listCalcVPV.push(nextVPV);
      }
    }
  }

  // get the details of the project
  gotoVPDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  gotoCompareVPF(): void {
    this.log(`goto Compare for VPF ${this.vpActive._id} ${this.vpfActive._id}`);
    this.router.navigate(
      ['vpfcmp/'.concat(this.vpActive._id)],
      { queryParams: { vpfid: this.vpfActive._id },
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
      }
    );
  }

  variantListInit(variantName: string = undefined): void {
    this.log(`Init Drop Down List ${this.vpActive?.variant?.length}`);
    this.listVPFVariant = [];

    this.vpActive?.variant?.forEach(variant => {
      if (variant.variantName != 'pfv') {
        this.listVPFVariant.push({name: variant.variantName, version: variant.vpfCount, variantName: variant.variantName, description: variant.description, email: variant.email });
      }
    });
    this.listVPFVariant.sort(function (a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase())});
    this.listVPFVariant.unshift({name: this.defaultVariant, version: this.vpActive.vpfCount, variantName: '', description: '', email: '' });
    if (variantName) {
      this.newVPFVariant = this.listVPFVariant.find(item => item.variantName == variantName);
    }
    this.activeVPFVariant = this.listVPFVariant[0];
  }

  checkVPFActive(item: DropDown): boolean {
    return this.vpfActive?.variantName == item.variantName;
  }

  switchVariantByName(name: string, newVariant = false): void {
    let variant = this.listVPFVariant.find(variant => variant.variantName == name);
    if (!variant) {
      variant = this.listVPFVariant[0];
    }
    if (newVariant) {
      this.newVPFVariant = variant;
    } else {
      this.activeVPFVariant = variant;
    }
  }

  switchPFVersion(variantName: string, ts: Date = undefined): void {
    this.log(`Change Drop Down ${variantName} `);
    // MS TODO: select the correct version for this variant
    const versionList = this.listVPF?.filter(vpf => vpf.variantName == variantName && (!ts || visboCmpDate(ts, vpf.timestamp) == 0));
    versionList.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); })

    this.switchVPF(versionList[0]);
  }

  switchVPF(vpf: VisboPortfolioVersion): void {
    if (vpf) {
      this.vpfActive = vpf;
      this.switchVariantByName(this.vpfActive.variantName);
      this.changeView(undefined, undefined, undefined, this.vpfActive._id);
      this.getVisboPortfolioKeyMetrics();
    } else {
      this.vpfActive = undefined;
      this.listVPV = undefined;
    }
    this.updateUrlParam();
  }

  getVPStatus(local: boolean, original: string = undefined): string {
    if (!this.dropDownVPStatus) {
      return undefined;
    }
    let result = this.dropDownVPStatus[this.filterVPStatusIndex || 0];
    if (original) {
      result = this.dropDownVPStatus.find(item => item.name == original) || result;
    }
    if (local) {
      return result.localName;
    } else {
      return result.name;
    }
  }

  setRefDateStr(refDate: Date): void {
    const offset = refDate.getTimezoneOffset()
    const localDate = new Date(refDate.getTime() - (offset*60*1000))
    this.vpvRefDateStr = localDate.toISOString().substr(0, 10);
  }

  parseDate(dateString: string): Date {
     if (dateString) {
       const actDate = new Date(dateString);
       actDate.setHours(0, 0, 0, 0);
       return actDate;
    }
    return null;
  }

  sortVPTable(n: number): void {
    if (n !== undefined) {
      if (!this.vpCheckListAll) {
        return;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    // console.log("Sort VP Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn === 1) {
      // sort by VP Name
      this.vpCheckListFiltered.sort(function(a, b) {
        return visboCmpString(a.vp.name.toLowerCase(), b.vp.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.vpCheckListFiltered.sort(function(a, b) { return visboCmpDate(a.vp.updatedAt, b.vp.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.vpCheckListFiltered.sort(function(a, b) { return (a.isChecked ? 0 : 1) - (b.isChecked ? 0 : 1); });
    } else if (this.sortColumn === 4) {
      this.vpCheckListFiltered.sort(function(a, b) {
        // combine the two fields hasVariants and Variant Name to get them sorted as a block (all projects together with a variant separated from the ones without)
        const aVariant = (a.hasVariants ? '1' : '0') + (a.variantName || '');
        const bVariant = (b.hasVariants ? '1' : '0') + (b.variantName || '');
        return visboCmpString(aVariant.toLowerCase(), bVariant.toLowerCase());
      });
    } else if (this.sortColumn === 5) {
      this.vpCheckListFiltered.sort(function(a, b) {
        const aRiskItem = getCustomFieldDouble(a.vp, '_risk');
        const aRisk = aRiskItem ? aRiskItem.value || 0 : 0;
        const bRiskItem = getCustomFieldDouble(b.vp, '_risk');
        const bRisk = bRiskItem ? bRiskItem.value || 0 : 0;
        return bRisk - aRisk;
      });
    } else if (this.sortColumn === 6) {
      this.vpCheckListFiltered.sort(function(a, b) {
        const aStrategicFitItem = getCustomFieldDouble(a.vp, '_strategicFit');
        const aStrategicFit = aStrategicFitItem ? aStrategicFitItem.value || 0 : 0;
        const bStrategicFitItem = getCustomFieldDouble(b.vp, '_strategicFit');
        const bStrategicFit = bStrategicFitItem ? bStrategicFitItem.value || 0 : 0;
        return aStrategicFit - bStrategicFit;
      });
    } else if (this.sortColumn === 7) {
      // sort by VP Status
      this.vpCheckListFiltered.sort(function(a, b) {
        return visboCmpString(b.vp.vpStatusLocale, a.vp.vpStatusLocale);
      });
    }
    // console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.vpCheckListFiltered.reverse();
      // console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string): void {
    this.messageService.add('VisboPortfolioVersion: ' + message);
    console.log('VisboPortfolioVersion: ' + message)
  }
}
