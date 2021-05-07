import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboprojectversions',
  templateUrl: './visboprojectversions.component.html',
  styleUrls: ['./visboprojectversions.component.css']
})
export class VisboProjectVersionsComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];
  visboprojectversion: VisboProjectVersion;
  vpSelected: string;
  vpActive: VisboProject;
  deleted = false;
  sortAscending: boolean;
  sortColumn: number;

  combinedPerm: VGPermission = undefined;
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
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) !== 0;
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) !== 0;
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
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted)
              .subscribe(
                visboprojectversions => this.visboprojectversions = visboprojectversions,
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpv.msg.errorPermVersion', {'name': this.vpActive.name});
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
              const message = this.translate.instant('vpv.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    } else {
      this.vpSelected = null;
      this.vpActive = null;
      this.visboprojectversionService.getVisboProjectVersions(null)
        .subscribe(
          visboprojectversions => this.visboprojectversions = visboprojectversions,
          error => {
            this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpv.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  toggleVisboProjectVersions(): void {
    this.deleted = !this.deleted;
    const url = this.route.snapshot.url.join('/');
    this.log(`VP toggleVisboProjectVersions ${this.deleted} URL ${url}`);
    this.getVisboProjectVersions();
    // go to the current url and add delete flag
    this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  checkLocked(visboprojectversion: VisboProjectVersion, otherUser = false): string {
    const variantName = visboprojectversion.variantName || '';
    const lock = this.vpActive.lock.find(item => item.variantName === variantName);
    let result = undefined;
    if (lock) {
      if (otherUser) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        result = currentUser.email != lock.email ? lock.email : undefined;
      } else {
        result = lock.email
      }
    }
    return result;
  }

  helperSetVPV(index: number): void {
    this.visboprojectversion = this.visboprojectversions[index];
  }

  delete(visboprojectversion: VisboProjectVersion): void {
    this.log(`delete VPV ${visboprojectversion._id}`);

    this.visboprojectversionService.deleteVisboProjectVersion(visboprojectversion, this.deleted)
      .subscribe(
        () => {
            this.alertService.success(`Visbo Project Version ${visboprojectversion._id} deleted successfully`, true);
            this.log(`delete VPV success`);
            // remove version from list
            const index = this.visboprojectversions.findIndex(item => item._id === visboprojectversion._id);
            if (index >= 0) {
              this.visboprojectversions.splice(index, 1);
            }
          },
        error => {
          this.log(`delete VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpv.msg.errorPermDelete', {'name': visboprojectversion.name});
            this.alertService.error(message);
          } else if (error.status === 423) {
            const message = this.translate.instant('vpv.msg.errorLocked', {'name': visboprojectversion.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpv.msg.errorConsistencyDelete', {'name': visboprojectversion.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  restore(): void {
    this.log(`update VPV ${this.visboprojectversion._id}`);
    this.visboprojectversionService.updateVisboProjectVersion(this.visboprojectversion, this.deleted)
      .subscribe(
        (vpv) => {
          this.alertService.success(`Visbo Project Version ${vpv.name} updated successfully`, true);
          const index = this.visboprojectversions.findIndex(item => item._id === vpv._id);
          if (index >= 0) {
            this.visboprojectversions.splice(index, 1);
          }
        },
        error => {
          this.log(`save VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpv.msg.errorPermVersion', {'name': this.visboprojectversion.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpv.msg.errorConsistencyUnDelete', {'name': this.visboprojectversion.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  gotoVP(visboproject: VisboProject): void {
    this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)]);
  }

  gotoKMVersion(vpv: VisboProjectVersion): void {
    this.router.navigate(['vpKeyMetrics/'.concat(vpv.vpid)], { queryParams: { refDate: vpv.timestamp }});
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVCDetail(visboproject: VisboProject): void {
    this.router.navigate(['vcDetail/'.concat(visboproject.vcid)]);
  }

  sortVPVTable(n: number): void {
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
    this.messageService.add('VisboProjectVersion: ' + message);
  }
}
