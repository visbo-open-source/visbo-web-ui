import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VisboProjectVersion, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboprojects',
  templateUrl: './visboprojects.component.html'
})
export class VisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;

  visboprojectversions: VisboProjectVersion[];
  vpList: any[];
  vpvWithKM: number;
  vpvRefDate: Date = new Date();
  chart = false;
  modalChart = true;
  deleted = false;
  sortAscending: boolean;
  sortColumn: number;

  currentLang: string;
  currentView: string;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private visboprojectversionService: VisboProjectVersionService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.log(`Init GetVisboProjects ${JSON.stringify(this.route.snapshot.queryParams)}`);
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    const nextView = this.route.snapshot.queryParams['view'];
    if (nextView) { this.chart = true; }
    this.currentView = nextView || 'KeyMetrics';

    this.log(`Init VP View: ${this.currentView} Deleted: ${this.deleted}`);
    this.getVisboProjects(this.deleted);
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

  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  changeView(nextView: string): void {
    if (nextView === 'Capacity' || nextView === 'KeyMetrics' || nextView === 'ProjectBoard' || nextView === 'List') {
      this.currentView = nextView;
    } else {
      this.currentView = 'KeyMetrics';
    }
    const url = this.route.snapshot.url.join('/');
    const queryParams = {
      deleted: this.deleted,
      view: this.currentView
    };
    this.router.navigate([url], { queryParams: queryParams, replaceUrl: true });
  }

  toggleVisboChart(): void {
    this.chart = !this.chart;
    if (this.chart && !this.visboprojectversions) {
      this.getVisboProjectKeyMetrics();
    }
  }

  toggleVisboProjects(): void {
    this.deleted = !this.deleted;
    const url = this.route.snapshot.url.join('/');
    this.log(`VP toggleVisboProjects ${this.deleted} URL ${url}`);
    this.getVisboProjects(this.deleted);
    // MS TODO: go to the current url and add delete flag
    this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  getVisboProjects(deleted: boolean): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.vcSelected = id;
    if (id) {
      this.visbocenterService.getVisboCenter(id)
        .subscribe(
          visbocenters => {
            this.vcActive = visbocenters;
            this.combinedPerm = visbocenters.perm;
            this.visboprojectService.getVisboProjects(id, false, deleted)
              .subscribe(
                visboprojects => {
                  this.visboprojects = visboprojects;
                  this.sortVPTable(1);
                  if (this.chart) { this.getVisboProjectKeyMetrics(); }
                },
                error => {
                  this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
                  this.alertService.error(getErrorMessage(error));
                }
              );
          },
          error => {
            this.log(`get VC failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        );
    } else {
      this.vcSelected = null;
      this.vcActive = null;
      this.visboprojectService.getVisboProjects(null, false, deleted)
        .subscribe(
          visboprojects => {
            this.visboprojects = visboprojects;
            this.sortVPTable(1);
            // this.getVisboProjectKeyMetrics();
          },
          error => {
            this.log(`get VPs all failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        );
    }
  }

  addproject(name: string, vcid: string, desc: string): void {
    name = name.trim();
    this.log(`call create VP ${name} with VCID ${vcid} Desc ${desc} `);
    if (!name) { return; }
    this.visboprojectService.addVisboProject({ name: name, description: desc, vcid: vcid } as VisboProject).subscribe(
      vp => {
        // console.log("add VP %s with ID %s to VC %s", vp[0].name, vp[0]._id, vp[0].vcid);
        this.visboprojects.push(vp);
        this.sortVPTable(undefined);
        const message = this.translate.instant('vp.msg.createSuccess', {name: vp.name});
        this.alertService.success(message);
      },
      error => {
        this.log(`add VP failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vp.msg.errorPerm', {name: name});
          this.alertService.error(message);
        } else if (error.status === 409) {
          const message = this.translate.instant('vp.msg.errorConflict', {name: name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  getVisboProjectKeyMetrics(): void {
    this.log(`get VC keyMetrics ${this.vcActive.name} ${this.vcActive._id}`);

    this.visboprojectversionService.getVisboCenterProjectVersions(this.vcActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.calcVPList();
          this.log(`get VC Key metrics: Get ${visboprojectversions.length} Project Versions`);
          if (this.visboprojectversions.length === 0) {
            this.chart = false;
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vp.msg.errorPermVC');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  calcVPList(): void {
    if (!this.visboprojectversions?.length) { return; }
    this.vpList = [];
    this.vpvWithKM = 0;
    for (let i = 0; i < this.visboprojectversions.length; i++) {
      let nextVP: any;
      nextVP = {};
      const item = this.visboprojectversions[i];
      nextVP.vpid = item.vpid;
      nextVP.name = item.name;
      nextVP.variantName = item.variantName;
      nextVP.keyMetricsSet = 0;
      nextVP.timestamp = new Date(this.visboprojectversions[i].timestamp);
      nextVP.startDate = this.visboprojectversions[i].startDate;
      nextVP.endDate = this.visboprojectversions[i].keyMetrics?.endDateCurrent || this.visboprojectversions[i].endDate;
      nextVP.leadPerson = this.visboprojectversions[i].leadPerson;
      nextVP.VorlagenName = this.visboprojectversions[i].VorlagenName;
      nextVP.businessUnit = this.visboprojectversions[i].businessUnit;
      nextVP.status = this.visboprojectversions[i].status;
      nextVP.keyMetricsSet = this.visboprojectversions[i].keyMetrics ? 1 : 0;
      this.vpvWithKM += nextVP.keyMetricsSet;
      this.vpList.push(nextVP);
    }
  }

  gotoClickedRow(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    // MS TODO: use enumerator for Type
    if (visboproject.vpType === 1) {
      this.log(`goto VPF for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpf/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    } else {
      this.log(`goto VPV for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    }
  }

  // get the details of the project
  gotoDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVCDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['vcDetail/'.concat(visbocenter._id)]);
  }

  sortVPTable(n) {
    if (n !== undefined) {
      if (!this.visboprojects) {
        return;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    // console.log("Sort VP Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn === 1) {
      // sort by VP Name
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.visboprojects.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.vc.name.toLowerCase(), b.vc.name.toLowerCase());
      });
    } else if (this.sortColumn === 4) {
      // sort by VC vpvCount
      this.visboprojects.sort(function(a, b) {
        return a.vpvCount - b.vpvCount;
      });
    } else if (this.sortColumn === 5) {
      // sort by VP vpType
      this.visboprojects.sort(function(a, b) {
        return a.vpType - b.vpType;
      });
    }
    // console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visboprojects.reverse();
      // console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }


  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}
