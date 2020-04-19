import { Component, Input, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-viewcost',
  templateUrl: './visboproject-viewcost.component.html'
})
export class VisboProjectViewCostComponent implements OnInit {

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  visboprojectversions: VisboProjectVersion[];

  vpSelected: string;
  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  initVPVID: string;
  deleted = false;

  refDateInterval = 'month';
  vpvRefDate: Date;
  scrollRefDate: Date;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  ngOnInit() {
    if (this.route.snapshot.queryParams.vpvid) {
      this.initVPVID = this.route.snapshot.queryParams.vpvid;
    }
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
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
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, '', false)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.log(`get VPV: Get ${visboprojectversions.length} Project Versions`);
                  this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
                  this.visboprojectversions.reverse();
                  let index = 0;
                  if (this.initVPVID) {
                    index = this.visboprojectversions.findIndex(vpv => vpv._id === this.initVPVID)
                    index = index >= 0 ? index : 0;
                  }
                  this.setVpvActive(visboprojectversions[index]);
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpViewCost.msg.errorPermVersion', {'name': this.vpActive.name});
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
              const message = this.translate.instant('vpViewCost.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }

  calcRangeAxis(keyMetrics: [], type: string): number {
    let rangeAxis = 0;
    const minDelayRange = 50;

    rangeAxis = 0;
    for (let i = 0; i < keyMetrics.length; i++) {
      switch (type) {
        case 'Delay':
          rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][5]), Math.abs(keyMetrics[i][6]), minDelayRange);
          break;
        case 'Delivery':
          rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][1]));
          break;
        case 'Deadline':
          rangeAxis = Math.max(rangeAxis, Math.abs(keyMetrics[i][1]));
          break;
      }
    }
    rangeAxis *= 1.1;
    this.log(`RangeAxis for ${type}: ${rangeAxis}`);
    return rangeAxis;
  }

  getRefDateVersions(increment: number): VisboProjectVersion {
    this.log(`get getRefDateVersions ${this.scrollRefDate} ${increment} ${this.refDateInterval}`);
    const newRefDate = new Date(this.scrollRefDate);
    let i = 0;

    switch (this.refDateInterval) {
      case 'day':
        newRefDate.setHours(0, 0, 0, 0); // beginning of day
        if (increment > 0 || newRefDate.getTime() === this.scrollRefDate.getTime()) {
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
        if (increment > 0 || newRefDate.getTime() === this.scrollRefDate.getTime()) {
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
        if (newRefDate.getTime() === this.scrollRefDate.getTime()) {
          newRefDate.setMonth(newRefDate.getMonth() + increment * 3);
        }
        break;
    }
    this.log(`get getRefDateVersions ${newRefDate.toISOString()} ${this.scrollRefDate.toISOString()}`);
    this.scrollRefDate = newRefDate;
    let newVersionIndex;
    if (increment > 0) {
      const refDate = new Date(this.visboprojectversions[0].timestamp);
      if (newRefDate.getTime() >= refDate.getTime()) {
        newVersionIndex = 0;
        this.scrollRefDate.setTime(refDate.getTime());
      }
    } else {
      const refDate = new Date(this.visboprojectversions[this.visboprojectversions.length - 1].timestamp);
      if (newRefDate.getTime() <= refDate.getTime()) {
        newVersionIndex = this.visboprojectversions.length - 1;
        this.scrollRefDate.setTime(refDate.getTime());
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
    this.setVpvActive(this.visboprojectversions[newVersionIndex]);
    return this.visboprojectversions[newVersionIndex];
  }

  setVpvActive(vpv: any): void {
    this.log(`setVpvActive ${vpv._id}`);
    this.vpvActive = vpv;
    if (this.vpvActive && this.vpvActive.timestamp) {
      this.vpvRefDate = this.vpvActive.timestamp;
      if (this.scrollRefDate === undefined) {
        this.scrollRefDate = new Date(this.vpvRefDate);
      }
    } else {
      this.scrollRefDate === undefined;
    }
  }

  getPrevVersion(): void {
    const vpv = this.getRefDateVersions(-1);
    const url = this.route.snapshot.url[0].path + '/';
    const queryParams = { vpvid: vpv._id };
    this.log(`GoTo Prev Version ${vpv._id} ${vpv.timestamp}`);
    this.router.navigate([url.concat(vpv.vpid)], { queryParams: queryParams, replaceUrl: true });
  }

  getNextVersion(): void {
    const vpv = this.getRefDateVersions(+1);
    const url = this.route.snapshot.url[0].path + '/';
    const queryParams = { vpvid: vpv._id };
    this.log(`GoTo Next Version ${vpv._id} ${vpv.timestamp}`);
    this.router.navigate([url.concat(vpv.vpid)], { queryParams: queryParams, replaceUrl: true });
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVP(visboproject: VisboProject): void {
    this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewCost: ' + message);
  }

}
