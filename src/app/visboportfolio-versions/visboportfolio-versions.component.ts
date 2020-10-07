import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import * as moment from 'moment';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

class Params {
  vpfid: string;
  refDate: string;
  view: string;
}

class DropDown {
  name: string;
  version: number;
  timestamp: Date;
}

@Component({
  selector: 'app-visboportfolio-versions',
  templateUrl: './visboportfolio-versions.component.html'
})
export class VisboPortfolioVersionsComponent implements OnInit {

    visboportfolioversions: VisboPortfolioVersion[];
    visboprojectversions: VisboProjectVersion[];
    vpvWithKM: number;

    dropDown: DropDown[] = [];
    dropDownSelected: string;
    dropDownValue: number;

    vpSelected: string;
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    refDateInterval = 'month';
    vpfid: string;
    deleted = false;
    currentLang: string;
    currentView: string;
    vpList: VisboProjectVersion[];

    combinedPerm: VGPermission = undefined;
    combinedPermVC: VGPermission = undefined;
    permVC = VGPVC;
    permVP = VGPVP;

    sortAscending: boolean;
    sortColumn: number;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.log(`Init VPF with Transaltion: ${this.translate.instant('vpfVersion.metric.costName')}`);

    const refDate = this.route.snapshot.queryParams['refDate'];
    const nextView = this.route.snapshot.queryParams['view'];
    this.vpfid = this.route.snapshot.queryParams['vpfid'];
    this.vpvRefDate = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.currentView = nextView || 'KeyMetrics';

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
    if ((this.combinedPermVC?.vc & perm) > 0) {
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
          this.getVisboPortfolioVersions();
          this.getVisboCenter();
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

  getVisboCenter(): void {
    if (this.vpActive) {
      // MS TODO: add silent parameter to get an empty item instead of access denied
      this.log(`get VC Permission for VCID ${this.vpActive.vcid}`);
      this.visbocenterService.getVisboCenter(this.vpActive.vcid)
        .subscribe(
          visbocenter => {
            this.combinedPermVC = visbocenter.perm;
          },
          error => {
            this.log(`get VisboCenter failed: error: ${error.status} message: ${error.error.message}`);
            this.combinedPermVC = new VGPermission();
            this.combinedPermVC.vc = 0;
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
    this.getVisboPortfolioKeyMetrics();
  }

  changeView(nextView: string): void {
    if (nextView === 'Capacity' || nextView === 'KeyMetrics' || nextView === 'ProjectBoard' || nextView === 'List') {
      this.currentView = nextView;
    } else {
      this.currentView = 'KeyMetrics';
    }
    const url = this.route.snapshot.url.join('/');
    const queryParams = {
      refDate: this.vpvRefDate?.toISOString(),
      vpfid: this.vpfActive?._id,
      view: this.currentView
    };
    this.router.navigate([url], { queryParams: queryParams, replaceUrl: true });
  }

  calcPercent(current: number, baseline: number): number {
    if (baseline === undefined) {
      return undefined;
    } else if (baseline === 0 && current === 0) {
      return 1;
    } else {
      return (current || 0) / baseline;
    }
  }

  isSameDay(dateA: Date, dateB: Date): boolean {
    if (!dateA || !dateB) { return false; }
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    return dateA.toISOString() === dateB.toISOString();
  }

  isVersionMismatch(): boolean {
    let result = false;
    if (this.currentView === 'KeyMetrics'
      && this.vpList
      && this.vpvWithKM !== this.vpList.length) {
        result = true;
      }
    return result;
  }

  calcVPList(): void {
    if (!this.vpfActive && !this.vpfActive.allItems) { return; }
    this.vpList = [];
    this.vpvWithKM = 0;
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
        this.vpvWithKM += this.visboprojectversions[index].keyMetrics ? 1 : 0;
      }
      this.vpList.push(nextVP);
    }
  }

  getNextVersion(direction: number): void {
    this.getRefDateVersions(direction);
    const url = this.route.snapshot.url.join('/');
    const queryParams = {
      refDate: this.vpvRefDate.toISOString(),
      vpfid: this.vpfActive._id,
      view: this.currentView
    };
    // this.visboprojectversions = [];
    this.log(`GoTo Next Version ${JSON.stringify(queryParams)}`);
    this.router.navigate([url], { queryParams: queryParams, replaceUrl: true });
  }

  // get the details of the project
  gotoVPDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVP(id: string, variantName: string): void {
    this.log(`goto VP ${id}/${variantName}`);
    this.router.navigate(['vpKeyMetrics//'.concat(id)], variantName ? { queryParams: { variantName: variantName }} : {});
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
      let text = 'Version '.concat('from ', moment(timestamp).format('DD.MM.YY'));
      if (this.visboportfolioversions[i].variantName) {
        text = text.concat(' ( ', this.visboportfolioversions[i].variantName, ' )');
      }
      this.dropDown.push({name: text, version: i, timestamp: timestamp });
    }
    this.dropDown.sort(function (a, b) { return b.timestamp.getTime() - a.timestamp.getTime(); });
    if (len > 0 ) {
      this.dropDownSelected = this.dropDown[0].name;
    }
    // this.log(`Init Drop Down List Finished ${this.dropDown.length} Selected ${this.dropDownSelected}`);
  }

  switchPFVersion(i: number): void {
    this.log(`Change Drop Down ${i} `);
    this.vpfActive = this.visboportfolioversions[i];
    this.getVisboPortfolioKeyMetrics();
    let queryParams = new Params();
    queryParams.vpfid = this.vpfActive._id;
    queryParams.refDate = this.vpvRefDate.toISOString();
    queryParams.view = this.currentView;

    const url = this.route.snapshot.url.join('/');
    this.log(`GoTo Portfolio Version ${this.vpfActive._id.toString()}`);
    this.router.navigate([url], { queryParams: queryParams, replaceUrl: true });
  }

  sortTable(n?: number): void {
    if (!this.vpList) { return; }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortColumn === undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = n === 1 ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      this.vpList.sort(function(a, b) {
        return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
      });
    }
    if (this.sortColumn === 2) {
      this.vpList.sort(function(a, b) {
        return visboCmpString(a.variantName.toLowerCase() || '', b.variantName.toLowerCase() || '');
      });
    }
    if (this.sortColumn === 3) {
      this.vpList.sort(function(a, b) {
        return visboCmpDate(a.timestamp, b.timestamp);
      });
    }
    if (this.sortColumn === 4) {
      this.vpList.sort(function(a, b) {
        return (b.keyMetrics ? 1 : -1) - (a.keyMetrics ? 1 : -1);
      });
    }
    if (this.sortColumn === 5) {
      this.vpList.sort(function(a, b) {
        return (b.ampelStatus || 0) - (a.ampelStatus || 0);
      });
    }
    if (!this.sortAscending) {
      this.vpList.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string): void {
    this.messageService.add('VisboPortfolioVersion: ' + message);
  }
}
