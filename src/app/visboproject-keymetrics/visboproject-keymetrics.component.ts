import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject, VPParams } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, convertDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-keymetrics',
  templateUrl: './visboproject-keymetrics.component.html'
})
export class VisboProjectKeyMetricsComponent implements OnInit, OnChanges {

  visboprojectversions: VisboProjectVersion[];
  visbokeymetrics: VPVKeyMetricsCalc[] = [];

  dropDown: string[] = [];
  dropDownIndex: number;

  vpSelected: string;
  vpActive: VisboProject;
  variantID: string;
  variantName: string;
  deleted = false;
  vpvKeyMetricActive: VPVKeyMetricsCalc;

  currentView = 'KeyMetrics';
  currentViewKM = false;
  refDate = new Date();
  refDateInterval = 'month';

  allViews = ['KeyMetrics', 'Capacity', 'Costs', 'Deadlines', 'Deliveries', 'All'];
  delayEndDate: number;

  currentLang: string;

  sortAscending = false;
  sortColumn = 1;

  combinedPerm: VGPermission;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.variantID = this.route.snapshot.queryParams['variantID'];
    this.variantName = this.route.snapshot.queryParams['variantName'];
    const view = this.route.snapshot.queryParams['view'];
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
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  dropDownInit(): void {
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
    this.dropDown = [];
    this.dropDownIndex = undefined;
    const len = this.vpActive.variant.length;

    for (let i = 0; i < len; i++) {
      if (this.vpActive.variant[i].variantName !== 'pfv' && this.vpActive.variant[i].vpvCount > 0) {
        this.dropDown.push(this.vpActive.variant[i].variantName);
      }
    }
    if (this.dropDown.length > 0 ) {
      this.dropDown.splice(0, 0, 'DEFAULT');
      this.dropDownIndex = 0;
    }
    if (this.variantName) {
      this.dropDownIndex = this.dropDown.findIndex(item => item === this.variantName);
    }
  }

  switchViewParent(newParam: VPParams): void {
    if (!newParam) return;
    if (newParam.view) {
      this.switchView(newParam.view, true);
    } else if (newParam.refDate) {
      this.findVPV(new Date(newParam.refDate));
    }
  }

  findVPV(refDate: Date): void {
    if (this.visbokeymetrics.length > 0) {
      let i = 0;
      // search the coresponding version for refDate
      if (refDate) {
        for (; i < this.visbokeymetrics.length; i++) {
          if (refDate.toISOString() >= (new Date(this.visbokeymetrics[i].timestamp)).toISOString() ) {
            break;
          }
        }
        if (i >= this.visbokeymetrics.length) { i = this.visbokeymetrics.length - 1; }
      }
      // this.setVpvActive(this.visbokeymetrics[i]);
      this.vpvKeyMetricActive = this.visbokeymetrics[i];
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
    const i = this.dropDown.findIndex(item => item === name);
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
    if (this.variantName == undefined && variantName == 'DEFAULT') { result = true; }
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
      return result;
    }
    if (type == 'Costs') {
      result = km.costCurrentTotal > 0 || km.costBaseLastTotal > 0;
    } else if (type == 'Deadlines') {
      result = km.timeCompletionCurrentTotal > 0 || km.timeCompletionBaseLastTotal > 0;
    } else if (type == 'EndDate') {
      result = km.endDateCurrent != undefined || km.endDateBaseLast != undefined;
    } else if (type === 'DeadlinesDelay') {
      result = km.timeDelayFinished !== undefined && km.timeDelayUnFinished !== undefined;
    } else if (type == 'Deliveries') {
      result = km.deliverableCompletionCurrentTotal > 0 || km.deliverableCompletionBaseLastTotal > 0;
    } else if (type === 'DeliveriesDelay') {
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
            if (!this.vpActive || this.vpActive._id !== visboproject._id) {
              this.vpActive = visboproject;
              this.combinedPerm = visboproject.perm;
              this.dropDownInit();
            }
            const variantName = this.dropDownIndex > 0 ? this.dropDown[this.dropDownIndex] : '';
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
                  // this.sortVPVTable(undefined);
                  this.log(`get VPV Key metrics: Get ${visboprojectversions.length} Project Versions`);

                  this.visboKeyMetricsCalc();
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

  visboKeyMetricsCalc(): void {
    // Calculate the keyMetrics Values
    this.visbokeymetrics = [];

    if (!this.visboprojectversions) {
      return;
    }
    this.log(`calc keyMetrics LEN ${this.visboprojectversions.length}`);
    for (let i = 0; i < this.visboprojectversions.length; i++) {
      if (this.visboprojectversions[i].keyMetrics) {
        const elementKeyMetric = new VPVKeyMetricsCalc();
        elementKeyMetric.name = this.visboprojectversions[i].name;
        elementKeyMetric._id = this.visboprojectversions[i]._id;
        elementKeyMetric.timestamp = this.visboprojectversions[i].timestamp;
        elementKeyMetric.vpid = this.visboprojectversions[i].vpid;
        elementKeyMetric.variantName = this.visboprojectversions[i].variantName;
        elementKeyMetric.startDate = this.visboprojectversions[i].startDate;
        elementKeyMetric.Risiko = this.visboprojectversions[i].Risiko;
        elementKeyMetric.StrategicFit = this.visboprojectversions[i].StrategicFit;
        elementKeyMetric.leadPerson = this.visboprojectversions[i].leadPerson;
        elementKeyMetric.status = this.visboprojectversions[i].status;
        elementKeyMetric.ampelStatus = this.visboprojectversions[i].ampelStatus;
        elementKeyMetric.ampelErlaeuterung = this.visboprojectversions[i].ampelErlaeuterung;
        elementKeyMetric.VorlagenName = this.visboprojectversions[i].VorlagenName;
        elementKeyMetric.complexity = this.visboprojectversions[i].complexity;
        elementKeyMetric.description = this.visboprojectversions[i].description;
        elementKeyMetric.businessUnit = this.visboprojectversions[i].businessUnit;

        elementKeyMetric.keyMetrics = this.visboprojectversions[i].keyMetrics;
        // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
        elementKeyMetric.savingCostTotal = Math.round((1 - (elementKeyMetric.keyMetrics.costCurrentTotal || 0)
                                                      / (elementKeyMetric.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
        if (elementKeyMetric.savingCostTotal > 100) {
          elementKeyMetric.savingCostTotal = 100;
        }
        if (elementKeyMetric.savingCostTotal < -100) {
          elementKeyMetric.savingCostTotal = -100;
        }
        elementKeyMetric.savingCostTotal = Math.round(elementKeyMetric.savingCostTotal);
        elementKeyMetric.savingCostActual = ((1 - (elementKeyMetric.keyMetrics.costCurrentActual || 0)
                                            / (elementKeyMetric.keyMetrics.costBaseLastActual || 1)) * 100) || 0;

        // Calculate Saving EndDate in number of weeks related to BaseLine, limit the results to be between -20 and 20
        if (elementKeyMetric.keyMetrics.endDateBaseLast && elementKeyMetric.keyMetrics.endDateCurrent) {
          elementKeyMetric.savingEndDate = this.helperDateDiff(
            (new Date(elementKeyMetric.keyMetrics.endDateBaseLast).toISOString()),
            (new Date(elementKeyMetric.keyMetrics.endDateCurrent).toISOString()), 'w') || 0;
            elementKeyMetric.savingEndDate = Math.round(elementKeyMetric.savingEndDate * 10) / 10;
        }

        // Calculate the Delivery Completion
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal) {
          elementKeyMetric.deliveryCompletionTotal = 100;
        } else {
          elementKeyMetric.deliveryCompletionTotal = Math.round((elementKeyMetric.keyMetrics.deliverableCompletionCurrentTotal || 0)
                                                                / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastTotal * 100);
        }
        if (!elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual) {
          elementKeyMetric.deliveryCompletionActual = 100;
        } else {
          elementKeyMetric.deliveryCompletionActual = Math.round((elementKeyMetric.keyMetrics.deliverableCompletionCurrentActual || 0)
                                                                / elementKeyMetric.keyMetrics.deliverableCompletionBaseLastActual * 100);
        }

        // Calculate the Deadline Completion
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal) {
          elementKeyMetric.timeCompletionTotal = 100;
        } else {
          elementKeyMetric.timeCompletionTotal = Math.round((elementKeyMetric.keyMetrics.timeCompletionCurrentTotal || 0)
                                                            / elementKeyMetric.keyMetrics.timeCompletionBaseLastTotal * 100);
        }
        if (!elementKeyMetric.keyMetrics.timeCompletionBaseLastActual) {
          elementKeyMetric.timeCompletionActual = 100;
        } else {
          elementKeyMetric.timeCompletionActual = Math.round((elementKeyMetric.keyMetrics.timeCompletionCurrentActual || 0)
                                                            / elementKeyMetric.keyMetrics.timeCompletionBaseLastActual * 100);
        }

        this.visbokeymetrics.push(elementKeyMetric);
      }
    }
    this.log(`calc keyMetrics Result LEN ${this.visbokeymetrics.length}`);
    if (this.visbokeymetrics.length > 0) {
      this.visbokeymetrics.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
      let i = 0;
      // search the coresponding version for refDate
      if (this.refDate) {
        for (; i < this.visbokeymetrics.length; i++) {
          if (this.refDate.toISOString() >= (new Date(this.visbokeymetrics[i].timestamp)).toISOString() ) {
            break;
          }
        }
        if (i >= this.visbokeymetrics.length) { i = this.visbokeymetrics.length - 1; }
      }
      this.setVpvActive(this.visbokeymetrics[i]);
    } else {
      this.gotoVisboProjectVersions();
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
      const refDate = new Date(this.visbokeymetrics[0].timestamp);
      if (newRefDate.getTime() >= refDate.getTime()) {
        newVersionIndex = 0;
        this.refDate.setTime(refDate.getTime());
      }
    } else {
      const refDate = new Date(this.visbokeymetrics[this.visbokeymetrics.length - 1].timestamp);
      if (newRefDate.getTime() <= refDate.getTime()) {
        newVersionIndex = this.visbokeymetrics.length - 1;
        this.refDate.setTime(refDate.getTime());
      }
    }
    if (newVersionIndex === undefined) {
      this.log(`get getRefDateVersions normalised ${(new Date(newRefDate)).toISOString()}`);
      for (i = 0; i < this.visbokeymetrics.length; i++) {
        const cmpDate = new Date(this.visbokeymetrics[i].timestamp);
        // this.log(`Compare Date ${cmpDate.toISOString()} ${newRefDate.toISOString()}`);
        if (cmpDate.getTime() <= newRefDate.getTime()) {
          break;
        }
      }
      newVersionIndex = i;
    }
    this.log(`get getRefDateVersions vpv timestamp ${this.visbokeymetrics[newVersionIndex].timestamp}`);
    this.setVpvActive(this.visbokeymetrics[newVersionIndex]);
  }

  getNextVersion(direction: number): void {
    this.getRefDateVersions(direction);
    this.updateUrlParam('refDate', this.refDate.toISOString());
  }

  gotoVisboProjectVersions(): void {
    this.log(`goto VPV All Versions`);
    let vpid;
    const params = {};
    if (this.vpvKeyMetricActive) {
      vpid = this.vpvKeyMetricActive.vpid;
    }
    const url = 'vpv/';
    if (!vpid && this.vpActive) {
      vpid = this.vpActive._id;
    }
    if (vpid) {
      this.router.navigate([url.concat(vpid)], params);
    }
  }

  gotoRoot(): void {
    this.log(`goto Root as no id is specified`);
    this.router.navigate(['/'], {});
  }

  setVpvActive(vpv: VPVKeyMetricsCalc): void {
    const keyMetrics = vpv.keyMetrics;
    let index: number;
    this.vpvKeyMetricActive = vpv;

    index = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    this.delayEndDate = Math.round(index / 1000 / 60 / 60 / 24) / 7;
    this.log(`VPV Active: vpv: ${vpv._id} ${this.vpvKeyMetricActive._id} ${this.vpvKeyMetricActive.timestamp}`);
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

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectKeyMetrics: ' + message);
  }

}
