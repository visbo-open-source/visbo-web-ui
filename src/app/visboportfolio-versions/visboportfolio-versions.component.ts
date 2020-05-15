import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import * as moment from 'moment';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboPortfolioVersion } from '../_models/visboportfolioversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboportfolio-versions',
  templateUrl: './visboportfolio-versions.component.html'
})
export class VisboPortfolioVersionsComponent implements OnInit {

    visboportfolioversions: VisboPortfolioVersion[];
    visboprojectversions: VisboProjectVersion[];

    dropDown: any[] = [];
    dropDownSelected: string;
    dropDownValue: number;

    vpSelected: string;
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    refDateInterval = 'month';
    vpfActiveIndex: number;
    deleted = false;
    currentLang: string;

    combinedPerm: VGPermission = undefined;
    permVC: any = VGPVC;
    permVP: any = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.log(`Init VPF with Transaltion: ${this.translate.instant('vpfVersion.metric.costName')}`);

    const id = this.route.snapshot.paramMap.get('id');
    const refDate = this.route.snapshot.queryParams['refDate'];
    this.vpvRefDate = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();

    this.getVisboPortfolioVersions();
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

  getVisboPortfolioVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vpSelected = id;
    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboPortfolioVersions(id, this.deleted)
              .subscribe(
                visboportfolioversions => {
                  this.visboportfolioversions = visboportfolioversions;
                  this.vpfActive = visboportfolioversions[0];
                  this.vpfActiveIndex = visboportfolioversions.length;
                  if (visboportfolioversions.length > 0) {
                    // this.combinedPerm = visboportfolioversions[0].perm;
                    this.dropDownInit();
                    this.getVisboPortfolioKeyMetrics();
                    this.log(`get VPF Index ${this.vpfActiveIndex}`);
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
          },
          error => {
            this.log(`get VPV VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpfVersion.msg.errorPermVP');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    } else {
      this.vpSelected = null;
      this.vpActive = null;
      this.visboprojectversionService.getVisboPortfolioVersions(null)
        .subscribe(
          visboportfolioversions => this.visboportfolioversions = visboportfolioversions,
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
  }

  getVisboPortfolioKeyMetrics(): void {
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.log(`get VPF Key metrics: Get ${visboprojectversions.length} Project Versions`);
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
    this.log(`get getRefDateVersions ${this.vpvRefDate} ${increment}`);
    let newRefDate = new Date(this.vpvRefDate.getTime());
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
        let quarter = Math.trunc(newRefDate.getMonth() / 3);
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
    this.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    const today = new Date();
    if (newRefDate > today) {
      newRefDate = today;
    }
    this.log(`get getRefDateVersions Quarter ${newRefDate} ${increment}`);
    this.vpvRefDate = new Date(newRefDate.toISOString()); // to guarantee that the item is refreshed in UI
    this.getVisboPortfolioKeyMetrics();
  }

  calcPercent(current, baseline) {
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

  getNextVersion(direction: number): void {
    this.getRefDateVersions(direction);
    const url = this.route.snapshot.url.join('/');
    const queryParams = {
      refDate: this.vpvRefDate.toISOString()
    };
    // this.visboprojectversions = [];
    this.log(`GoTo Prev refDate ${this.vpvRefDate.toISOString()}`);
    this.router.navigate([url], { queryParams: queryParams, replaceUrl: true });
  }

  // getNextVersion(): void {
  //   const vpv = this.getRefDateVersions(+1);
  //   const url = this.route.snapshot.url[0].path + '/';
  //   const queryParams = { vpvid: vpv._id };
  //   this.log(`GoTo Next Version ${vpv._id} ${vpv.timestamp}`);
  //   this.router.navigate([url.concat(vpv.vpid)], { queryParams: queryParams, replaceUrl: true });
  // }

  // get the details of the project
  gotoVPDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  dropDownInit() {
    this.log(`Init Drop Down List ${this.visboportfolioversions.length}`);
    this.dropDown = [];
    const len = this.visboportfolioversions.length;

    for (let i = 0; i < len; i++) {
      const timestamp = new Date(this.visboportfolioversions[i].timestamp);
      const text = 'Version '.concat((len - i).toString(), ' from ', moment(timestamp).format('DD.MM.YY HH:mm'));
      this.dropDown.push({name: text, version: i, timetsamp: moment(timestamp).format('DD.MM.YY') });
    }
    if (len > 0 ) {
      this.dropDownSelected = this.dropDown[0].name;
    }
    // this.log(`Init Drop Down List Finished ${this.dropDown.length} Selected ${this.dropDownSelected}`);
  }

  changePFVersion() {
    this.dropDownValue = this.dropDown.find(x => x.name === this.dropDownSelected).version;
    this.log(`Change Drop Down ${this.dropDownSelected} ${this.dropDownValue}`);
    this.vpfActive = this.visboportfolioversions[this.dropDownValue];
    this.getVisboPortfolioKeyMetrics();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboPortfolioVersion: ' + message);
  }
}
