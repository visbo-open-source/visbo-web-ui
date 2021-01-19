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
import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFItem, VPFParams } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, convertDate, visboIsToday } from '../_helpers/visbo.helper';

class DropDown {
  name: string;
  version: number;
  timestamp: Date;
}

class vpCheckItem {
  isChecked: boolean;
  variantName: string;
  hasVariants: boolean;
  vp: VisboProject;
}

@Component({
  selector: 'app-visboportfolio-versions',
  templateUrl: './visboportfolio-versions.component.html'
})
export class VisboPortfolioVersionsComponent implements OnInit, OnChanges {

    visboportfolioversions: VisboPortfolioVersion[];
    visboprojectversions: VisboProjectVersion[];
    vpvCount: number;

    dropDown: DropDown[] = [];
    dropDownSelected: string;

    dropDownVariant: DropDown[] = [];
    dropDownVariantSelected: string;

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
    vpList: VisboProjectVersion[];
    vpCheckListAll: vpCheckItem[] = [];
    vpCheckListFiltered: vpCheckItem[] = [];
    filter: string;
    hasOrga = false;

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

    const refDate = this.route.snapshot.queryParams['refDate'];
    const nextView = this.route.snapshot.queryParams['view'] || 'KeyMetrics';
    const vpfid = this.route.snapshot.queryParams['vpfid'] || undefined;
    this.vpfid = vpfid;
    this.vpvRefDate = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.changeView(nextView, refDate ? this.vpvRefDate : undefined, undefined, vpfid, false);

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
          this.getVisboPortfolioVersions();
          this.getVisboCenterOrga();
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

  getAllProjects(vp): void {
    if (!vp && !vp.vcid) {
      this.log("No Portfolio found");
      return;
    }
    this.visboprojectService.getVisboProjects(vp.vcid, false, false)
      .subscribe(
        visboprojects => {
          this.initVPF(visboprojects);
        },
        error => {
          this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );


  }
  getVisboCenterOrga(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      // check if Orga is available
      this.log(`get VC Orga ${this.vpActive.vcid}`);
      this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, undefined, true)
        .subscribe(
          vcsettings => {
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

  getVisboPortfolioVersions(): void {
    this.log(`get Portfolio Versions ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
    this.visboprojectversionService.getVisboPortfolioVersions(this.vpActive._id, this.deleted)
      .subscribe(
        visboportfolioversions => {
          this.visboportfolioversions = visboportfolioversions;
          let index = 0;
          if (this.vpfid ) {
            index = visboportfolioversions.findIndex(item => item._id.toString() === this.vpfid);
            if (index < 0) { index = 0; }
          }
          if (visboportfolioversions.length > 0) {
            // this.combinedPerm = visboportfolioversions[0].perm;
            this.vpfActive = visboportfolioversions[index];
            this.dropDownInit();
            this.getVisboPortfolioKeyMetrics();
            this.log(`get VPF Length ${this.visboportfolioversions.length}`);
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

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.calcVPList();
          this.log(`get VPF Key metrics: Get ${visboprojectversions.length} Project Versions`);
          if (visboprojectversions.length > 0) {
            this.log(`First VPV: ${visboprojectversions[0]._id} ${visboprojectversions[0].timestamp} ${visboprojectversions[0].keyMetrics?.endDateCurrent} `);
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
    this.changeView(undefined, this.vpvRefDate, undefined);
    this.getVisboPortfolioKeyMetrics();
  }

  initVPF(visboprojects: VisboProject[]): void {
    this.dropDownVariantSelected = this.vpfActive.variantName;
    this.isGlobalChecked = false;
    this.vpCheckListAll = [];
    visboprojects.forEach(item => {
      if (item.vpType == 0) {
        let entry = new vpCheckItem();
        const vpfMember = this.getVPFMember(item);
        if (vpfMember) {
          entry.isChecked = true;
          entry.variantName = vpfMember.variantName;
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

  getVariants(vp: VisboProject): string[] {
    let result = [];
    if (vp && vp.variant) {
      vp.variant.forEach(item => {
        if (item.variantName != 'pfv' && item.vpvCount > 0) {
          result.push(item.variantName);
        }
      });
      result.sort(function (a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
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
    if (clear) { this.filter = undefined; }
    let allOn = true;
    let list = [];
    const filter = this.filter ? this.filter.toLowerCase() : undefined;
    this.vpCheckListAll.forEach( item => {
      if (!filter
      || (item.vp.name.toLowerCase().indexOf(filter) >= 0)
      || item.vp.variant.findIndex(variant => variant.variantName.toLowerCase().indexOf(filter) >= 0) >= 0) {
        if (!item.isChecked) { allOn = false; }
        list.push(item);
      }
    });
    this.vpCheckListFiltered = list;
    this.isGlobalChecked = allOn;
  }

  checkUpdateVPF(): boolean {
    let result = false;
    if (this.vpfActive
    && this.vpfActive.variantName == this.dropDownVariantSelected
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
    let newVPF = new VisboPortfolioVersion();
    newVPF.allItems = [new VPFItem()];
    newVPF.allItems.pop();
    let zeile = 0;
    this.vpCheckListAll.forEach(item => {
      if (item.isChecked) {
        let entry = new VPFItem();
        entry.vpid = item.vp._id;
        entry.name = item.vp.name;
        entry.variantName = item.variantName;
        entry.show = true;
        entry.zeile = ++zeile;
        newVPF.allItems.push(entry);
      }
    });
    newVPF.variantName = this.dropDownVariantSelected;
    if (this.checkUpdateVPF()) {
      this.log(`update VPF List ${this.vpCheckListAll.length}`);
      newVPF._id = this.vpfActive._id;
      this.visboprojectversionService.updateVisboPortfolioVersion(this.vpActive, newVPF).subscribe(
        vpf => {
          console.log("update VPF %s with ID %s VPF Len %s", vpf.name, vpf._id, vpf.allItems.length);
          const message = this.translate.instant('vpfVersion.msg.createVPFSuccess', {name: this.vpActive.name});
          this.alertService.success(message, true);
          // Update VPF List
          let index = this.visboportfolioversions.findIndex(item => item._id == vpf._id);
          if (index >= 0) {
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
          this.visboportfolioversions.push(vpf);
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
          let index = this.visboportfolioversions.findIndex(item => item._id == vpf._id);
          this.visboportfolioversions.splice(index, 1);
          if (index >= this.visboportfolioversions.length) {
            index = this.visboportfolioversions.length - 1;
          }
          if (index >= 0) {
            this.dropDownInit()
            this.switchPFVersion(index);
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

  getVariantName(vpf: VisboPortfolioVersion, replace = false, style = false): string {
    let result = '';
    if (vpf) {
      result = vpf.variantName || '';
    } else {
      result = this.dropDownVariantSelected || '';
    }
    if (result == '' && replace) {
      result = this.translate.instant('vpfVersion.lbl.defaultVariant');
    }
    if (result && style) {
      result = '('.concat(result, ')');
    }
    return result;
  }

  evaluateDirection(): void {
    if (this.visboprojectversions.length === 0) {
      if (this.isSameDay(this.vpvRefDate, new Date())) {
        // no Versions for this Portfolio at all
        this.statusDirection = undefined;
      } else {
        // no Versions before this timestamp
        this.statusDirection = -1;
      }
    } else {
      if (this.isSameDay(this.vpvRefDate, new Date())) {
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

  isSameDay(dateA: Date, dateB: Date): boolean {
    if (!dateA || !dateB) { return false; }
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    return dateA.toISOString() === dateB.toISOString();
  }

  isVersionMismatch(): boolean {
    let result = false;
    if (!this.vpList || !this.vpfActive || !this.vpfActive.allItems) { return result; }

    if (this.vpfActive.allItems.length !== this.vpvCount) {
        result = true;
      }
    return result;
  }

  calcVPList(): void {
    if (!this.vpfActive && !this.vpfActive.allItems) { return; }
    this.vpList = [];
    this.vpvCount = 0;
    for (let i = 0; i < this.vpfActive.allItems.length; i++) {
      const nextVP = new VisboProjectVersion();
      const item = this.vpfActive.allItems[i];
      nextVP.vpid = item.vpid;
      nextVP.name = item.name;
      nextVP.variantName = item.variantName;
      const index = this.visboprojectversions.findIndex(vpvItem => vpvItem.vpid === nextVP.vpid);
      if (index >= 0) {
        nextVP.timestamp = new Date(this.visboprojectversions[index].timestamp);
        nextVP.startDate = this.visboprojectversions[index].startDate;
        nextVP.endDate = this.visboprojectversions[index].keyMetrics?.endDateCurrent || this.visboprojectversions[index].endDate;
        nextVP.leadPerson = this.visboprojectversions[index].leadPerson;
        nextVP.VorlagenName = this.visboprojectversions[index].VorlagenName;
        nextVP.businessUnit = this.visboprojectversions[index].businessUnit;
        nextVP.status = this.visboprojectversions[index].status;
        nextVP.ampelStatus = this.visboprojectversions[index].ampelStatus;
        nextVP.ampelErlaeuterung = this.visboprojectversions[index].ampelErlaeuterung;
        nextVP.keyMetrics = this.visboprojectversions[index].keyMetrics;
        this.vpvCount += 1;
      }
      this.vpList.push(nextVP);
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
    this.log(`Init Drop Down List ${this.visboportfolioversions.length}`);
    this.dropDown = [];
    const len = this.visboportfolioversions.length;

    for (let i = 0; i < len; i++) {
      const timestamp = new Date(this.visboportfolioversions[i].timestamp);
      let text = 'Version '.concat('from ', convertDate(new Date(timestamp), 'fullDate', this.currentLang));
      if (this.visboportfolioversions[i].variantName) {
        text = text.concat(' ( ', this.visboportfolioversions[i].variantName, ' )');
      }
      this.dropDown.push({name: text, version: i, timestamp: timestamp });
    }
    this.dropDown.sort(function (a, b) { return b.timestamp.getTime() - a.timestamp.getTime(); });
    if (len > 0 ) {
      this.dropDownSelected = this.dropDown[0].name;
    }
    this.dropDownVariantInit();
  }

  dropDownVariantInit(): void {
    this.log(`Init Variant Drop Down List ${this.vpActive.variant.length}`);
    this.dropDownVariant = [];
    let index = 1;

    this.vpActive.variant.forEach(item => {
      this.dropDownVariant.push({name: item.variantName, version: index++, timestamp: undefined });
    });
    // this.dropDownVariant.sort(function (a, b) { visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    this.dropDownVariant.splice(0, 0, {name: '', version: 0, timestamp: undefined });
    index = 0;
    if (this.vpfActive.variantName) {
      const i = this.dropDownVariant.findIndex(item => item.name === this.vpfActive.variantName);
      if (i >= 0) {
          index = i;
      }
    }
    this.dropDownVariantSelected = this.dropDownVariant[index].name;
  }

  switchEditVariant(i: number): void {
    this.log(`Change Variant Drop Down ${i} `);
    if (i >= 0 && i < this.dropDownVariant.length) {
      this.dropDownVariantSelected = this.dropDownVariant[i].name;
    }
  }

  switchPFVersion(i: number): void {
    this.log(`Change Drop Down ${i} `);
    this.vpfActive = this.visboportfolioversions[i];
    this.dropDownVariantSelected = this.vpfActive.variantName;
    this.getVisboPortfolioKeyMetrics();

    // MS TODO: do we have to reset the refDate???
    this.changeView(undefined, undefined, undefined, this.vpfActive._id)
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
      this.vpCheckListAll.sort(function(a, b) {
        return visboCmpString(a.vp.name.toLowerCase(), b.vp.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.vpCheckListAll.sort(function(a, b) { return visboCmpDate(a.vp.updatedAt, b.vp.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.vpCheckListAll.sort(function(a, b) { return (a.isChecked ? 0 : 1) - (b.isChecked ? 0 : 1); });
    }
    // console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.vpCheckListAll.reverse();
      // console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a message with the MessageService */
  private log(message: string): void {
    this.messageService.add('VisboPortfolioVersion: ' + message);
    console.log('VisboPortfolioVersion: ' + message)
  }
}
