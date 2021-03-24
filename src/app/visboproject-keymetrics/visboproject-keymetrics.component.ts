import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboProject, VPParams, constSystemCustomName } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVKeyMetrics } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboUser } from '../_models/visbouser';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText, visboIsToday, getPreView } from '../_helpers/visbo.helper';

class DropDown {
  name: string;
  variantName: string;
  vpvCount?: number;
  description?: string;
  email?: string;
}

@Component({
  selector: 'app-visboproject-keymetrics',
  templateUrl: './visboproject-keymetrics.component.html'
})
export class VisboProjectKeyMetricsComponent implements OnInit, OnChanges {

  visboprojectversions: VisboProjectVersion[];

  currentUser: VisboUser;
  dropDown: DropDown[] = [];          // variants that have versions except pfv
  dropDownAll: DropDown[] = [];       // all variants including standard where the user can modify
  newVPVdropDown: DropDown[];         // variants to create a new Version
  dropDownIndex: number;

  vpSelected: string;
  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  vpvBaseline: VisboProjectVersion;
  variantID: string;
  variantName: string;
  deleted = false;
  defaultVariant: string;
  pfvVariant: string;

  newVPV: VisboProjectVersion;
  newVPVstartDate: Date;
  newVPVendDate: Date;
  newVPVscaleStartDate: Date;
  scaleCheckBox: boolean;
  scaleFactor: number;
  changeStatus: boolean;
  newVPVvariantName: string;
  newVPVdropDownIndex: number;

  currentView = 'KeyMetrics';
  currentViewKM = false;
  refDate = new Date();
  refDateInterval = 'month';
  statusDirection: number;

  allViews = ['KeyMetrics', 'Capacity', 'Cost', 'Deadline', 'Delivery', 'All'];
  delayEndDate: number;
  hasOrga = false;

  currentLang: string;

  sortAscending = false;
  sortColumn = 1;

  combinedPerm: VGPermission;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.variantID = this.route.snapshot.queryParams['variantID'];
    this.variantName = this.route.snapshot.queryParams['variantName'];
    this.defaultVariant = this.translate.instant('vpKeyMetric.lbl.defaultVariant');
    this.pfvVariant = this.translate.instant('vpKeyMetric.lbl.pfvVariant');
    let view = this.route.snapshot.queryParams['view'];
    if (!view) {
      const baseUrl = this.route.snapshot.url[0]
      switch (baseUrl.toString()) {
        case 'vpViewCost': view = 'Cost'; break;
        case 'vpViewDeadlines': view = 'Deadline'; break;
        case 'vpViewDeliveries': view = 'Delivery'; break;
        case 'vpView': view = 'All'; break;
      }
    }
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (this.allViews.find(item => item === view)) {
      this.currentView = view;
    }

    if (this.route.snapshot.queryParams.refDate) {
      this.refDate = new Date(this.route.snapshot.queryParams.refDate);
    }

    this.getVisboProjectVersions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`VP KeyMetrics Changes ${JSON.stringify(changes)}`);
    this.findVPV(new Date(this.refDate));
  }

  switchViewParent(newParam: VPParams): void {
    if (!newParam) return;
    if (newParam.refDate) {
      this.findVPV(new Date(newParam.refDate));
    }
    if (newParam.view) {
      this.currentView = newParam.view;
    }
    if (newParam.viewKM) {
      this.currentView = newParam.viewKM;
      this.currentViewKM = true;
    }
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  getVariantInfo(item: DropDown, owner = true): string {
      let result: string[] = []
      if (item.description) { result.push(item.description); }
      if (item.variantName != this.defaultVariant) {
        result.push('(' + item.email + ')');
      }
      return result.join(' ');
  }

  dropDownInit(): void {
    let dropDown: DropDown[] = []
    if (this.variantID) {
      // serach for the variant Name
      const index = this.vpActive.variant.findIndex(item => item._id.toString() === this.variantID);
      if (index >= 0) {
        this.variantName = this.vpActive.variant[index].variantName;
      } else {
        this.variantID = undefined;
      }
    } else if (this.variantName) {
      const index = this.vpActive.variant.findIndex(item => item.variantName === this.variantName);
      if (index >= 0) {
        this.variantName = this.vpActive.variant[index].variantName;
        this.variantID = this.vpActive.variant[index]._id;
      } else {
        this.variantName = undefined;
      }
    }
    this.log(`Init Drop Down List ${this.vpActive.variant.length + 1} Variant ${this.variantID}/${this.variantName}`);
    this.dropDownIndex = undefined;
    const len = this.vpActive.variant.length;

    for (let i = 0; i < len; i++) {
      let name = this.vpActive.variant[i].variantName;
      if (name == 'pfv') {
        name = this.pfvVariant;
      }
      dropDown.push(
        {
          name: name,
          variantName: this.vpActive.variant[i].variantName,
          vpvCount: this.vpActive.variant[i].vpvCount,
          description: this.vpActive.variant[i].description,
          email: this.vpActive.variant[i].email
        }
      );
    }
    this.dropDownAll = dropDown.filter(item => item.name != ''); // make a copy
    this.dropDownAll.splice(0, 0,
      {name: this.defaultVariant, variantName: '', vpvCount: this.vpActive.vpvCount}
    );

    this.dropDown = dropDown.filter(item => item.variantName != 'pfv' && item.vpvCount > 0);
    let email: string;
    if (this.isPMO()) {
      email = undefined;
    } else if (this.hasVPPerm(this.permVP.Modify)) {
      email = '';
    } else if (this.hasVPPerm(this.permVP.CreateVariant)) {
      email = this.currentUser?.email;
      this.dropDownAll = this.dropDownAll.filter(item => item.email === email); // filter only variants that the user can modify
    } else {
      email = ' UNKNOWN ';
      this.dropDown = [];
    }
    if (email || email == '') {
      this.newVPVdropDown = dropDown.filter(item => item.variantName != 'pfv' && (email == '' || item.email == email));
      this.newVPVdropDown.splice(0, 0,
        {name: this.defaultVariant, variantName: '', vpvCount: this.vpActive.vpvCount}
      );
    } else {
      this.newVPVdropDown = dropDown;
    }
    if (this.newVPVdropDown.length > 0) {
      this.newVPVdropDown.splice(0, 0,
        {name: this.defaultVariant, variantName: '', vpvCount: this.vpActive.vpvCount}
      );
      this.newVPVdropDownIndex = 0;
    }
    if (this.dropDown.length > 0 ) {
      this.dropDown.splice(0, 0,
        {name: this.defaultVariant, variantName: '', vpvCount: this.vpActive.vpvCount}
      );
      this.dropDownIndex = 0;
    }
    if (this.variantName) {
      this.dropDownIndex = this.dropDown.findIndex(item => item.variantName === this.variantName);
    }
  }

  findVPV(refDate: Date): void {
    if (this.visboprojectversions.length > 0) {
      let i = 0;
      // search the coresponding version for refDate
      if (refDate) {
        for (; i < this.visboprojectversions.length; i++) {
          if (refDate.toISOString() >= (new Date(this.visboprojectversions[i].timestamp)).toISOString() ) {
            break;
          }
        }
        if (i >= this.visboprojectversions.length) { i = this.visboprojectversions.length - 1; }
      }
      this.vpvActive = this.visboprojectversions[i];
      this.evaluateDirection(i);
    }
  }

  evaluateDirection(index: number): void {
    if (this.visboprojectversions.length === 1) {
      this.statusDirection = undefined;
    } else if (index <= 0) {
      this.statusDirection = 1;
    } else if (index >= this.visboprojectversions.length - 1) {
      this.statusDirection = -1;
    } else {
      this.statusDirection = 0;
    }
  }

  switchView(newView: string, withKM = false): void {
    newView = this.allViews.find(item => item === newView);
    if (!newView) { newView = this.allViews[0]; }
    this.currentView = newView;
    this.currentViewKM  = withKM;
    this.updateUrlParam('view', newView);
  }

  switchVariant(name: string): void {
    const i = this.dropDown.findIndex(item => item.variantName === name);
    if (i <= 0) {
      // not found or the main variant
      this.dropDownIndex = undefined;
    } else {
      // Found
      this.dropDownIndex = i;
    }
    this.log(`switch Variant ${name} index ${this.dropDownIndex}`);

    if (this.dropDownIndex >= 0) {
      const variant = this.vpActive.variant.find(item => item.variantName == name);
      if (variant) {
        this.variantName = variant.variantName;
        this.variantID = variant._id;
      } else {
        this.variantName = undefined;
        this.variantID = undefined;
      }
      this.updateUrlParam('variantID', variant && variant._id);
    } else {
      this.variantName = undefined;
      this.variantID = undefined;
      this.updateUrlParam('variantID', null);
    }
    // fetch the project with Variant
    this.getVisboProjectVersions();
    return;
  }

  isActiveVariant(variantName: string): boolean {
    let result = false;
    if (this.variantName == undefined && variantName == this.defaultVariant) { result = true; }
    if (this.variantName === variantName) { result = true; }
    return result;
  }

  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPParams();
    if (type == 'variantID') {
      queryParams.variantID = value;
      queryParams.variantName = null;
    } else if (type == 'refDate') {
      queryParams.refDate = value;
    } else if (type == 'view') {
      queryParams.view = value;
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  hasKM(km: VPVKeyMetrics, type: string): boolean {
    let result = false;
    if (!km) {
      return true;
    }
    if (type == 'Cost') {
      result = km.costCurrentTotal > 0 || km.costBaseLastTotal > 0;
    } else if (type == 'Deadline') {
      result = km.timeCompletionCurrentTotal > 1 || km.timeCompletionBaseLastTotal > 1;
    } else if (type == 'EndDate') {
      result = km.endDateCurrent != undefined || km.endDateBaseLast != undefined;
    } else if (type === 'DeadlineDelay') {
      if (km.timeCompletionCurrentTotal > 1 || km.timeCompletionBaseLastTotal > 1) {
        result = km.timeDelayFinished !== undefined && km.timeDelayUnFinished !== undefined;
      }
    } else if (type == 'Delivery') {
      result = km.deliverableCompletionCurrentTotal > 0 || km.deliverableCompletionBaseLastTotal > 0;
    } else if (type === 'DeliveryDelay') {
      result = km.timeDelayFinished !== undefined && km.timeDelayUnFinished !== undefined;
    }
    return result;
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vpSelected = id;

    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.translateCustomFields(this.vpActive);
            this.combinedPerm = visboproject.perm;
            this.titleService.setTitle(this.translate.instant('vpKeyMetric.titleName', {name: visboproject.name}));
            this.dropDownInit();
            if (this.vpActive?._id !== visboproject._id) {
              this.getVisboCenterOrga();
            }
            const variantName = this.dropDownIndex > 0 ? this.dropDown[this.dropDownIndex].variantName : '';
            let variantID = '';
            if (variantName) {
              const variant = this.vpActive.variant.find(item => item.variantName === variantName);
              variantID = variant ? variant._id.toString() : '';
            }
            this.log(`get VP name if ID is used ${this.vpActive.name} Variant: ${variantName}/${variantID} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, variantID, true)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.visboprojectversions.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
                  this.log(`get VPV Key metrics: Get ${visboprojectversions.length} Project Versions`);
                  this.findVPV(this.refDate);
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                    this.alertService.error(message);
                  } else {
                    this.alertService.error(getErrorMessage(error));
                  }
                }
              );
          },
          error => {
            this.log(`get VPV VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    } else {
      this.gotoRoot();
    }
  }

  translateCustomFields(vp: VisboProject): void {
    if (vp?.customFieldString) {
      vp.customFieldString.forEach(item => {
        if (constSystemCustomName.find(element => element == item.name)) {
          item.localName = this.translate.instant('customField.' + item.name);
        } else {
          item.localName = item.name;
        }
      })
    }
  }

  sameDay(dateA: Date, dateB: Date): boolean {
    const localA = new Date(dateA);
    const localB = new Date(dateB);
    localA.setHours(0, 0, 0, 0);
    localB.setHours(0, 0, 0, 0);
    // return false;
    return localA.getTime() === localB.getTime();
  }

  getRefDateVersions(increment: number): void {
    this.log(`get getRefDateVersions current ${this.refDate} ${increment} ${this.refDateInterval}`);
    const newRefDate = new Date(this.refDate);
    let i = 0;
    let quarter = 0;
    switch (this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        if (increment > 0 || newRefDate.getTime() === this.refDate.getTime()) {
          newRefDate.setDate(newRefDate.getDate() + increment);
        }
        break;
      case 'week':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        newRefDate.setDate(newRefDate.getDate() + increment * 7);
        break;
      case 'month':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        newRefDate.setDate(1);
        if (increment > 0 || newRefDate.getTime() === this.refDate.getTime()) {
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
        if (newRefDate.getTime() === this.refDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3);
        }
        break;
    }
    this.log(`get getRefDateVersions new ${newRefDate.toISOString()} ${this.refDate.toISOString()}`);
    this.refDate = newRefDate;
    let newVersionIndex;
    if (increment > 0) {
      const refDate = new Date(this.visboprojectversions[0].timestamp);
      if (newRefDate.getTime() >= refDate.getTime()) {
        newVersionIndex = 0;
        this.refDate = new Date();
      }
    } else {
      const refDate = new Date(this.visboprojectversions[this.visboprojectversions.length - 1].timestamp);
      if (newRefDate.getTime() <= refDate.getTime()) {
        newVersionIndex = this.visboprojectversions.length - 1;
        this.refDate.setTime(refDate.getTime());
      }
    }
    if (newVersionIndex === undefined) {
      this.log(`get getRefDateVersions normalised ${(new Date(newRefDate)).toISOString()}`);
      for (i = 0; i < this.visboprojectversions.length; i++) {
        const cmpDate = new Date(this.visboprojectversions[i].timestamp);
        // this.log(`Compare Date ${cmpDate.toISOString()} ${newRefDate.toISOString()}`);
        if (cmpDate.getTime() <= newRefDate.getTime()) {
          break;
        }
      }
      newVersionIndex = i;
    }
    this.log(`get getRefDateVersions vpv timestamp ${this.visboprojectversions[newVersionIndex].timestamp}`);
    this.setVpvActive(this.visboprojectversions[newVersionIndex]);
    this.evaluateDirection(newVersionIndex);
  }

  getNextVersion(direction: number): void {
    this.getRefDateVersions(direction);
    if (visboIsToday(this.refDate)) {
      this.updateUrlParam('refDate', undefined);
    } else {
      this.updateUrlParam('refDate', this.refDate.toISOString());
    }
  }

  gotoRoot(): void {
    this.log(`goto Root as no id is specified`);
    this.router.navigate(['/'], {});
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
              const message = this.translate.instant('vpKeyMetric.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }

  setVpvActive(vpv: VisboProjectVersion): void {
    const keyMetrics = vpv.keyMetrics;
    let delay = 0;
    if (keyMetrics && keyMetrics.endDateCurrent && keyMetrics.endDateBaseLast) {
      delay = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    }
    this.delayEndDate = Math.round(delay / 1000 / 60 / 60 / 24) / 7;

    this.vpvActive = vpv;
    this.log(`VPV Active: vpv: ${vpv._id} ${vpv.timestamp}`);
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVPKeyMetric(vp: VisboProject): void {
    const queryParams = new VPParams();
    if (this.vpvActive?.variantName) {
      const variant = vp.variant.find(variant => variant.variantName == this.vpvActive.variantName);
      if (variant) {
        queryParams.variantID = variant._id;
      }
      queryParams.refDate = (new Date()).toISOString();
    }

    this.router.navigate(['vpKeyMetrics/'.concat(vp._id)], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true
    });
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  helperDateDiff(from: string, to: string, unit: string): number {
    const fromDate: Date = new Date(from);
    const toDate: Date = new Date(to);
    let dateDiff: number = fromDate.getTime() - toDate.getTime();
    if (unit === 'w') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24 / 7;
    } else if (unit === 'd') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24;
    } else {
      dateDiff = dateDiff / 1000;
    }
    return dateDiff;
  }

  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  isPMO(): boolean {
    let result = false;
    if (this.hasVCPerm(this.permVC.Modify) && this.hasVPPerm(this.permVP.Modify)) {
      result = true;
    }
    this.log(`is PMO ${result}`);
    return result;
  }

  canModify(): boolean {
    if (this.statusDirection != undefined && this.statusDirection != 1) {
      // not the latest version
      return false;
    }
    if (this.hasVPPerm(this.permVP.Modify)) {
      return true;
    } else if (this.hasVPPerm(this.permVP.CreateVariant)) {
      // check if user can copy to a variant
      if (this.dropDownAll.find(variant => variant.variantName == this.vpvActive.variantName)) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  }

  canModifyDate(mode: string): boolean {
    let result = true;
    if (!this.newVPV) {
      return false;
    }
    const beginMonth = new Date();
    beginMonth.setDate(1);
    beginMonth.setHours(0, 0, 0, 0);
    const startDate = new Date(this.newVPV.startDate);
    const endDate = new Date(this.newVPV.endDate);
    const actualDataUntil = this.newVPV.actualDataUntil ? new Date(this.newVPV.actualDataUntil) : undefined;
    if (mode == 'startDate') {
      if (actualDataUntil && startDate.getTime() < actualDataUntil.getTime()) {
        result = false;
      } else if (startDate.getTime() < beginMonth.getTime()) {
        result = false;
      }
    } else if (mode == 'endDate') {
      if (endDate.getTime() < beginMonth.getTime()) {
        result = false;
      }
    }
    return result && false;
  }

  getScaleDate(mode: string): Date {
    let result: Date;
    if (mode == 'Min' && this.newVPV) {
      if (this.vpvActive.actualDataUntil) {
        result = new Date(this.newVPV.actualDataUntil);
      } else {
        result = new Date(this.newVPV.startDate);
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
      }
    } else if (mode == 'Max' && this.newVPV) {
      result = new Date(this.newVPV.endDate);
      result.setDate(1);
      result.setMonth(result.getMonth() + 1)
      result.setHours(0, 0, 0, 0);
    } else {
      result = new Date();
    }
    return result;
  }

  initNewVPV(mode: string): void {
    this.newVPV = undefined;
    if (!this.vpvActive) {
      return;
    }
    this.changeStatus = false;
    if (mode == 'Move') {
      if (this.isPMO() && this.vpvActive.variantName == "" && this.vpvActive.keyMetrics) {
        let variantID: string = undefined;
        if (this.vpActive && this.vpActive.variant) {
          const variant = this.vpActive.variant.find(item => item.variantName = 'pfv');
          if (variant) {
            variantID = variant._id;
          }
        }
        this.visboprojectversionService.getVisboProjectVersions(this.vpvActive.vpid, false, variantID, true)
          .subscribe(
            vpv => {
              vpv.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
              if (vpv.length > 0) {
                this.newVPV = vpv[0];
                this.newVPV.actualDataUntil = this.vpvActive.actualDataUntil;
                this.newVPVstartDate = new Date(this.newVPV.startDate);
                this.newVPVendDate = new Date(this.newVPV.endDate);
                this.newVPVvariantName = 'pfv';
              }
            },
            error => {
              this.log(`get VPFs failed: error: ${error.status} message: ${error.error.message}`);
              if (error.status === 403) {
                const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                this.alertService.error(message);
              } else {
                this.alertService.error(getErrorMessage(error));
              }
            }
          );
      } else {
        this.newVPV = this.vpvActive;
        this.newVPVstartDate = new Date(this.newVPV.startDate);
        this.newVPVendDate = new Date(this.newVPV.endDate);
        this.newVPVvariantName = this.vpvActive.variantName;
      }
      this.newVPVscaleStartDate = new Date();
      this.newVPVscaleStartDate.setDate(1);
      this.newVPVscaleStartDate.setHours(0, 0, 0, 0);
      this.scaleCheckBox = false;
      this.scaleFactor = 0;
    } else if (mode == 'Copy') {
      this.newVPV = this.vpvActive;
      this.newVPVvariantName = this.vpvActive.variantName;
    }
  }

  moveVPV(): void {
    if (!this.newVPV) {
      return;
    }
    this.log(`Move VPV ${this.newVPV.name}/${this.newVPV.variantName}/${this.newVPV._id} to new start ${this.newVPVstartDate.toISOString()} end ${this.newVPVendDate.toISOString()}`);
    const startDate = new Date(this.newVPV.startDate);
    const endDate = new Date(this.newVPV.endDate);
    let scaleFactor = 1;
    let newVPVscaleStartDate: Date;
    if (this.scaleCheckBox) {
        if (this.newVPVscaleStartDate) { newVPVscaleStartDate = this.newVPVscaleStartDate; }
        if (this.scaleFactor) { scaleFactor = 1 + this.scaleFactor / 100; }
    }

    if (startDate.toISOString() !== this.newVPVstartDate.toISOString()
    || endDate.toISOString() !== this.newVPVendDate.toISOString()
    || scaleFactor !== 1) {
      this.log(`Execute Move VPV ${this.newVPV.name} from old  start ${startDate.toISOString()} end ${endDate.toISOString()} to new start ${this.newVPVstartDate.toISOString()} end ${this.newVPVendDate.toISOString()} scale ${scaleFactor} from ${newVPVscaleStartDate?.toISOString()}`);
      this.visboprojectversionService.changeVisboProjectVersion(this.newVPV._id, this.newVPVstartDate, this.newVPVendDate, scaleFactor, newVPVscaleStartDate)
        .subscribe(
          vpv => {
            if (vpv.variantName != 'pfv') {
              this.visboprojectversions.splice(0, 0, vpv);
              this.updateVPVCount(this.vpActive, vpv.variantName, 1);
              this.setVpvActive(vpv);
              this.evaluateDirection(0);
              const message = this.translate.instant('vpKeyMetric.msg.changeVPVSuccess', {'variantName': vpv.variantName});
              this.alertService.success(message, true);
            } else {
              // make a copy of the vpvActive to reflect the changed pfv in KeyMetrics
              this.updateVPVCount(this.vpActive, vpv.variantName, 1);
              this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.vpvActive.variantName)
                .subscribe(
                  vpv => {
                    const message = this.translate.instant('vpKeyMetric.msg.changePFVSuccess');
                    this.alertService.success(message, true);
                    this.updateVPVCount(this.vpActive, vpv.variantName, 1);
                    this.visboprojectversions.splice(0, 0, vpv);
                    this.setVpvActive(vpv);
                    this.evaluateDirection(0);
                  },
                  error => {
                    this.log(`copy VPV failed: error: ${error.status} message: ${error.error.message}`);
                    if (error.status === 403) {
                      const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                      this.alertService.error(message);
                    } else {
                      this.alertService.error(getErrorMessage(error));
                    }
                  }
                );
            }
          },
          error => {
            this.log(`change VPV failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  copyVPV(): void {
    this.log(`Copye VPV ${this.vpvActive.name} with ${this.vpvActive.variantName} to ${this.newVPVvariantName}`);
    this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.newVPVvariantName)
      .subscribe(
        vpv => {
          if (vpv.variantName != 'pfv') {
            const message = this.translate.instant('vpKeyMetric.msg.changeVPVSuccess', {'variantName': vpv.variantName});
            this.alertService.success(message, true);
            this.updateVPVCount(this.vpActive, vpv.variantName, 1);
            // MS TODO: Navigate to the copied variant

          } else {
            // make a copy of the vpvActive to reflect the changed pfv in KeyMetrics
            this.updateVPVCount(this.vpActive, vpv.variantName, 1);
            this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.vpvActive.variantName)
              .subscribe(
                vpv => {
                  const message = this.translate.instant('vpKeyMetric.msg.changePFVSuccess');
                  this.alertService.success(message, true);
                  this.updateVPVCount(this.vpActive, vpv.variantName, 1);
                  this.visboprojectversions.splice(0, 0, vpv);
                  this.setVpvActive(vpv);
                  this.evaluateDirection(0);
                },
                error => {
                  this.log(`copy VPV failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                    this.alertService.error(message);
                  } else {
                    this.alertService.error(getErrorMessage(error));
                  }
                }
              );
          }
        },
        error => {
          this.log(`change VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  updateVPVCount(vp: VisboProject, variantName: string, count: number): void {
    if (vp) {
      if (variantName) {
        const variant = vp.variant.find(item => item.variantName === variantName );
        if (variant) {
          variant.vpvCount += (count || 0);
        }
      } else {
        vp.vpvCount += (count || 0);
      }
      this.dropDownInit();
    }
  }

  hasVariantChange(): boolean {
    return this.vpvActive?.variantName != this.newVPVvariantName;
  }

  switchCopyVariant(index: number): void {
    this.newVPVdropDownIndex = index;
    this.newVPVvariantName = this.newVPVdropDown[index].variantName;
  }

  updateScaleFactor(): void {
    if (this.scaleFactor != 0) {
      this.changeStatus = true;
    }
  }

  getVariantName(variantName: string): string {
    const variant = this.dropDownAll.find(item => item.variantName == variantName);
    return variant ? variant.name : '';
  }

  updateDateRange(): void {
    // this.log(`Update Date Range ${this.newVPVstartDate} ${this.newVPVendDate}`);
    let result = true;
    if (!this.newVPV || !this.newVPV.startDate) {
      this.log(`no VPV Active`);
      result = false;
    } else if (!this.newVPVstartDate || !this.newVPVendDate) {
      this.log(`Dates Empty ${this.newVPVstartDate} ${this.newVPVendDate}`);
      result = false;
    } else if (this.newVPVstartDate.getTime() >= this.newVPVendDate.getTime()) {
      this.log(`Dates start later end ${this.newVPVstartDate} ${this.newVPVendDate}`);
      result = false;
    } else if (this.newVPVstartDate.toISOString() == (new Date(this.newVPV.startDate)).toISOString()) {
      // no change regarding start, verify if end Date has changed
      if (this.newVPVendDate.toISOString() == (new Date(this.newVPV.endDate)).toISOString()) {
        result = false;
      }
    }
    this.changeStatus = result;
  }

  parseDate(dateString: string): Date {
     if (dateString) {
       const actDate = new Date(dateString);
       actDate.setHours(0, 0, 0, 0);
       return actDate;
    }
    return null;
  }

  sortVPVTable(n?: number): void {
    if (!this.visboprojectversions) {
      return;
    }
    if (n !== undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n === 5 ) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    } else {
      this.sortColumn = 1;
      this.sortAscending = false;
    }
    if (this.sortColumn === 1) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortColumn === 2) {
      this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.endDate, b.endDate); });
    } else if (this.sortColumn === 3) {
      this.visboprojectversions.sort(function(a, b) { return a.ampelStatus - b.ampelStatus; });
    } else if (this.sortColumn === 4) {
      this.visboprojectversions.sort(function(a, b) { return a.Erloes - b.Erloes; });
    } else if (this.sortColumn === 5) {
      this.visboprojectversions.sort(function(a, b) {
        return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase());
      });
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectKeyMetrics: ' + message);
  }

}
