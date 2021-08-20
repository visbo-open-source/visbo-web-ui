import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboSetting } from '../_models/visbosetting';

import { VisboProject, VPParams, VPCustomString, VPCustomDouble, VPCustomDate, getCustomFieldString, addCustomFieldString, addCustomFieldDouble, getCustomFieldDouble, addCustomFieldDate, getCustomFieldDate,constSystemCustomName } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVKeyMetrics } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboUser } from '../_models/visbouser';
import { UserService } from '../_services/user.service';

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
  allVPVs: VisboProjectVersion[];

  currentUser: VisboUser;
  dropDown: DropDown[] = [];          // variants that have versions except pfv
  dropDownAll: DropDown[] = [];       // all variants including standard where the user can modify
  newVPVdropDown: DropDown[];         // variants to create a new Version
  dropDownIndex: number;
  vcCustomize: VisboSetting[];
  vcEnableDisable: VisboSetting[];
  vcOrga: VisboSetting[];

  vpSelected: string;
  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  vpvBaseline: VisboProjectVersion;
  vpvBaselineNewestTS: Date;
  variantID: string;
  variantName: string;
  deleted = false;
  defaultVariant: string;
  pfvVariant: string;
  predictURL: string;
  customPredict: string;
  calcPredict = false;

  customVPModified: boolean;
  customVPAdd: boolean;
  customBU: string;
  dropDownBU: string[];
  customStrategicFit: number;
  customRisk: number;
  customCommit: Date;
  editCustomFieldString: VPCustomString[];
  editCustomFieldDouble: VPCustomDouble[];
  editCustomFieldDate: VPCustomDate[];

  newVPV: VisboProjectVersion;
  newVPVstartDate: Date;
  newVPVendDate: Date;
  newVPVscaleStartDate: Date;
  scaleCheckBox: boolean;
  scaleFactor: number;
  changeStatus: boolean;
  newVPVvariantName: string;
  newVPVdropDownIndex: number;
  allVersions: boolean;

  currentView = 'KeyMetrics';
  currentViewKM = false;
  customVPToCommit = false;
  savingCostTotal = undefined;
  savingCostActual = undefined;
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
    private userService: UserService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private sanitizer: DomSanitizer,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.customVPToCommit = false;
    this.currentLang = this.translate.currentLang;
    this.variantID = this.route.snapshot.queryParams['variantID'];
    this.variantName = this.route.snapshot.queryParams['variantName'];
    this.defaultVariant = this.translate.instant('vpKeyMetric.lbl.defaultVariant');
    this.pfvVariant = this.translate.instant('vpKeyMetric.lbl.pfvVariant');
    this.calcPredict = this.route.snapshot.queryParams['calcPredict'] ? true : false;
    let view = this.route.snapshot.queryParams['view'];
    if (!view) {
      // map old / outdated URLs to common url
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

  getVariantInfo(item: DropDown): string {
      const result: string[] = []
      if (item.description) { result.push(item.description); }
      if (item.variantName != this.defaultVariant) {
        result.push('(' + item.email + ')');
      }
      return result.join(' ');
  }

  dropDownInit(): void {
    const dropDown: DropDown[] = []
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

  getDropDown(type: string): string {
    if (!(this.dropDownIndex >= 0 && this.dropDownIndex < this.dropDown.length)) {
      return '';
    }
    const variant = this.dropDown[this.dropDownIndex];
    if (type == 'description') {
      return variant.description;
    } else {
      if (variant.variantName == '') {
        return '';
      } else {
        return '(' + variant.variantName + ')';
      }
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
      this.setVpvActive(this.visboprojectversions[i]);
      this.findBaseLine(this.vpvActive);
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

  getPredictURL(ott: string): string {
    let url = 'visbo-predict://predict';
    let separator = '?';
    if (this.vpActive) {
        url = url.concat(separator, 'vpid:', this.vpActive._id.toString());
        separator = '&'
    }
    if (this.vpvActive) {
        url = url.concat(separator, 'vpvid:', this.vpvActive._id.toString());
        separator = '&'
    }
    if (ott) {
        url = url.concat(separator, 'ott:', ott);
        separator = '&'
    }
    console.log("URL:", url);
    return url;
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
    if (!km || Object.keys(km).length <= 1) {
      // in case of no keyMetric return true and try to show the values, might be they do not exist
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

  getAllVersionsShort(): void {
    if (this.vpActive) {
      this.visboprojectversionService.getVisboProjectVersions(this.vpActive._id, this.deleted, undefined, 0)
        .subscribe(
          vpv => {
            this.allVPVs = vpv;
            this.allVPVs.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
            this.vpvBaseline = this.allVPVs.find(item => item.variantName === 'pfv');
            if (this.vpvBaseline) {
              this.vpvBaselineNewestTS = new Date(this.vpvBaseline.timestamp);
            }
            this.log(`get VPV All Key metrics: Get ${vpv.length} Project Versions`);
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
    }
  }

  findBaseLine(vpv: VisboProjectVersion): VisboProjectVersion {
    let result: VisboProjectVersion;
    if (this.allVPVs && vpv) {
      result = this.allVPVs.find(item => item.variantName == 'pfv' && visboCmpDate(item.timestamp, vpv.timestamp) == -1)
    }
    this.vpvBaseline = result;
    return result;
  }

  checkBaselineVersion(vpv: VisboProjectVersion): boolean {
    let result = true;
    if (vpv && this.allVPVs) {
      const latestVPV = this.allVPVs.find(item => item.variantName == vpv.variantName)
      if (latestVPV?._id.toString() == vpv._id.toString()) {
        // check only the latest version if a newer PFV exists
        if (this.vpvBaseline
        && new Date(vpv.timestamp).getTime() < this.vpvBaselineNewestTS.getTime()){
            result = false
        }
      }
    }
    return result
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
            this.initCustomFields(this.vpActive);
            this.combinedPerm = visboproject.perm;
            this.titleService.setTitle(this.translate.instant('vpKeyMetric.titleName', {name: visboproject.name}));
            this.dropDownInit();
            this.getAllVersionsShort();
            this.getVisboCenterSettings();
            // would be better to get the orga and deliver it to the component.
            this.getVisboCenterOrga();

            const variantName = this.dropDownIndex > 0 ? this.dropDown[this.dropDownIndex].variantName : '';
            let variantID = '';
            if (variantName) {
              const variant = this.vpActive.variant.find(item => item.variantName === variantName);
              variantID = variant ? variant._id.toString() : '';
            }
            this.log(`get VP name if ID is used ${this.vpActive.name} Variant: ${variantName}/${variantID} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, variantID, this.calcPredict ? 2 : 1)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.visboprojectversions.forEach(vpv => {vpv.vp = this.vpActive;})
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
    if (vp?.customFieldDouble) {
      vp.customFieldDouble.forEach(item => {
        if (constSystemCustomName.find(element => element == item.name)) {
          item.localName = this.translate.instant('customField.' + item.name);
        } else {
          item.localName = item.name;
        }
      })
    }
  }

  initCustomFields(vp: VisboProject): void {
      const customFieldString = getCustomFieldString(vp, '_businessUnit');
      if (customFieldString) {
        this.customBU = customFieldString.value;
      }
      let customFieldDouble = getCustomFieldDouble(vp, '_strategicFit');
      if (customFieldDouble) {
        this.customStrategicFit = customFieldDouble.value;
      }
      customFieldDouble = getCustomFieldDouble(vp, '_risk');
      if (customFieldDouble) {
        this.customRisk = customFieldDouble.value;
      }
      const customFieldDate = getCustomFieldDate(vp, '_PMCommit');
      if (customFieldDate) {
        this.customCommit = new Date(customFieldDate.value);
      }
      this.editCustomFieldString = this.getCustomFieldListString(true);
      this.editCustomFieldDouble = this.getCustomFieldListDouble(true);
      this.editCustomFieldDate = this.getCustomFieldListDate(true);
      this.customVPModified = false;
      this.customVPAdd = false;
      this.customVPToCommit = false;
  }

  checkVPCustomValues(): boolean {
    let result = false;
    if (!this.customVPAdd && !this.customVPModified) {
      if (this.customBU == undefined || this.customStrategicFit == undefined || this.customRisk == undefined) {
          result = true;
      }
    }
    return result;
  }

  addVPCustomValues(): void {
    this.customVPAdd = true;
  }

  setModified(): void {
    this.customVPModified = true;
  }

  // Commit-Button pressed
  setVPToCommit(): void {
    this.customVPToCommit = true;
     // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
     this.savingCostTotal = Math.round((1 - (this.vpvActive.keyMetrics.costCurrentTotal || 0)
     / (this.vpvActive.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
     this.savingCostActual = Math.round((1 - (this.vpvActive.keyMetrics.costCurrentActual || 0)
     / (this.vpvActive.keyMetrics.costBaseLastActual || 1)) * 100) || 0;
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
      if (this.vcOrga == undefined
      || (this.vcOrga.length > 0 && this.vcOrga[0].vcid.toString() != this.vpActive.vcid.toString())) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vpActive.vcid}`);
        this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, (new Date()).toISOString(), true)
          .subscribe(
            vcsettings => {
              this.vcOrga = vcsettings;
              this.hasOrga = vcsettings.length > 0 && vcsettings[0] != null;
            },
            error => {
              if (error.status === 403) {
                const message = this.translate.instant('vpKeyMetric.msg.errorPermOrga', {name: this.vpActive.name});
                this.alertService.error(message);
              } else {
                this.alertService.error(getErrorMessage(error));
              }
          });
      }
    }
  }

  getVisboCenterSettings(): void {
    if (this.vpActive && (this.combinedPerm?.vc & this.permVC.View) > 0) {
      if (!this.vcCustomize
      || (this.vcCustomize[0] && this.vcCustomize[0].vcid.toString() != this.vpActive.vcid.toString())) {
        // check if appearance is available
        this.log(`get VC Setting ${this.vpActive.vcid}`);
        this.visbosettingService.getVCSettingByType(this.vpActive.vcid, 'customization,_VCConfig,CustomPredict')
          .subscribe(
            vcsettings => {
              this.vcCustomize = vcsettings.filter(item => item.type == 'customization');
              this.vcEnableDisable = this.squeezeEnableDisable(vcsettings.filter(item => item.type == '_VCConfig'));
              const customSetting = vcsettings.find(item => item.type == 'CustomPredict');
              if (customSetting) {
                this.customPredict = customSetting.name;
              }
              this.initBUDropDown();
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

  squeezeEnableDisable(settings: VisboSetting[]): VisboSetting[] {
    if (!settings || settings.length == 0) {
      return [];
    }
    settings.forEach(item => {
      // calculate VCEnabled and sysVCLimit for a compact view in VC Admin
      if (item.value) {
        if (item.value.systemLimit) {
          item.value.VCEnabled = item.value.systemEnabled;
          item.value.sysVCLimit = true;
        } else if (item.value.sysVCLimit) {
          item.value.VCEnabled = item.value.sysVCEnabled;
        } else {
          item.value.VCEnabled = item.value.VCEnabled ? true : false;
        }
      }
    });
    const result = settings.filter(item => item.value?.systemLimit !== true);
    return result;
  }

  getEnableDisable(name: string, level: number, notLimitOff: boolean): boolean {
    let result = false;
    if (this.vcEnableDisable) {
      const setting = this.vcEnableDisable.find(item => item.name == name);
      if (setting && setting.value) {
        if (level == 0) {
          if (notLimitOff) {
            result = setting.value.systemLimit && setting.value.systemEnabled == false ? false : true;
          } else {
            result = setting.value.systemEnabled == true;
          }
        } else if (level == 1) {
          if (notLimitOff) {
            result = setting.value.sysVCLimit && setting.value.sysVCEnabled == false ? false : true;
          } else {
            result = setting.value.sysVCEnabled == true;
          }
        } else {
          if (notLimitOff) {
            result = setting.value.sysVCLimit && setting.value.sysVCEnabled == false ? false : true;
          } else {
            result = setting.value.VCEnabled == true;
          }
        }
      }
    }
    return result;
  }

  initBUDropDown(): void {
    if (!this.vcCustomize || this.vcCustomize.length == 0) {
      return
    }
    const listBU = this.vcCustomize[0].value?.businessUnitDefinitions;
    if (!listBU) return;
    this.dropDownBU = [];
    listBU.forEach(item => {
      this.dropDownBU.push(item.name);
    });
    if (this.dropDownBU.length > 1) {
      this.dropDownBU.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
    } else {
      this.dropDownBU = undefined;
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

    if (!this.hasKM(vpv.keyMetrics, 'EndDate')) {
      this.updateUrlParam('view', 'All');
    }
    this.findBaseLine(vpv);
    this.log(`VPV Active: vpv: ${vpv._id} ${vpv.timestamp}`);
  }

  initCustomURL(): void {
    this.predictURL = undefined;
    // get the One Time Token and set the predictURL after getting it
    this.userService.getUserOTT()
      .subscribe(
        ott => {
          this.predictURL = this.getPredictURL(ott);
        },
        error => {
          if (error.status === 400) {
            const message = this.translate.instant('vpKeyMetric.msg.errorOTT');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
      });
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
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
      // the reasons not to allow to move startdate:
      // 1. there exists an actualDataUntil, which is after newVPV.startDate
      // 2. startDate is before today and(!) newVPV.status is 'beauftragt'
      // it have to be allowed to move the startDate even if it is in the past, because otherwise you never can initiate projects
      // which have been proposed, by the time then been rejected but now should be initiated.
      if (actualDataUntil && startDate.getTime() < actualDataUntil.getTime()) {
        result = false;
      } else if (startDate.getTime() < beginMonth.getTime() && this.newVPV.status != 'geplant') {
        result = false;
      }
    } else if (mode == 'endDate') {
      // the reasons not to allow to move endDate:
      // 1. there exists an actualDataUntil, which is after newVPV.startDate
      if (actualDataUntil && startDate.getTime() < actualDataUntil.getTime()) {
        result = false;
      } else if (endDate.getTime() < beginMonth.getTime() && this.newVPV.status != 'geplant') {
        result = false;
      }
    }
    // always returns false : return result && false;
    return result;
  }

  canCommit(): boolean {
    if (this.statusDirection != undefined && this.statusDirection != 1) {
      // not the latest version
      return false;
    }
    // if (this.hasVPPerm(this.permVP.Modify) && this.hasVPPerm(this.permVP.ViewAudit) && (this.vpvActive.variantName == "")) {
    if (this.hasVPPerm(this.permVP.Modify) && (this.vpvActive.variantName == "")) {
      return true;
    }
    return false;
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
        this.visboprojectversionService.getVisboProjectVersions(this.vpvActive.vpid, false, variantID, 1)
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
            this.getVisboProjectVersions();

          } else {
            // make a copy of the vpvActive to reflect the changed pfv in KeyMetrics
            this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.vpvActive.variantName)
              .subscribe(
                () => {
                  const message = this.translate.instant('vpKeyMetric.msg.changePFVSuccess');
                  this.alertService.success(message, true);
                  // this.updateVPVCount(this.vpActive, vpv.variantName, 1);
                  // this.visboprojectversions.splice(0, 0, vpv);
                  // this.setVpvActive(vpv);
                  // this.evaluateDirection(0);
                  this.getVisboProjectVersions();
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

  vpUpdate(): void {

    // project settings changed?!
    if (this.vpActive && this.customVPModified) {
      // set the changed custom customfields
      const customFieldString = getCustomFieldString(this.vpActive, '_businessUnit');
      if (customFieldString && this.customBU) {
        customFieldString.value = this.customBU;
      } else if (this.customBU) {
        addCustomFieldString(this.vpActive, '_businessUnit', this.customBU);
      }
      let customFieldDouble = getCustomFieldDouble(this.vpActive, '_strategicFit');
      if (customFieldDouble && this.customStrategicFit != undefined) {
        customFieldDouble.value = this.customStrategicFit;
      } else if (this.customStrategicFit) {
        addCustomFieldDouble(this.vpActive, '_strategicFit', this.customStrategicFit);
      }
      customFieldDouble = getCustomFieldDouble(this.vpActive, '_risk');
      if (customFieldDouble && this.customRisk != undefined) {
        customFieldDouble.value = this.customRisk;
      } else if (this.customRisk) {
        addCustomFieldDouble(this.vpActive, '_risk', this.customRisk);
      }
      // update changed customFields
      this.vpActive.customFieldString.forEach(item => {
        if (item.type == 'VP') {
          const editField = this.editCustomFieldString.find(element => element.name == item.name);
          if (editField && editField.value) {
            item.value = editField.value;
          }
        }
      });
      this.vpActive.customFieldDouble.forEach(item => {
        if (item.type == 'VP') {
          const editField = this.editCustomFieldDouble.find(element => element.name == item.name);
          if (editField && editField.value !== null) {
            item.value = editField.value;
          }
        }
      });
    }

    // project version commited
    if (this.vpActive && this.customVPToCommit) {
      this.customCommit = new Date();
      const customFieldDate = getCustomFieldDate(this.vpActive, '_PMCommit');
      if (customFieldDate && this.customCommit != undefined) {
        customFieldDate.value = this.customCommit;
      } else if (this.customCommit) {
        addCustomFieldDate(this.vpActive, '_PMCommit', this.customCommit);
      }
    }

    if (!this.customVPToCommit) {
      this.log(`update VP  ${this.vpActive._id} bu: ${this.customBU},  strategic fit: ${this.customStrategicFit},  risk: ${this.customRisk}, `);
    } else {
      this.log(`update VP  ${this.vpActive._id} commit: ${this.customCommit},  `);
    }

    this.visboprojectService.updateVisboProject(this.vpActive)
      .subscribe(
        (vp) => {
          this.vpActive = vp;
          const message = this.translate.instant('vpDetail.msg.updateProjectSuccess', {'name': this.vpActive.name});
          this.alertService.success(message, true);
        },
        error => {
          this.log(`save VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpDetail.msg.errorVPConflict', {'name': this.vpActive.name});
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
    let result = this.vpvActive?.variantName != this.newVPVvariantName;
    if (!result && !this.checkBaselineVersion(this.vpvActive)) {
      result = true;
    }
    return result;
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

  getCustomFieldListString(vpOnly = true): VPCustomString[] {
    let list: VPCustomString[] = [];
    this.editCustomFieldString = [];
    if (vpOnly) {
      list = this.vpActive?.customFieldString?.filter(item => item.type == 'VP');
    } else {
      list = this.vpActive?.customFieldString;
    }
    list.forEach(item => {
      const fieldString = new VPCustomString();
      fieldString.name = item.name;
      fieldString.type = item.type;
      fieldString.value = item.value;
      this.editCustomFieldString.push(fieldString);
    });
    return this.editCustomFieldString;
  }

  getCustomFieldListDouble(vpOnly = true): VPCustomDouble[] {
    let list: VPCustomDouble[] = [];
    this.editCustomFieldDouble = [];
    if (vpOnly) {
      list = this.vpActive?.customFieldDouble?.filter(item => item.type == 'VP');
    } else {
      list = this.vpActive?.customFieldDouble;
    }
    list.forEach(item => {
      const fieldString = new VPCustomDouble();
      fieldString.name = item.name;
      fieldString.type = item.type;
      fieldString.value = item.value;
      this.editCustomFieldDouble.push(fieldString);
    });
    return this.editCustomFieldDouble;
  }

  getCustomFieldListDate(vpOnly = true): VPCustomDate[] {
    let list: VPCustomDate[] = [];
    this.editCustomFieldDate = [];
    if (vpOnly) {
      list = this.vpActive?.customFieldDate?.filter(item => item.type == 'VP');
    } else {
      list = this.vpActive?.customFieldDate;
    }
    list.forEach(item => {
      const fieldDate = new VPCustomDate();
      fieldDate.name = item.name;
      fieldDate.type = item.type;
      fieldDate.value = item.value;
      this.editCustomFieldDate.push(fieldDate);
    });
    return this.editCustomFieldDate;
  }

  getTimestampTooltip(vpv: VisboProjectVersion): string {
    if (!vpv) return '';
    let title = this.translate.instant('vpKeyMetric.lbl.plan')
              + ': '
              + this.datePipe.transform(vpv.timestamp, 'dd.MM.yy HH:mm');
    if (vpv.keyMetrics && vpv.keyMetrics.baselineDate) {
      title = title
            + ', ' + this.translate.instant('vpKeyMetric.lbl.pfvVariant')
            + ': '
            + this.datePipe.transform(vpv.keyMetrics.baselineDate, 'dd.MM.yy HH:mm');
    }
    return title;
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectKeyMetrics: ' + message);
  }

}
