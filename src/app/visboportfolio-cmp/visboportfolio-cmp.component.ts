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
import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFParams } from '../_models/visboportfolio';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpDate, visboCmpString, visboIsToday, getPreView } from '../_helpers/visbo.helper';
import { VisboSetting, VisboOrganisation } from '../_models/visbosetting';

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

// OVERVIEW
// VisboPortfolioCmpComponent is an Angular component used to compare two versions of a Visbo Portfolio. 
// It handles loading and displaying key metrics, project versions, organizational structures, 
// and variant configurations for two selected portfolio versions.
//
// Key Functionalities
// -    Initialization of selected portfolio versions via route parameters.
// -    Loading project data, version data, and portfolio metrics.
// -    Managing user permissions (project and center level).
// -    Switching between variant views and reference dates.
// -    Navigation to detailed project and version views.
//
export class VisboPortfolioCmpComponent implements OnInit {

  listVPF: VisboPortfolioVersion[];   // List of available portfolio versions.
  listVP: VisboProject[];             // List of projects within the portfolio.
  listVPFVariant: DropDown[] = [];

  // Compare Versions 0 = origin version, 1 = compare version
  activeVPFVariant: DropDown[] = [];
  vpfActive: VisboPortfolioVersion[] = [];  // Currently selected active portfolio versions.
  vpvRefDate: Date[] = [];                  // Reference dates for the two versions being compared.
  listVPV: VisboProjectVersion[][] = [];    // List of VisboProjectVersion for both versions.
  listCalcVPV: VisboProjectVersion[][] = [];// Filtered project version lists based on the selected portfolio items.
  update: Date;

  views = ['KeyMetrics', 'List', 'Capacity'];// Available views: KeyMetrics, List, Capacity.

  user: VisboUser;                          // The currently authenticated user.
  vpSelected: string;
  vpActive: VisboProject;                   // The currently active portfolio object.

  deleted = false;
  currentLang: string;

  vpFilterIndex: number;
  switchVariantCount: number;
  switchVariant: string;
  vpfListFilter: string;
  customize: VisboSetting;

  pageParams = new VPFParams();
  isGlobalChecked = false;

  hasOrga = false;
  vcOrga: VisboOrganisation[];

  combinedPerm: VGPermission = undefined; // Combined permission object controlling access rights.
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
    // Sets initial values like language, user, and page title.
    this.currentLang = this.translate.currentLang;
    this.user = this.authenticationService.getActiveUser();
    this.titleService.setTitle(this.translate.instant('vpfCmp.title'));
    this.log(`Init VPF Campare with Transaltion: ${this.translate.instant('vpfCmp.title')}`);

    localStorage.removeItem('vpfFilter');
    // Parses route query parameters to determine selected versions and reference dates.
    const refDate = this.route.snapshot.queryParams['refDate'];
    const refDateCmp = this.route.snapshot.queryParams['refDateCmp'];
    const nextView = this.route.snapshot.queryParams['view'] || 'KeyMetrics';
    const vpfid = this.route.snapshot.queryParams['vpfid'] || undefined;
    const vpfidCmp = this.route.snapshot.queryParams['vpfidCmp'] || vpfid;
    const filter = this.route.snapshot.queryParams['filter'] || null;
    this.vpvRefDate[0] = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.changeView(0, nextView, refDate ? this.vpvRefDate[0] : undefined, filter, vpfid, false);
    this.vpvRefDate[1] = Date.parse(refDateCmp) > 0 ? new Date(refDateCmp) : new Date();
    this.changeView(1, nextView, refDate ? this.vpvRefDate[1] : undefined, filter, vpfidCmp, false);

    // Loads project and portfolio version data.
    this.getVisboProject();
  }
  // Permission Check for vp
  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm?.vp & perm) > 0;
  }
  // Permission Check for vc
  hasVCPerm(perm: number): boolean {
    let result = false;
    if ((this.combinedPerm?.vc & perm) > 0) {
      result = true;
    }
    return result;
  }
  // Loads active portfolio by ID.
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
          // Loads all versions of the active portfolio.
          this.getVisboPortfolioVersions();
          // Loads organization data related to the portfolio.
          this.getVisboCenterOrga();
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

  // Loads organization data related to the portfolio.
  getVisboCenterOrga(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      if (this.vcOrga == undefined || this.vcOrga.length > 0) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vpActive.vcid}`);
        this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, (new Date()).toISOString(), false, false)
          .subscribe(
            organisation => {
              this.vcOrga = organisation;
              this.hasOrga = organisation.length > 0;
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

  getVPF(vpfid: string): VisboPortfolioVersion {
    let index = 0;
    if (vpfid ) {
      index = this.listVPF.findIndex(item => item._id.toString() === vpfid);
      if (index < 0) { index = 0; }
    }
    return this.listVPF[index];
  }

  // Loads all versions of the active portfolio.
  getVisboPortfolioVersions(): void {
    this.log(`get Portfolio Versions ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
    this.visboprojectversionService.getVisboPortfolioVersions(this.vpActive._id, this.deleted)
      .subscribe(
        listVPF => {
          listVPF.sort((a, b) => visboCmpDate(b.timestamp, a.timestamp))
          this.listVPF = listVPF;
          if (listVPF.length > 0) {
            // this.combinedPerm = listVPF[0].perm;
            this.vpfActive = [];
            this.vpfActive[0] = this.getVPF(this.pageParams.vpfid);
            this.vpfActive[1] = this.getVPF(this.pageParams.vpfidCmp);
            this.dropDownVariantInit();
            this.getVisboPortfolioKeyMetrics(0);
            this.getVisboPortfolioKeyMetrics(1);
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
  // Refreshes the view data.
  refreshListVPV(version: number, listVPV: VisboProjectVersion[]): void {
    // recreate list, to get refresh in child component
    const indexUnchanged = version ? 0 : 1;
    const listUnchanged = this.listVPV[indexUnchanged];
    const list: VisboProjectVersion[][] = [];
    list[indexUnchanged] = listUnchanged;
    list[version] = listVPV;
    this.listVPV = list;
  }

  // Loads key metrics for a version.
  getVisboPortfolioKeyMetrics(version: number): void {
    this.log(`get VPF keyMetrics ${this.vpfActive[version].name} ${this.vpfActive[version]._id}`);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive[version]._id, this.vpvRefDate[version], false, false, this.vpActive.vcid)
      .subscribe(
        list => {
          this.refreshListVPV(version, list);
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
  // Filters project versions based on the portfolio version items.
  calcVPVList(version: number): void {
    if (!this.listVPV[version] || !this.vpfActive[version] || !this.vpfActive[version].allItems) {
      return;
    }
    this.listVPV[version].forEach(vpv => {
        vpv.vp = this.listVP.find(vp => vp._id == vpv.vpid);
    });
    const indexUnchanged = version ? 0 : 1;
    const listCalcVPV: VisboProjectVersion[][] = [];
    listCalcVPV[indexUnchanged] = this.listCalcVPV[indexUnchanged]
    listCalcVPV[version] = [];
    for (let i = 0; i < this.vpfActive[version].allItems.length; i++) {
      const item = this.vpfActive[version].allItems[i];
      const nextVPV = this.listVPV[version].find(vpvItem => vpvItem.vpid === item.vpid);
      if (nextVPV) {
        listCalcVPV[version].push(nextVPV);
      }
    }
    this.listCalcVPV = listCalcVPV;
  }

  // Navigate to project detail view.
  gotoVPDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  // Navigate to portfolio version.
  gotoVP(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto VP ${visboproject._id}`);
    this.router.navigate(['vpf/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  // Navigate to portfolio version detail.
  gotoVPF(index: number): void {
    const item = this.vpfActive[index];
    if (!item) { return; }
    this.log(`goto VPF ${item.vpid}`);

    const queryParams = new VPFParams();
    const refDate = this.vpvRefDate[index];
    if (refDate && !visboIsToday(refDate)) {
      queryParams.refDate = refDate.toISOString();
    }
    queryParams.vpfid = item._id;
    this.router.navigate(['vpf/'.concat(item.vpid)],
      { queryParams: queryParams,
        // preserve the existing query params in the route
        queryParamsHandling: 'merge'
      }
    );
  }
  // Navigate to the center view.
  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }
  // Checks if a variant is active.
  checkVPFActive(item: DropDown, version: number): boolean {
    let result = false;
    if (this.vpfActive[version]
    && item.variantName == this.vpfActive[version].variantName) {
      result = true;
    }
    return result;
  }

  switchVariantByName(name: string, version: number): void {
      let index = -1;
      if (this.listVPFVariant) {
        index = this.listVPFVariant.findIndex(item => item.variantName == name);
      }
      this.activeVPFVariant[version]= index >= 0 ? this.listVPFVariant[index] : undefined;
  }
  // Switches active portfolio version by variant name.
  switchPFVersion(variantName: string, version: number): void {
    this.log(`Change Drop Down ${variantName}`);
    const vpf = this.listVPF.find(vpf => vpf.variantName == variantName);
    if (vpf) {
      this.vpfActive[version] = vpf;
      this.switchVariantByName(this.vpfActive[version].variantName, version);
      this.vpvRefDate[version] = new Date(vpf.timestamp)
      this.changeView(version, undefined, this.vpvRefDate[version], undefined, undefined)
      this.getVisboPortfolioKeyMetrics(version);

      // MS TODO: do we have to reset the refDate???
      this.changeView(version, undefined, undefined, undefined, this.vpfActive[version]._id)
    } else {
      this.vpfActive[version] = undefined;
      this.refreshListVPV(version, undefined);
    }
  }
  // Initializes dropdown list for variant selection.
  dropDownVariantInit(): void {
    this.log(`Init Variant Drop Down List ${this.vpActive.variant.length}`);
    const listVariant: DropDown[] = [];

    this.vpActive.variant.forEach(item => {
      let longDescription = item.description || '';
      if (item.email) {
        longDescription = longDescription.concat(' (', item.email, ')');
      }
      if (item.variantName != 'pfv') {
        listVariant.push({name: item.variantName, variantName: item.variantName, description: item.description, longDescription: longDescription, version: item.vpfCount, timestamp: undefined, email: undefined });
      }
    });
    listVariant.sort(function (a, b) { return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    listVariant.unshift({name: this.translate.instant('vpfCmp.lbl.defaultVariant'), variantName: '', version: this.vpActive.vpfCount, timestamp: undefined, email: undefined });
    let index = 0;
    if (this.vpfActive[0].variantName) {
      const i = listVariant.findIndex(item => item.name === this.vpfActive[0].variantName);
      if (i >= 0) {
          index = i;
      }
    }
    this.activeVPFVariant[0] = listVariant[index];
    if (this.vpfActive[1].variantName) {
      const i = listVariant.findIndex(item => item.name === this.vpfActive[1].variantName);
      if (i >= 0) {
          index = i;
      }
    }
    this.activeVPFVariant[1] = listVariant[index];
    this.listVPFVariant = listVariant;
  }

  getVariantList(withVersions: boolean): DropDown[] {
    let result: DropDown[];
    if (withVersions) {
      result = this.listVPFVariant.filter(item => item.version > 0);
    } else {
      result = this.listVPFVariant;
    }
    return result;
  }
  //  Updates internal state and optionally the URL with new parameters.
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
    this.update = new Date();
    if (refreshPage) { this.updateUrlParam(); }
  }
  // Updates the browser URL with current query params.
  updateUrlParam(): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    const queryParams = new VPFParams();
    queryParams.filter = this.pageParams.filter || null;
    queryParams.vpfid = this.pageParams.vpfid || null;
    queryParams.vpfidCmp = this.pageParams.vpfidCmp || null;
    queryParams.refDate = this.pageParams.refDate || null;
    queryParams.refDateCmp = this.pageParams.refDateCmp || null;
    queryParams.roleID = this.pageParams.roleID || null;
    queryParams.unit = this.pageParams.unit || null;
    queryParams.view = this.pageParams.view || null;
    queryParams.drillDown = this.pageParams.drillDown || null;
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }
  // Returns a readable name for a variant.
  displayVariantName(variant: DropDown): string {
    let result = this.translate.instant('vpfCmp.lbl.defaultVariant');
    if (variant?.variantName) {
      result = variant.name;
    }
    return result
  }
  // Refreshes metrics based on new reference date.
  updateDateRange(version: number): void {
    this.changeView(version, undefined, this.vpvRefDate[version], undefined, undefined)
    this.getVisboPortfolioKeyMetrics(version);
  }
  // Parses a string into a date.
  parseDate(dateString: string): Date {
    return dateString ? new Date(dateString) : new Date();
  }
  // Checks if version lists are populated.
  hasListVPV(): boolean {
    if (!this.listVPV || !this.listVPV[0] || !this.listVPV[1]) return false;
    if ( this.listVPV[0].length == 0 && this.listVPV[1].length == 0) return false;
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
