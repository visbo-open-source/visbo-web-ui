import { Component, OnInit } from '@angular/core';

import {TranslateService} from '@ngx-translate/core';

import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion} from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-viewdeadline',
  templateUrl: './visboproject-viewdeadline.component.html',
  styleUrls: ['./visboproject-viewdeadline.component.css']
})
export class VisboProjectViewDeadlineComponent implements OnInit {

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

  dropDown: string[] = [];
  dropDownIndex: number;

  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  initVPVID: string;
  deleted = false;

  refDateInterval = 'month';
  vpvRefDate: Date;
  scrollRefDate: Date;

  combinedPerm: VGPermission = undefined;
  permVC = VGPVC;
  permVP = VGPVP;

  ngOnInit(): void {
    if (this.route.snapshot.queryParams.vpvid) {
      this.initVPVID = this.route.snapshot.queryParams.vpvid;
    }
    this.getVisboProjectVersions();
  }

  dropDownInit(): void {
    const variantID = this.route.snapshot.queryParams['variantID'];
    let variantName = this.route.snapshot.queryParams['variantName'];
    if (variantID) {
      // serach for the variant Name
      let index = this.vpActive.variant.findIndex(item => item._id.toString() === variantID);
      if (index >= 0) {
        variantName = this.vpActive.variant[index].variantName;
      }
    } else if (variantName) {
      let index = this.vpActive.variant.findIndex(item => item.variantName === variantName);
      if (index >= 0) {
        variantName = this.vpActive.variant[index].variantName;
      } else {
        variantName = undefined;
      }
    }
    this.log(`Init Drop Down List ${this.vpActive.variant.length + 1} Variant ${variantID}/${variantName}`);
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
    if (variantName) {
      this.dropDownIndex = this.dropDown.findIndex(item => item === variantName);
    }
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
    // fetch the project with Variant
    this.getVisboProjectVersions();
    return;
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');

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
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted, variantID, false)
              .subscribe(
                visboprojectversions => {
                  this.visboprojectversions = visboprojectversions;
                  this.log(`get VPV: Get ${visboprojectversions.length} Project Versions`);
                  this.visboprojectversions.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
                  this.visboprojectversions.reverse();
                  let index = 0;
                  if (this.initVPVID) {
                    index = this.visboprojectversions.findIndex(vpv => vpv._id === this.initVPVID);
                    index = index >= 0 ? index : 0;
                  }
                  this.setVpvActive(visboprojectversions[index]);
                },
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpViewDeadline.msg.errorPermVersion', {'name': this.vpActive.name});
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
              const message = this.translate.instant('vpViewDeadline.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }

  getRefDateVersions(increment: number): VisboProjectVersion {
    this.log(`get getRefDateVersions ${this.scrollRefDate} ${increment} ${this.refDateInterval}`);
    const newRefDate = new Date(this.scrollRefDate);
    let i = 0;
    let quarter = 0;
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
        quarter = Math.trunc(newRefDate.getMonth() / 3);
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

  setVpvActive(vpv: VisboProjectVersion): void {
    this.log(`setVpvActive ${vpv._id} ${vpv.variantName}`);
    if (this.vpvActive && vpv.variantName !== this.vpvActive.variantName) {
      this.switchVariant(vpv.variantName);
    }
    this.vpvActive = vpv;
    if (this.vpvActive && this.vpvActive.timestamp) {
      this.vpvRefDate = this.vpvActive.timestamp;
      if (this.scrollRefDate === undefined) {
        this.scrollRefDate = new Date(this.vpvRefDate);
      }
    } else {
      this.scrollRefDate = undefined;
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
    this.messageService.add('VisboViewDeadline: ' + message);
  }

}
