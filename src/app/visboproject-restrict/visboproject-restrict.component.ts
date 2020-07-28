import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProject, VPTYPE, VPRestrict } from '../_models/visboproject';
import { VGGroup, VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';
import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-restrict',
  templateUrl: './visboproject-restrict.component.html',
  styleUrls: ['./visboproject-restrict.component.css']
})
export class VisboprojectRestrictComponent implements OnInit {

  visboproject: VisboProject;
  vgGroups: VGGroup[];
  actGroup: VGGroup;
  groupIndex: number;
  restrictIndex: number;
  newItemName: string;
  newItemPath: [string];
  newItemGroup: string;
  newItemInclChildren: boolean;

  combinedPerm: VGPermission = undefined;
  combinedUserPerm: VGPermission = undefined;
  permVC = VGPVC;
  permVP = VGPVP;
  deleted = false;

  sortRestrictColumn = 1;
  sortRestrictAscending = true;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private location: Location,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.queryParams['id'];
    if (id) {
      const pathItem = JSON.parse(localStorage.getItem('restrict'));
      if (pathItem && pathItem.id === id) {
        this.newItemPath = pathItem.path;
      }
    }
    this.log('VisboProject Restrict Active Path: ' + this.newItemPath);
    this.getVisboProject();
    this.getVisboProjectUsers();
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProject Restrict of: ' + id);
    this.visboprojectService.getVisboProject(id, false, this.deleted)
      .subscribe(
        visboproject => {
          this.visboproject = visboproject;
          this.combinedPerm = visboproject.perm;
          this.log(`Get VisboProject for VP ${id} Perm ${JSON.stringify(this.combinedPerm)} `);
        },
        error => {
          this.log(`get VPs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpRestrict.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasUserVPPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    // this.log(`Has User VP Permission ${perm}? ${(this.combinedUserPerm.vp & perm) > 0} `);
    return (this.combinedUserPerm.vp & perm) > 0;
  }

  getVPPerm(): number {
    if (this.combinedPerm === undefined) {
      return 0;
    }
    return this.combinedPerm.vp;
  }

  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  getRestrictPath(index: number, len?: number): string {
    const path = index >= 0 ? this.visboproject.restrict[index].elementPath : (this.newItemPath || [""]);
    let result = '';
    if (path.length <= 1) {
      result = this.visboproject.name;
    } else {
      result = path.slice(1).join(' / ');
    }
    if (len > 0) {
      result = visboGetShortText(result, len, 'right');
    }
    return result;
  }

  addRestriction(): void {
    this.log(`VisboProject Restrict Add Restriction : ${this.newItemPath.join(' / ')} ${this.newItemGroup} ${this.newItemInclChildren}`);
    const restrict = new VPRestrict();
    restrict.name = this.newItemName || (new Date()).toISOString();
    restrict.elementPath = this.newItemPath;
    restrict.groupid = this.newItemGroup;
    if (this.newItemInclChildren) {
      restrict.inclChildren = this.newItemInclChildren;
    }
    this.visboprojectService.addRestriction(this.visboproject._id, restrict)
      .subscribe(
        newRestriction => {
          this.log(`Add VisboProject Restriction result: ${JSON.stringify(newRestriction)}`);
          this.visboproject.restrict.push(newRestriction);
          const message = this.translate.instant('vpRestrict.msg.addRestrictionSuccess');
          localStorage.removeItem('restrict');
          this.newItemPath = undefined;
          this.alertService.success(message);
        },
        error => {
          this.log(`Add VisboProject Restriction error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpRestrict.msg.errorAddRestrictionPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during add Restriction from VP  ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  removeRestriction(index: number): void {
    const restrict = this.visboproject.restrict[index];
    this.log(`VisboProject Restrict Remove Restriction : ${index} ${restrict._id}`);
    this.visboprojectService.deleteRestriction(this.visboproject._id, restrict._id)
      .subscribe(
        response => {
          this.log(`Remove VisboProject Restriction result: ${JSON.stringify(response)}`);
          for (let i = 0; i < this.visboproject.restrict.length; i++) {
            if (this.visboproject.restrict[i]._id === restrict._id) {
              this.visboproject.restrict.splice(i, 1);
              break;
            }
          }
          const message = this.translate.instant('vpRestrict.msg.removeRestrictionSuccess');
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject Restriction error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpRestrict.msg.errorRemoveRestrictionPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove Restriction from VP  ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  helperRemoveRestriction(index: number): void {
    this.restrictIndex = index;
  }

  getGroupName(groupid: string): string {
    const group = this.vgGroups ? this.vgGroups.find(vgGroup => vgGroup._id === groupid) : undefined;
    return group ? group.name : 'Unknown';
  }

  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboProject UserList of: ${id} Deleted ${this.deleted}`);
    this.visboprojectService.getVPUsers(id, false, this.deleted)
      .subscribe(
        mix => {
          this.filterGroups(mix.groups);
          this.log(`fetched Groups ${this.vgGroups.length}`);
        },
        error => {
          this.log(`Get VP Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpRestrict.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  filterGroups(allGroups: VGGroup[]): void {
    this.vgGroups = [];
    allGroups.forEach(group => {
      // if (group.groupType === 'VP' && (group.permission.vp & this.permVP.ViewRestricted)) {
      if (group.groupType === 'VP') {
        this.vgGroups.push(group);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  gotoVPAudit(visboproject: VisboProject): void {
    this.log(`goto VP Audit: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vpAudit/'.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVCDetail(visboproject: VisboProject): void {
    this.router.navigate(['vcDetail/'.concat(visboproject.vcid)]);
  }

  gotoVPList(visboproject: VisboProject): void {
    this.log(`goto VP List: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vp/'.concat(visboproject.vcid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVP(visboproject: VisboProject): void {
    this.log(`goto VP: ${visboproject._id} Deleted ${this.deleted}`);
    let url = 'vpKeyMetrics/';
    if (visboproject.vpType === VPTYPE['Portfolio']) {
      url = 'vpf/';
    }
    this.router.navigate([url.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVPView(visboproject: VisboProject): void {
    this.log(`goto VP List: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vpv/'.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  sortRestrictTable(n?: number): void {

    if (!this.visboproject && !this.visboproject.restrict) {
      return;
    }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortRestrictColumn === undefined) {
      if (n !== this.sortRestrictColumn) {
        this.sortRestrictColumn = n;
        this.sortRestrictAscending = undefined;
      }
      if (this.sortRestrictAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortRestrictAscending = (n !== 5) ? true : false;
      } else {
        this.sortRestrictAscending = !this.sortRestrictAscending;
      }
    }
    if (this.sortRestrictColumn === 1) {
      this.visboproject.restrict.sort(function(a, b) {
        return visboCmpString(a.elementPath.join(' / ').toLowerCase(), b.elementPath.join(' / ').toLowerCase());
      });
    } else if (this.sortRestrictColumn === 2) {
      const idGroups = [];
      this.vgGroups.forEach(group => idGroups[group._id] = group.name);
      this.visboproject.restrict.sort(function(a, b) { return visboCmpString(idGroups[a.groupid], idGroups[b.groupid]); });
    } else if (this.sortRestrictColumn === 4) {
      this.visboproject.restrict.sort(function(a, b) { return visboCmpString(a.user.email, b.user.email); });
    } else if (this.sortRestrictColumn === 5) {
      this.visboproject.restrict.sort(function(a, b) { return visboCmpDate(a.createdAt, b.createdAt); });
    }
    if (!this.sortRestrictAscending) {
      this.visboproject.restrict.reverse();
    }
  }


  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectRestrict: ' + message);
  }
}
