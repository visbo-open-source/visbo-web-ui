import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';
import { visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-detail',
  templateUrl: './visboproject-detail.component.html',
  styleUrls: ['./visboproject-detail.component.css']
})
export class VisboprojectDetailComponent implements OnInit {

  @Input() visboproject: VisboProject;
  newUserInvite: any = {};
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  vgGroupsInvite: VGGroup[];
  actGroup: any = {};
  userIndex: number;
  groupIndex: number;
  showGroups: boolean;

  combinedPerm: VGPermission = undefined;
  combinedUserPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;
  deleted = false;

  sortUserColumn = 1;
  sortUserAscending = true;
  sortGroupColumn = 1;
  sortGroupAscending = true;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private location: Location,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboProject();
    this.getVisboProjectUsers();
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProject Detail of: ' + id);
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
            let message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
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
    this.log(`Has User VP Permission ${perm}? ${(this.combinedUserPerm.vp & perm) > 0} `);
    return (this.combinedUserPerm.vp & perm) > 0;
  }

  getVPPerm(): number {
    if (this.combinedPerm === undefined) {
      return 0;
    }
    return this.combinedPerm.vp;
  }

  getVPType(vpType: number): string {
    return VPTYPE[vpType];
  }

  toggleUserGroup(): void {
    this.showGroups = !this.showGroups;
  }

  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboProject UserList of: ${id} Deleted ${this.deleted}`);
    this.visboprojectService.getVPUsers(id, false, this.deleted)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');

          this.log(`fetched Users ${this.vgUsers.length}, Groups ${this.vgGroups.length}, Invite Groups ${this.vgGroupsInvite.length}`);
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VP Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  goBack(): void {
    this.location.back();
  }

  delete(visboproject: VisboProject): void {
    this.visboprojectService.deleteVisboProject(visboproject, this.deleted)
      .subscribe(
        () => {
          let message = this.translate.instant('vpDetail.msg.removeProjectSuccess', {'name': this.visboproject.name});
          this.alertService.success(message, true);
          this.log(`delete VP success`);
          // could not use go back as it is used from different places and produces access denied if it returns to KeyMetrics View
          this.router.navigate(['vp/'.concat(visboproject.vcid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
        },
        error => {
          this.log(`delete VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': visboproject.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
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
    this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  save(): void {
    this.visboprojectService.updateVisboProject(this.visboproject, this.deleted)
      .subscribe(
        (vp) => {
          let message = this.translate.instant('vpDetail.msg.updateProjectSuccess', {'name': this.visboproject.name});
          this.alertService.success(message, true);
          this.goBack();
        },
        error => {
          this.log(`save VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': this.visboproject.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            let message = this.translate.instant('vpDetail.msg.errorVPConflict', {'name': this.visboproject.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  addNewVPUser(): void {
    const email = this.newUserInvite.email.trim();
    const groupName = this.newUserInvite.groupName.trim();
    const inviteGroup = this.vgGroups.filter(group => group.name === groupName)[0];
    const groupId = inviteGroup._id;
    let inviteMessage = '';
    if (this.newUserInvite.inviteMessage) {
      inviteMessage = this.newUserInvite.inviteMessage.trim();
    }
    const vpid = this.visboproject._id;

    this.log(`Add VisboProject User: ${email} Group: ${groupName}/${groupId} VP: ${vpid}`);
    if (!email || !groupId) { return; }
    this.visboprojectService.addVPUser(email, groupId, inviteMessage, vpid )
      .subscribe(
        group => {
          // Add User to User & Group list
          let newUserGroup: VGUserGroup;
          newUserGroup = new VGUserGroup();
          newUserGroup.userId = group.users.filter(user => user.email === email)[0].userId;
          newUserGroup.email = email;
          newUserGroup.groupId = group._id;
          newUserGroup.groupName = group.name;
          newUserGroup.groupType = inviteGroup.groupType;
          newUserGroup.internal = inviteGroup.internal;
          this.log(`Add VisboCenter User Push: ${JSON.stringify(newUserGroup)}`);
          this.vgUsers.push(newUserGroup);
          this.sortUserTable();
          for (let i = 0; i < this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id === group._id) {
              this.vgGroups[i] = group;
              break;
            }
          }
          let message = this.translate.instant('vpDetail.msg.addUserSuccess', {'name': email});
          this.alertService.success(message);
        },
        error => {
          this.log(`Add VisboProject User error: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorAddUserPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during add VP user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  calcCombinedPerm(memberIndex: number): void {
    this.userIndex = memberIndex;
    this.combinedUserPerm = {system: 0, vc: 0, vp: 0};
    this.vgUsers.forEach(this.addUserPerm, this);
    this.log(`Combined Permission for ${this.vgUsers[memberIndex].email}  ${JSON.stringify(this.combinedUserPerm)}`);
  }

  addUserPerm(listUser): void {
    if (listUser.email !== this.vgUsers[this.userIndex].email) {
      return;
    }
    this.log(`Add User Permission for ${listUser.groupName}`);

    const indexGroup = this.vgGroups.findIndex(x => x.name === listUser.groupName);
    if (indexGroup >= 0) {
      if (this.vgGroups[indexGroup].permission) {
        this.combinedUserPerm.vp = this.combinedUserPerm.vp | (this.vgGroups[indexGroup].permission.vp || 0);
      } else {
        this.log(`Permission for Group not set ${listUser.groupName}`);
      }
    } else {
      this.log(`Group not found ${listUser.groupName}`);
    }
  }

  helperRemoveUser(memberIndex: number): void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.userIndex = memberIndex;
  }

  helperRemoveGroup(memberIndex: number): void {
    this.groupIndex = memberIndex;
  }

  helperUsersPerGroup(groupName: string): number {
    const group = this.vgGroups && this.vgGroups.find(x => x.name === groupName);
    if (group) {
      return group.users.length;
    }
    return 0;
  }

  removeVPUser(user: VGUserGroup, vpid: string): void {
    this.log(`Remove VisboProject User: ${user.email}/${user.userId} Group: ${user.groupName} VP: ${vpid}`);
    this.visboprojectService.deleteVPUser(user, vpid)
      .subscribe(
        users => {
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser !== user);
          // filter user from vgGroups
          for (let i = 0; i < this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id === user.groupId) {
              for (let j = 0; j < this.vgGroups[i].users.length; j++) {
                if (this.vgGroups[i].users[j].userId === user.userId) {
                  this.vgGroups[i].users.splice(j, 1); // remove item from array
                  break;
                }
              }
              break;
            }
          }
          let message = this.translate.instant('vpDetail.msg.removeUserSuccess', {'name': user.email});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject User error: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorRemoveUserPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove User from VP user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  helperVPPerm(newGroup: any): number {
    let perm = 0;
    if (newGroup.checkedVPView) {
      perm += this.permVP.View;
    }
    if (newGroup.checkedVPViewAudit) {
      perm += this.permVP.ViewAudit;
    }
    if (newGroup.checkedVPModify) {
      perm += this.permVP.Modify;
    }
    if (newGroup.checkedCreateVariant) {
      perm += this.permVP.CreateVariant;
    }
    if (newGroup.checkedVPManagePerm) {
      perm += this.permVP.ManagePerm;
    }
    if (newGroup.checkedVPDelete) {
      perm += this.permVP.DeleteVP;
    }

    return perm;
  }

  initGroup(curGroup: VGGroup): void {

    if (curGroup) {
      this.actGroup.confirm = (curGroup.groupType === 'VP') ? 'Modify' : 'View';
      this.actGroup.gid = curGroup._id;
      this.log(`Init Group Set GroupID : ${this.actGroup.gid} ID ${curGroup._id}`);
      this.actGroup.groupName = curGroup.name;
      this.actGroup.groupType = curGroup.groupType;
      this.actGroup.internal = curGroup.internal;
      this.actGroup.checkGlobal = curGroup.global;
      this.actGroup.checkedView = (curGroup.permission.vc & this.permVC.View) > 0;
      this.actGroup.checkedViewAudit = (curGroup.permission.vc & this.permVC.ViewAudit) > 0;
      this.actGroup.checkedModify = (curGroup.permission.vc & this.permVC.Modify) > 0;
      this.actGroup.checkedCreateVP = (curGroup.permission.vc & this.permVC.CreateVP) > 0;
      this.actGroup.checkedManagePerm = (curGroup.permission.vc & this.permVC.ManagePerm) > 0;

      this.actGroup.checkedVPView = (curGroup.permission.vp & this.permVP.View) > 0;
      this.actGroup.checkedVPViewAudit = (curGroup.permission.vp & this.permVP.ViewAudit) > 0;
      this.actGroup.checkedVPModify = (curGroup.permission.vp & this.permVP.Modify) > 0;
      this.actGroup.checkedCreateVariant = (curGroup.permission.vp & this.permVP.CreateVariant) > 0;
      this.actGroup.checkedVPManagePerm = (curGroup.permission.vp & this.permVP.ManagePerm) > 0;
      this.actGroup.checkedVPDelete = (curGroup.permission.vp & this.permVP.DeleteVP) > 0;
    } else {
      this.actGroup.confirm = 'Add';
      this.actGroup.gid = undefined;
      this.actGroup.groupName = '';
      this.actGroup.groupType = 'VP';
      this.actGroup.internal = false;
      this.actGroup.checkGlobal = false;
      this.actGroup.checkedView = true;
    }
    this.log(`Init Group for Creation / Modification: ${this.actGroup.groupName} ID ${this.actGroup.gid} Action ${this.actGroup.confirm} `);
  }

  addModifyVPGroup(): void {
    let newGroup: VGGroup;
    newGroup = new VGGroup;

    this.log(`Modify VisboProject Group: Group: ${this.actGroup.groupName} VC: ${this.visboproject.vcid} VP: ${this.visboproject._id} }`);
    newGroup.name = this.actGroup.groupName.trim();
    newGroup.global = false;
    newGroup.vcid = this.visboproject.vcid;
    newGroup.vpids = [];
    newGroup.vpids.push(this.visboproject._id);
    newGroup.permission = new VGPermission;
    newGroup.permission.vp = this.helperVPPerm(this.actGroup);

    if (this.actGroup.gid) {
      // modify existing Group
      this.log(`Modify VisboProject Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: ${JSON.stringify(newGroup.permission)}`);
      newGroup._id = this.actGroup.gid;
      this.visboprojectService.modifyVPGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            this.log(`Modify VisboProject Group Push: ${JSON.stringify(group)}`);
            this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup._id !== newGroup._id);
            this.vgGroups.push(group);
            this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');
            // update User List to reflect new Group Name & ID
            for (let i = 0; i < this.vgUsers.length; i++) {
              if (this.vgUsers[i].groupId === newGroup._id) {
                this.vgUsers[i].groupName = group.name;
              }
            }
            this.sortUserTable();
            this.sortGroupTable();
            let message = this.translate.instant('vpDetail.msg.changeGroupSuccess', {'name': group.name});
            this.alertService.success(message);
          },
          error => {
            this.log(`Modify VisboProject Group error: ${error.error.message}`);
            if (error.status === 403) {
              let message = this.translate.instant('vpDetail.msg.errorChangeGroupPerm');
              this.alertService.error(message);
            } else {
              this.log(`Error during modify VP Group ${error.error.message}`); // log to console instead
              this.alertService.error(error.error.message);
            }
          }
        );
    } else {
      // create new Group
      this.log(`Add VisboProject Group: Group: ${newGroup.name} VP: ${newGroup.vpids[0]} Perm: ${JSON.stringify(newGroup.permission)}`);
      this.visboprojectService.addVPGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Add VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vgGroups.push(group);
            this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');
            let message = this.translate.instant('vpDetail.msg.createGroupSuccess', {'name': group.name});
            this.alertService.success(message);
          },
          error => {
            this.log(`Add VisboProject Group error: ${error.error.message}`);
            if (error.status === 403) {
              let message = this.translate.instant('vpDetail.msg.errorCreateGroupPerm');
              this.alertService.error(message);
            } else {
              this.log(`Error during add VP Group ${error.error.message}`);
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  removeVPGroup(group: VGGroup, vpid: string ): void {
    this.log(`Remove VisboProject Group: ${group.name}/${group._id} VP: ${vpid}`);
    this.visboprojectService.deleteVPGroup(group, vpid)
      .subscribe(
        response => {
          this.log(`Remove VisboProject Group result: ${JSON.stringify(response)}`);
          // filter user from vgUsers
          this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup !== group);
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser.groupId !== group._id);
          this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');
          let message = this.translate.instant('vpDetail.msg.removeGroupSuccess', {'name': group.name});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject Group error: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorRemoveGroupPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove Group from VP user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  unlockVP(lockIndex: number ): void {
    const vpid = this.visboproject._id;
    const variantNameLock = this.visboproject.lock[lockIndex].variantName;
    this.log(`Remove VisboProject Lock: ${this.visboproject.name} Variant ${variantNameLock} ${this.visboproject.lock[lockIndex].expiresAt} VPID: ${vpid}`);
    this.visboprojectService.unlockVP(variantNameLock, vpid)
      .subscribe(
        response => {
          this.log(`Remove VisboProject Lock result: ${JSON.stringify(response)}`);
          for (let i = 0; i < this.visboproject.lock.length; i++) {
            if (this.visboproject.lock[i].variantName === variantNameLock) {
              this.visboproject.lock.splice(i, 1);
              break;
            }
          }
          let message = this.translate.instant('vpDetail.msg.removeLockSuccess');
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject Lock error: ${error.error.message}`);
          if (error.status === 403) {
            let message = this.translate.instant('vpDetail.msg.errorRemoveLockPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove Lock from VP  ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  sortUserTable(n?: number) {

    if (!this.vgUsers) {
      return;
    }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortUserColumn === undefined) {
      if (n !== this.sortUserColumn) {
        this.sortUserColumn = n;
        this.sortUserAscending = undefined;
      }
      if (this.sortUserAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortUserAscending = (n === 1 || n === 2) ? true : false;
      } else {
        this.sortUserAscending = !this.sortUserAscending;
      }
    }
    if (this.sortUserColumn === 1) {
      this.vgUsers.sort(function(a, b) { return visboCmpString(a.email, b.email); });
    } else if (this.sortUserColumn === 2) {
      this.vgUsers.sort(function(a, b) { return visboCmpString(a.groupName.toLowerCase(), b.groupName.toLowerCase()); });
    }
    if (!this.sortUserAscending) {
      this.vgUsers.reverse();
    }
  }

  sortGroupTable(n?: number) {

    if (!this.vgGroups) {
      return;
    }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortGroupColumn === undefined) {
      if (n !== this.sortGroupColumn) {
        this.sortGroupColumn = n;
        this.sortGroupAscending = undefined;
      }
      if (this.sortGroupAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortGroupAscending = (n === 1) ? true : false;
      } else {
        this.sortGroupAscending = !this.sortGroupAscending;
      }
    }
    if (this.sortGroupColumn === 1) {
      this.vgGroups.sort(function(a, b) { return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    } else if (this.sortGroupColumn === 2) {
      this.vgGroups.sort(function(a, b) { return b.users.length - a.users.length; });
    }
    if (!this.sortGroupAscending) {
      this.vgGroups.reverse();
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectDetail: ' + message);
  }
}
