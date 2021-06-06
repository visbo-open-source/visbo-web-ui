import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-visboportfolio-cmp',
  templateUrl: './visboportfolio-cmp.component.html',
  styleUrls: ['./visboportfolio-cmp.component.css']
})
export class VisboPortfolioCmpComponent implements OnInit {

  listVPF: VisboPortfolioVersion[];
  listVP: VisboProject[];
  vpvCount: number;

  dropDown: DropDown[] = [];
  dropDownSelected: string;

  listVPFVariant: DropDown[] = [];

  // Compare Versions 0 = origin version, 1 = compare version
  activeVPFVariant: DropDown[] = [];
  vpfActive: VisboPortfolioVersion[] = [];
  vpvRefDate: Date[] = [];
  listVPV: VisboProjectVersion[][] = [];
  listCalcVPV: VisboProjectVersion[][] = [];

  views = ['KeyMetrics', 'List'];

  user: VisboUser;
  vpSelected: string;
  vpActive: VisboProject;

  vpfid: string;
  deleted = false;
  currentLang: string;

  vpFilterIndex: number;
  switchVariantCount: number;
  switchVariant: string;
  vpfListFilter: string;
  customize: VisboSetting;

  pageParams = new VPFParams();
  isGlobalChecked = false;

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
    this.titleService.setTitle(this.translate.instant('vpfCmp.title'));
    this.log(`Init VPF Campare with Transaltion: ${this.translate.instant('vpfCmp.title')}`);

    localStorage.removeItem('vpfFilter');
    const refDate = this.route.snapshot.queryParams['refDate'];
    const refDateCmp = this.route.snapshot.queryParams['refDateCmp'];
    const nextView = this.route.snapshot.queryParams['view'] || 'KeyMetrics';
    const vpfid = this.route.snapshot.queryParams['vpfid'] || undefined;
    const vpfidCmp = this.route.snapshot.queryParams['vpfidCmp'] || undefined;
    const filter = this.route.snapshot.queryParams['filter'] || null;
    this.vpfid = vpfid;
    this.vpvRefDate[0] = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.changeView(0, nextView, refDate ? this.vpvRefDate[0] : undefined, filter, vpfid, false);
    this.vpvRefDate[1] = Date.parse(refDateCmp) > 0 ? new Date(refDateCmp) : new Date();
    this.changeView(1, nextView, refDate ? this.vpvRefDate[1] : undefined, filter, vpfidCmp, false);

    this.getVisboProject();
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
          this.titleService.setTitle(this.translate.instant('vpfCmp.titleName', {name: visboproject.name}));
          this.initProjectList(this.vpActive);
          this.getVisboPortfolioVersions();
          // this.getVisboCenterOrga();
          // this.getVisboCenterCustomization();
        },
        error => {
          this.log(`get Portfolio VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfCmp.msg.errorPermVP');
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
        },
        error => {
          this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
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
            this.vpfActive[0] = listVPF[index];
            this.vpfActive[1] = listVPF[index];
            this.dropDownInit();
            this.getVisboPortfolioKeyMetrics(0);
            this.log(`get VPF Length ${this.listVPF.length}`);
          } else if (this.hasVPPerm(this.permVP.Modify)) {
            // initiate the edit if user has permission
            document.getElementById("editVPFList").click();
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfCmp.msg.errorPermVersion', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  getVisboPortfolioKeyMetrics(version: number): void {
    this.log(`get VPF keyMetrics ${this.vpfActive[version].name} ${this.vpfActive[version]._id}`);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive[version]._id, this.vpvRefDate[version], false, false, this.vpActive.vcid)
      .subscribe(
        list => {
          this.listVPV[version] = list;
          this.calcVPVList(version);
          this.log(`get VPF Key metrics: Get ${list.length} Project Versions`);
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfCmp.msg.errorPermVP');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  calcVPVList(version: number): void {
    if (!this.listVPV[version] || !this.vpfActive[version] || !this.vpfActive[version].allItems) { return; }
    this.listVPV[version].forEach(vpv => {
        vpv.vp = this.listVP.find(vp => vp._id == vpv.vpid);
    });
    this.listCalcVPV[version] = [];
    this.vpvCount = 0;
    for (let i = 0; i < this.vpfActive[version].allItems.length; i++) {
      const item = this.vpfActive[version].allItems[i];
      const nextVPV = this.listVPV[version].find(vpvItem => vpvItem.vpid === item.vpid);
      if (nextVPV) {
        this.vpvCount += 1;
        this.listCalcVPV[version].push(nextVPV);
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

  checkVPFActive(item: DropDown, version: number): boolean {
    let result = false;
    if (this.vpfActive[version]) {
      if (item.variantName == this.vpfActive[version].variantName
      && item.timestamp.getTime() == (new Date(this.vpfActive[version].timestamp)).getTime()) {
        result = true;
      }
    }
    return result;
  }

  changeVPVariant(): void {
    this.log(`Change Variant ${this.switchVariant || 'Standard'} of ${this.switchVariantCount} VPs`);
    // if (this.switchVariant) {
    //   this.vpCheckListFiltered.forEach(item => {
    //     if (item.vp && item.vp.variant && item.vp.variant.length > 0) {
    //       item.vp.variant.forEach(variant => {
    //         if (variant.variantName == this.switchVariant) {
    //             item.variantName = this.switchVariant;
    //         }
    //       })
    //     }
    //   });
    // } else {
    //   // reset to Standard
    //   this.vpCheckListFiltered.forEach(item => {
    //     if (item.variantName) {
    //       item.variantName = '';
    //     }
    //   });
    // }
  }

  switchVariantByName(name: string, version: number): void {
      let index = -1;
      if (this.listVPFVariant) {
        index = this.listVPFVariant.findIndex(item => item.variantName == name);
      }
      this.activeVPFVariant[version]= index >= 0 ? this.listVPFVariant[index] : undefined;
  }

  switchVariantByID(i: number, version: number): void {
    this.log(`Change Variant Drop Down ${i} `);
    if (i >= 0 && i < this.listVPFVariant.length) {
      this.activeVPFVariant[version] = this.listVPFVariant[i];
    }
  }

  switchPFVersion(i: number, version: number): void {
    this.log(`Change Drop Down ${i} `);
    if (i >= 0 && i < this.listVPF.length) {
      this.vpfActive[version] = this.listVPF[i];
      this.switchVariantByName(this.vpfActive[version].variantName, version);
      this.getVisboPortfolioKeyMetrics(version);

      // MS TODO: do we have to reset the refDate???
      this.changeView(version, undefined, undefined, undefined, this.vpfActive[version]._id)
    } else {
      this.vpfActive[version] = undefined;
      this.listVPV[version] = undefined;
    }
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
    this.listVPFVariant.splice(0, 0, {name: this.translate.instant('vpfCmp.lbl.defaultVariant'), variantName: '', version: 0, timestamp: undefined, email: undefined });
    index = 0;
    if (this.vpfActive[0].variantName) {
      const i = this.listVPFVariant.findIndex(item => item.name === this.vpfActive[0].variantName);
      if (i >= 0) {
          index = i;
      }
    }
    this.activeVPFVariant[0] = this.listVPFVariant[index];
    if (this.vpfActive[1].variantName) {
      const i = this.listVPFVariant.findIndex(item => item.name === this.vpfActive[1].variantName);
      if (i >= 0) {
          index = i;
      }
    }
    this.activeVPFVariant[1] = this.listVPFVariant[index];
  }

  changeView(version: number, nextView: string, refDate: Date = undefined, filter:string = undefined, vpfid:string = undefined, refreshPage = true): void {
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
      const resultRefDate = visboIsToday(refDate) ? undefined : refDate.toISOString();
      if (version == 0) {
        this.pageParams.refDate = resultRefDate;
      } else {
        this.pageParams.refDateCmp = resultRefDate;
      }
    }
    if (vpfid) {
      if (version == 0) {
        this.pageParams.vpfid = vpfid;
      } else {
        this.pageParams.vpfidCmp = vpfid;
      }
    }
    if (refreshPage) { this.updateUrlParam(); }
  }

  updateUrlParam(): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    const queryParams = new VPFParams();
    queryParams.filter = this.pageParams.filter || null;
    queryParams.vpfid = this.pageParams.vpfid || null;
    queryParams.vpfidCmp = this.pageParams.vpfidCmp || null;
    queryParams.refDate = this.pageParams.refDate || null;
    queryParams.refDateCmp = this.pageParams.refDateCmp || null;
    queryParams.view = this.pageParams.view || null;
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  displayVariantName(variant: DropDown): string {
    let result = this.translate.instant('vpfCmp.lbl.defaultVariant');
    if (variant?.variantName) {
      result = '(' + variant.name + ')';
    }
    return result
  }

  updateDateRange(version: number): void {
    this.getVisboPortfolioKeyMetrics(version);
    this.changeView(version, undefined, this.vpvRefDate[version], undefined, undefined)
  }

  parseDate(dateString: string): Date {
    return dateString ? new Date(dateString) : new Date();
  }

  hasListVPV(): boolean {
    if (!this.listVPV || !this.listVPV[0] || this.listVPV[0].length == 0) return false;
    if (!this.listVPV || !this.listVPV[1] || this.listVPV[1].length == 0) return false;
    return true
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string): void {
    this.messageService.add('VisboPortfolioCmp: ' + message);
  }
}
