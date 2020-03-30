import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-viewvpv',
  templateUrl: './visboproject-viewvpv.component.html',
  styleUrls: ['./visboproject-viewvpv.component.css']
})
export class VisboProjectViewVPVComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];

  vpSelected: string;
  vpActive: VisboProject;
  deleted = false;

  vpvActive: VisboProjectVersion;
  initVPVID: string;
  vpvRefDate: Date;

  sortAscending = false;
  sortColumn = 1;

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

    if (this.route.snapshot.queryParams.refDate) {
      this.vpvRefDate = new Date(this.route.snapshot.queryParams.refDate);
    }
    if (this.route.snapshot.queryParams.vpvid) {
      this.initVPVID = this.route.snapshot.queryParams.vpvid;
    }
    this.getVisboProjectVersions();
  }

  onSelect(visboprojectversion: VisboProjectVersion): void {
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
    this.parentThis = this;
    const chartFlag = this.chart;

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
                  this.sortVPVTable(undefined);
                  this.log(`get VPV: Get ${visboprojectversions.length} Project Versions`);
                  this.vpvActive = visboprojectversions[0];
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

  sameDay(dateA: Date, dateB: Date): boolean {
    const localA = new Date(dateA);
    const localB = new Date(dateB);
    localA.setHours(0, 0, 0, 0);
    localB.setHours(0, 0, 0, 0);
    // return false;
    return localA.getTime() === localB.getTime();
  }

  gotoViewCost(): void {
    this.log(`goto VPV View Cost ${this.vpvKeyMetricActive.vpid} `);
    const queryParams = { vpvid: this.vpvKeyMetricActive._id };
    this.router.navigate(['vpViewCost/'.concat(this.vpvKeyMetricActive.vpid)], { queryParams: queryParams});
  }

  gotoViewDelivery(vpv: VisboProjectVersion): void {
    if (!vpv) {
      vpv = visboprojectversions[0];
    }
    this.log(`goto VPV View Delivery ${vpv._id} `);
    const queryParams = { vpvid: vpv._id };
    this.router.navigate(['vpViewDelivery/'.concat(vpv.vpid)], { queryParams: queryParams});
  }

  gotoViewDeadline(vpv: VisboProjectVersion): void {
    if (!vpv) {
      vpv = visboprojectversions[0];
    }
    this.log(`goto VPV View Deadline ${vpv._id} `);
    const queryParams = { vpvid: vpv._id };
    this.router.navigate(['vpViewDeadline/'.concat(vpv.vpid)], { queryParams: queryParams});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion): void {
    this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], {});
  }

  gotoRoot(): void {
    this.log(`goto Root as no id is specified`);
    this.router.navigate(['/'], {});
  }

  listSelectRow(vpv: VPVKeyMetricsCalc): void {
    this.log(`List: User selected ${vpv._id} ${vpv.name}`);
    this.setVpvActive(vpv);
  }

  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  showHistory(newValue: boolean) {
    this.history = newValue;
    this.historyButton = this.history ? this.translate.instant('vpKeyMetric.lbl.hideTrend') : this.translate.instant('vpKeyMetric.lbl.showTrend');
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

  sortVPVTable(n) {
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
    this.messageService.add('VisboProjectViewVPV: ' + message);
  }

}
