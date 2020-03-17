import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Location } from '@angular/common';

import {TranslateService} from '@ngx-translate/core';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProject } from '../_models/visboproject';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboprojectversion-detail',
  templateUrl: './visboprojectversion-detail.component.html'
})
export class VisboProjectVersionDetailComponent implements OnInit {

  @Input() visboprojectversion: VisboProjectVersion;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;
  deleted = false;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private visboprojectversionService: VisboProjectVersionService,
    private location: Location,
    private alertService: AlertService,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboProjectVersion();
  }

  getVisboProjectVersion(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProjectVersion Detail of: ' + id);
    this.visboprojectversionService.getVisboProjectVersion(id, this.deleted)
      .subscribe(
        visboprojectversion => {
          this.combinedPerm = visboprojectversion.perm;
          this.visboprojectversion = visboprojectversion;
          this.log(`Get VisboProjectVersion for VPV ${id} ${visboprojectversion.name} ${JSON.stringify(this.combinedPerm)}`);
        },
        error => {
          this.log(`get VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpvDetails.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  goBack(): void {
    this.location.back();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  delete(visboprojectversion: VisboProjectVersion): void {
    this.log(`delete VPV ${visboprojectversion._id}`);

    this.visboprojectversionService.deleteVisboProjectVersion(visboprojectversion, this.deleted)
      .subscribe(
        () => {
            this.alertService.success(`Visbo Project Version ${visboprojectversion._id} deleted successfully`, true);
            this.log(`delete VPV success`);
            this.goBack();
          },
        error => {
          this.log(`delete VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpvDetails.msg.errorPermDelete', {'name': visboprojectversion.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  gotoViewCost(): void {
    this.log(`goto VPV View Cost VPID ${this.visboprojectversion.vpid} VPVID ${this.visboprojectversion._id}`);
    const queryParams = { vpvid: this.visboprojectversion._id };
    this.router.navigate(['vpViewCost/'.concat(this.visboprojectversion.vpid)], { queryParams: queryParams});
  }

  gotoViewDelivery(): void {
    this.log(`goto VPV View Delivery VPID ${this.visboprojectversion.vpid} VPVID ${this.visboprojectversion._id}`);
    const queryParams = { vpvid: this.visboprojectversion._id };
    this.router.navigate(['vpViewDelivery/'.concat(this.visboprojectversion.vpid)], { queryParams: queryParams});
  }

  gotoViewDeadline(): void {
    this.log(`goto VPV View Deadline VPID ${this.visboprojectversion.vpid} VPVID ${this.visboprojectversion._id}`);
    const queryParams = { vpvid: this.visboprojectversion._id };
    this.router.navigate(['vpViewDeadline/'.concat(this.visboprojectversion.vpid)], { queryParams: queryParams});
  }

  gotoVCDetail(visboproject: VisboProject): void {
    this.router.navigate(['vcDetail/'.concat(visboproject.vcid)]);
  }

  gotoVPVList(visboprojectversion: VisboProjectVersion): void {
    this.log(`goto VPV List: ${visboprojectversion.vpid} Deleted ${this.deleted}`);
    this.router.navigate(['vpKeyMetrics/'.concat(visboprojectversion.vpid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  save(): void {
    this.log(`update VPV ${this.visboprojectversion._id}`);
    this.visboprojectversionService.updateVisboProjectVersion(this.visboprojectversion, this.deleted)
      .subscribe(
        (vpv) => {
          this.alertService.success(`Visbo Project ${vpv.name} updated successfully`, true);
          this.goBack();
        },
        error => {
          this.log(`save VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpvDetails.msg.errorPermVersion', {'name': this.visboprojectversion.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpvDetails.msg.errorConflict', {'name': this.visboprojectversion._id});
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectVersionDetail: ' + message);
  }
}
