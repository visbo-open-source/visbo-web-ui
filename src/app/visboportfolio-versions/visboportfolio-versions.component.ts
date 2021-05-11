import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';

import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboUser } from '../_models/visbouser';
import { VisboProject, VPVariant } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFItem, VPFParams } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, convertDate, visboIsToday, visboIsSameDay, getPreView } from '../_helpers/visbo.helper';
import { VisboSetting } from '../_models/visbosetting';

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

@Component({
  selector: 'app-visboportfolio-versions',
  templateUrl: './visboportfolio-versions.component.html',
  styleUrls: ['./visboportfolio-versions.component.css']
})
export class VisboPortfolioVersionsComponent implements OnInit, OnChanges {

    listVPF: VisboPortfolioVersion[];
    listVPV: VisboProjectVersion[];
    listVP: VisboProject[];
    vpvCount: number;

    dropDown: DropDown[] = [];
    dropDownSelected: string;

    listVPFVariant: DropDown[] = [];
    activeVPFVariant: DropDown;

    views = ['KeyMetrics', 'Capacity', 'ProjectBoard', 'List'];

    user: VisboUser;
    vpSelected: string;
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    refDateInterval = 'month';
    statusDirection: number;
    scrollRefDate: Date;
    vpfid: string;
    deleted = false;
    currentLang: string;
    listCalcVPV: VisboProjectVersion[];
    vpCheckListAll: vpCheckItem[] = [];
    vpCheckListFiltered: vpCheckItem[] = [];
    vpFilterIndex: number;
    switchVariantCount: number;
    switchVariant: string;
    vpfListFilter: string;
    hasOrga = false;
    vcOrga: VisboSetting[];
    customize: VisboSetting;
    calcPredict = false;

    pageParams = new VPFParams();
    isGlobalChecked = false;

    sortAscending: boolean;
    sortColumn: number;

    combinedPerm: VGPermission = undefined;
    permVC = VGPVC;
    permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
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
    this.user = this.authenticationService.getActiveUser();
    this.titleService.setTitle(this.translate.instant('vpfVersion.title'));
    this.log(`Init VPF with Transaltion: ${this.translate.instant('vpfVersion.title')}`);

    localStorage.removeItem('vpfFilter');
    const refDate = this.route.snapshot.queryParams['refDate'];
    this.calcPredict = this.route.snapshot.queryParams['calcPredict'] ? true : false;
    const nextView = this.route.snapshot.queryParams['view'] || 'KeyMetrics';
    const vpfid = this.route.snapshot.queryParams['vpfid'] || undefined;
    const filter = this.route.snapshot.queryParams['filter'] || null;
    this.vpfid = vpfid;
    this.vpvRefDate = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.changeView(nextView, refDate ? this.vpvRefDate : undefined, filter, vpfid, false);

    this.getVisboProject();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Portfolio Changes ${JSON.stringify(changes)}`);
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

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');
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
          this.getVisboPortfolioVersions();
          this.getVisboCenterOrga();
          this.getVisboCenterCustomization();
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
          // this.initVPF(visboprojects);
        },
        error => {
          this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getVisboCenterOrga(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      if (this.vcOrga == undefined
      || (this.vcOrga.length > 0 && this.vcOrga[0].vcid.toString() != this.vpActive.vcid.toString())) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vpActive.vcid}`);
        this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, (new Date()).toISOString(), true)
          .subscribe(
            vcsettings => {
              this.vcOrga = vcsettings;
              this.hasOrga = vcsettings.length > 0;
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
            // this.combinedPerm = listVPF[0].perm;
            this.vpfActive = listVPF[index];
            this.dropDownInit();
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

  getVisboPortfolioKeyMetrics(): void {
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate, false, this.calcPredict, this.vpActive.vcid)
      .subscribe(
        listVPV => {
          this.listVPV = listVPV;
          this.calcVPVList();
          this.log(`get VPF Key metrics: Get ${listVPV.length} Project Versions`);
          if (listVPV.length > 0) {
            this.log(`First VPV: ${listVPV[0]._id} ${listVPV[0].timestamp} ${listVPV[0].keyMetrics?.endDateCurrent} `);
          }
          this.evaluateDirection();
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

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions ${this.vpvRefDate.toISOString()} ${this.refDateInterval} ${increment}`);
    let newRefDate = new Date(this.vpvRefDate.getTime());
    let quarter = 0;
    switch (this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        if (increment > 0 || newRefDate.getTime() === this.vpvRefDate.getTime()) {
          newRefDate.setDate(newRefDate.getDate() + increment);
        }
        break;
      case 'week':
        newRefDate.setHours(0, 0, 0, 0); // beginning of week
        newRefDate.setDate(newRefDate.getDate() + increment * 7);
        break;
      case 'month':
        newRefDate.setHours(0, 0, 0, 0); // beginning of month
        newRefDate.setDate(1);
        if (increment > 0 || newRefDate.getTime() === this.vpvRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment);
        }
        break;
      case 'quarter':
        quarter = Math.trunc(newRefDate.getMonth() / 3);
        if (increment > 0) {
          quarter += increment;
        }
        newRefDate.setMonth(quarter * 3);
        newRefDate.setDate(1);
        newRefDate.setHours(0, 0, 0, 0);
        if (newRefDate.getTime() === this.vpvRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3);
        }
        break;
    }
    const today = new Date();
    if (newRefDate > today) {
      newRefDate = today;
    }
    this.log(`get getRefDateVersions ${newRefDate.toISOString()}`);
    this.vpvRefDate = new Date(newRefDate.toISOString()); // to guarantee that the item is refreshed in UI
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
            if (vcsettings.length > 0) { this.customize = vcsettings[0]; }
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

  getVPFMember(vp: VisboProject): VPFItem {
    let result: VPFItem;
    if (this.vpfActive && this.vpfActive.allItems) {
      result = this.vpfActive.allItems.find(item => item.vpid.toString() == vp._id.toString());
    }
    return result;
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
      if (!vpfListFilter
      || (item.vp.name.toLowerCase().indexOf(vpfListFilter) >= 0)
      || item.vp.variant.findIndex(variant => variant.variantName.toLowerCase().indexOf(vpfListFilter) >= 0) >= 0) {
        if (!item.isChecked) { allOn = false; }
        list.push(item);
      }
    });
    this.vpCheckListFiltered = list;
    this.isGlobalChecked = allOn;
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
    && this.user._id == this.vpfActive.updatedFrom?.userId
    && visboIsToday(new Date(this.vpfActive.timestamp))) {
        result = true;
    }
    return result;
  }

  saveVPFString(): string {
    let result: string;
    if (this.checkUpdateVPF()) {
      result = this.translate.instant('vpfVersion.btn.update');
    } else {
      result = this.translate.instant('vpfVersion.btn.create');
    }
    return result;
  }

  updateVPF(): void {
    this.log(`init VPF Item List`);
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
    if (this.checkUpdateVPF()) {
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
    } else {
      this.log(`create VPF List ${this.vpCheckListAll.length}`);
      this.visboprojectversionService.addVisboPortfolioVersion(this.vpActive, newVPF).subscribe(
        vpf => {
          console.log("add VPF %s with ID %s VPF Len %s", vpf.name, vpf._id, vpf.allItems.length);
          const message = this.translate.instant('vpfVersion.msg.createVPFSuccess', {name: this.vpActive.name});
          this.alertService.success(message, true);
          // Extend VPF List
          this.listVPF.push(vpf);
          this.vpfActive = vpf;
          this.dropDownInit();
          this.getVisboPortfolioKeyMetrics();
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
  }

  deleteVPF(vpf: VisboPortfolioVersion): void {
    this.log(`Remove VisboPortfolioVersion: ${vpf.name} from:  ${vpf.timestamp}`);
    this.visboprojectversionService.deleteVisboPortfolioVersion(vpf)
      .subscribe(
        () => {
          const from = this.datePipe.transform(vpf.timestamp, 'dd.MM.yy');
          // const from = vpf.timestamp.toISOString();
          const message = this.translate.instant('vpfVersion.msg.removeVPFSuccess', {'name': vpf.name, 'from': from });
          let index = this.listVPF.findIndex(item => item._id == vpf._id);
          this.listVPF.splice(index, 1);
          if (index >= this.listVPF.length) {
            index = this.listVPF.length - 1;
          }
          if (index >= 0) {
            this.dropDownInit()
            this.switchPFVersion(index);
          } else {
            this.switchPFVersion(undefined);
            this.getVisboPortfolioVersions();
          }
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

  evaluateDirection(): void {
    if (this.listVPV.length === 0) {
      if (visboIsSameDay(this.vpvRefDate, new Date())) {
        // no Versions for this Portfolio at all
        this.statusDirection = undefined;
      } else {
        // no Versions before this timestamp
        this.statusDirection = -1;
      }
    } else {
      if (visboIsSameDay(this.vpvRefDate, new Date())) {
        // refDate Today and Versions available, page into past
        this.statusDirection = 1;
      } else {
        // refDate not Today and Versions available, page in both directions
        this.statusDirection = 0;
      }
    }
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
    let result = 0;
    if (vpv) {
      result = vpv.keyMetrics ? 0 : 2;
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

  switchVPFVariant(variantName: string): void {
    let index = undefined;
    if (this.listVPFVariant && this.listVPFVariant.length > 0) {
      index = this.listVPFVariant.findIndex(item => item.variantName == variantName);
      if (index < 0) {
        index = 0;
      }
      this.activeVPFVariant = this.listVPFVariant[index];
    }
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

  getNextVersion(direction: number): void {
    this.getRefDateVersions(direction);
    this.changeView(undefined, this.vpvRefDate);
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

  dropDownInit(): void {
    this.log(`Init Drop Down List ${this.listVPF.length}`);
    this.dropDown = [];
    const len = this.listVPF.length;

    for (let i = 0; i < len; i++) {
      const timestamp = new Date(this.listVPF[i].timestamp);
      let text = 'Version '.concat('from ', convertDate(new Date(timestamp), 'fullDate', this.currentLang));
      if (this.listVPF[i].variantName) {
        text = text.concat(' ( ', this.listVPF[i].variantName, ' )');
      }
      const email = (this.listVPF[i].updatedFrom && this.listVPF[i].updatedFrom.email) || '';
      this.dropDown.push({name: text, version: i, variantName: this.listVPF[i].variantName, timestamp: timestamp, email: email });
    }
    this.dropDown.sort(function (a, b) { return b.timestamp.getTime() - a.timestamp.getTime(); });
    if (len > 0 ) {
      this.dropDownSelected = this.dropDown[0].name;
    }
    this.dropDownVariantInit();
  }

  checkVPFActive(item: DropDown): boolean {
    let result = false;
    if (this.vpfActive) {
      if (item.variantName == this.vpfActive.variantName
      && item.timestamp.getTime() == (new Date(this.vpfActive.timestamp)).getTime()) {
        result = true;
      }
    }
    return result;
  }

  dropDownVariantInit(): void {
    this.log(`Init Variant Drop Down List ${this.vpActive.variant.length}`);
    this.listVPFVariant = [];
    let index = 1;

    this.vpActive.variant.forEach(item => {
      let longDescription = item.description || '';
      if (item.email) {
        longDescription = longDescription.concat(' (', item.email, ')');
      }
      if (item.variantName != 'pfv') {
        this.listVPFVariant.push({name: item.variantName, variantName: item.variantName, description: item.description, longDescription: longDescription, version: index++, timestamp: undefined, email: undefined });
      }
    });
    // this.listVPFVariant.sort(function (a, b) { visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    this.listVPFVariant.splice(0, 0, {name: this.translate.instant('vpfVersion.lbl.defaultVariant'), variantName: '', version: 0, timestamp: undefined, email: undefined });
    index = 0;
    if (this.vpfActive.variantName) {
      const i = this.listVPFVariant.findIndex(item => item.name === this.vpfActive.variantName);
      if (i >= 0) {
          index = i;
      }
    }
    this.activeVPFVariant = this.listVPFVariant[index];
  }

  switchVariantByName(name: string): void {
      let index = -1;
      if (this.listVPFVariant) {
        index = this.listVPFVariant.findIndex(item => item.variantName == name);
      }
      this.activeVPFVariant = index >= 0 ? this.listVPFVariant[index] : undefined;
  }

  switchVariantByID(i: number): void {
    this.log(`Change Variant Drop Down ${i} `);
    if (i >= 0 && i < this.listVPFVariant.length) {
      this.activeVPFVariant = this.listVPFVariant[i];
    }
  }

  switchPFVersion(i: number): void {
    this.log(`Change Drop Down ${i} `);
    if (i >= 0 && i < this.listVPF.length) {
      this.vpfActive = this.listVPF[i];
      this.switchVariantByName(this.vpfActive.variantName);
      this.getVisboPortfolioKeyMetrics();

      // MS TODO: do we have to reset the refDate???
      this.changeView(undefined, undefined, undefined, this.vpfActive._id)
    } else {
      this.vpfActive = undefined;
      this.listVPV = undefined;
    }
  }

  displayVariantName(variant: DropDown): string {
    let result = '';
    if (variant?.variantName) {
      result = '(' + variant.name + ')';
    }
    return result
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
  }
}
