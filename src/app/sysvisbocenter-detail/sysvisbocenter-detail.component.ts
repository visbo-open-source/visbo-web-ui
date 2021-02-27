import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboUserInvite } from '../_models/visbouser';
import { VGGroup, VGGroupExpanded, VGPermission, VGUserGroup, VGPSYSTEM, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboCenterService } from '../_services/visbocenter.service';

import { getErrorMessage, visboCmpString } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-sysvisbocenter-detail',
  templateUrl: './sysvisbocenter-detail.component.html',
  styleUrls: ['./sysvisbocenter-detail.component.css']
})
export class SysvisbocenterDetailComponent implements OnInit {

  @Input() visbocenter: VisboCenter;
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  newUserInvite = new VisboUserInvite();
  actGroup: VGGroupExpanded;
  confirm: string;
  userIndex: number;
  groupIndex: number;
  showGroups: boolean;
  combinedPerm: VGPermission;
  combinedUserPerm: VGPermission;
  permSystem = VGPSYSTEM;
  permVC = VGPVC;
  permVP = VGPVP;
  deleted = false;

  sortUserColumn = 1;
  sortUserAscending = true;
  sortGroupColumn = 1;
  sortGroupAscending = true;

  constructor(
    private messageService: MessageService,
    private visbocenterService: VisboCenterService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.log(`SysVisboCenter Init: ${JSON.stringify(this.visbocenter)}`);
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboCenter();
    this.getVisboCenterUsers();
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    // this.log(`SysAdmin Role: ${this.vcIsSysAdmin}`);
  }

  getVisboCenter(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboCenter Detail of: ${id} Deleted ${this.deleted}`);
    this.visbocenterService.getVisboCenter(id, true, this.deleted)
      .subscribe(
        visbocenter => {
          this.visbocenter = visbocenter;
          this.combinedPerm = visbocenter.perm;
          // this.log(`VisboCenter initialised ${this.visbocenter._id} Perm Sys ${JSON.stringify(this.combinedPerm)} `)
        },
        error => {
          this.log(`Get VC failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0;
  }

  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasUserVCPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    return (this.combinedUserPerm.vc & perm) > 0;
  }

  hasUserVPPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    return (this.combinedUserPerm.vp & perm) > 0;
  }

  getVisboCenterUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboCenter UserList of ${id} Deleted ${this.deleted}`);
    this.visbocenterService.getVCUsers(id, true, this.deleted)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.log(`fetched Users ${this.vgUsers.length}, Groups ${this.vgGroups.length}`);
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VC Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  gotoVCAudit(visbocenter: VisboCenter): void {
    this.log(`GoTo VC Audit ${visbocenter.name} ${this.visbocenter.name}`);
    const queryParams = this.deleted ? { sysadmin: 1, deleted: 1 } : { sysadmin: 1 };
    this.log(`GoTo VC Audit ${visbocenter.name} ${this.visbocenter.name} ${JSON.stringify(queryParams)}`);
    this.router.navigate(['vcAudit/'.concat(visbocenter._id)], { queryParams: queryParams});
  }

  gotoVPList(visbocenter: VisboCenter): void {
    this.log(`GoTo VP List ${JSON.stringify(this.combinedPerm)}`);
    if (this.hasVPPerm(this.permVP.View)) {
      this.router.navigate(['sysvp/'.concat(visbocenter._id)]);
    }
  }

  goBack(): void {
    // this.log(`VC Details go Back ${JSON.stringify(this.location)}`)
    this.location.back();
  }

  save(): void {
    this.log(`PUT VC: ${this.visbocenter.name} ID: ${this.visbocenter._id} Deleted: ${this.deleted}`);
    this.visbocenterService.updateVisboCenter(this.visbocenter, true, this.deleted)
      .subscribe(
        vc => {
          this.alertService.success(`Visbo Center ${vc.name} updated successfully`, true);
          this.goBack();
        },
        error => {
          this.log(`save VC failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Visbo Center ${this.visbocenter.name}`);
          } else if (error.status === 409) {
            this.alertService.error(`Visbo Center ${this.visbocenter.name} exists already`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  delete(visbocenter: VisboCenter): void {
    this.log(`Delete VC: ${visbocenter.name} ID: ${visbocenter._id} Deleted: ${this.deleted}`);
    this.visbocenterService.deleteVisboCenter(visbocenter, true, this.deleted)
      .subscribe(
        () => {
          this.alertService.success(`Visbo Center ${visbocenter.name} deleted successfully`, true);
          if (this.deleted) {
            this.router.navigate(['sysvc']);
          } else {
            this.goBack();
          }
        },
        error => {
          this.log(`delete VC failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Visbo Center ${visbocenter.name}`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  toggleUserGroup(): void {
    this.showGroups = !this.showGroups;
  }

  addNewVCUser(): void {
    const email = this.newUserInvite.email.trim();
    const groupName = this.newUserInvite.groupName.trim();
    const groupId = this.vgGroups.filter(group => group.name === groupName)[0]._id;
    const vcid = this.visbocenter._id;
    let inviteMessage = '';
    if (this.newUserInvite.inviteMessage) {
      inviteMessage = this.newUserInvite.inviteMessage.trim();
    }
    this.log(`Add VisboCenter User: ${email} Group: ${groupName}/${groupId} VC: ${vcid}`);
    if (!email || !groupId) {
      return;
    }
    this.visbocenterService.addVCUser(email, groupId, inviteMessage, vcid, true )
      .subscribe(
        group => {
          // Add User to User & Group list
          const newUserGroup = new VGUserGroup();
          newUserGroup.userId = group.users.filter(user => user.email === email)[0].userId;
          newUserGroup.email = email;
          newUserGroup.groupId = group._id;
          newUserGroup.groupName = group.name;
          this.log(`Add VisboCenter User Push: ${JSON.stringify(newUserGroup)}`);
          this.vgUsers.push(newUserGroup);
          this.sortUserTable();
          for (let i = 0; i < this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id === group._id) {
              this.vgGroups[i] = group;
              break;
            }
          }
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.log(`Add VisboCenter User error: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Add User to Visbo Center`);
          } else {
            this.log(`Error during add VC user ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  helperUserIndex(memberIndex: number): void {
    this.userIndex = memberIndex;
  }

  calcCombinedPerm(memberIndex: number): void {
    this.userIndex = memberIndex;
    this.combinedUserPerm = {system: 0, vc: 0, vp: 0};
    this.vgUsers.forEach(this.addUserPerm, this);
    this.log(`Combined Permission for ${this.vgUsers[memberIndex].email}  ${JSON.stringify(this.combinedUserPerm)}`);
  }

  addUserPerm(listUser: VGUserGroup): void {
    if (listUser.email !== this.vgUsers[this.userIndex].email) {
      return;
    }
    this.log(`Add User Permission for ${listUser.groupName}`);

    const indexGroup = this.vgGroups.findIndex(x => x.name === listUser.groupName);
    if (indexGroup >= 0) {
      if (this.vgGroups[indexGroup].permission) {
        this.combinedUserPerm.system = this.combinedUserPerm.system | (this.vgGroups[indexGroup].permission.system || 0);
        this.combinedUserPerm.vc = this.combinedUserPerm.vc | (this.vgGroups[indexGroup].permission.vc || 0);
        this.combinedUserPerm.vp = this.combinedUserPerm.vp | (this.vgGroups[indexGroup].permission.vp || 0);
      } else {
        this.log(`Permission for Group not set ${listUser.groupName}`);
      }
    } else {
      this.log(`Group not found ${listUser.groupName}`);
    }
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

  removeVCUser(user: VGUserGroup, vcid: string): void {
    this.log(`Remove VisboCenter User: ${user.email}/${user.userId} Group: ${user.groupName} VC: ${vcid}`);
    this.visbocenterService.deleteVCUser(user, vcid, true)
      .subscribe(
        () => {
          // this.log(`Remove VisboCenter User result: ${JSON.stringify(result)}`);
          // this.visbocenter.users = users;
          // filter user from vgUsers
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
          this.alertService.success(`User ${user.email} removed successfully`);
        },
        error => {
          this.log(`Remove VisboCenter User error: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Remove User from Visbo Center`);
          } else {
            this.log(`Error during remove VC user ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  helperVCPerm(newGroup: VGGroupExpanded): number {
    let perm = 0;
    if (newGroup.checkedView) { perm += this.permVC.View; }
    if (newGroup.checkedViewAudit) { perm += this.permVC.ViewAudit; }
    if (newGroup.checkedModify) { perm += this.permVC.Modify; }
    if (newGroup.checkedCreateVP) { perm += this.permVC.CreateVP; }
    if (newGroup.checkedManagePerm) { perm += this.permVC.ManagePerm; }

    return perm;
  }

  helperVPPerm(newGroup: VGGroupExpanded): number {
    let perm = 0;
    if (newGroup.checkedVPView) { perm += this.permVP.View; }
    if (newGroup.checkedVPViewAudit) { perm += this.permVP.ViewAudit; }
    if (newGroup.checkedVPModify) { perm += this.permVP.Modify; }
    if (newGroup.checkedCreateVariant) { perm += this.permVP.CreateVariant; }
    if (newGroup.checkedVPManagePerm) { perm += this.permVP.ManagePerm; }
    if (newGroup.checkedVPDelete) { perm += this.permVP.DeleteVP; }

    return perm;
  }

  activateGroup(userGroup: VGUserGroup): void {
    this.log(`Activate Group : ${userGroup.groupName}`);
    const group = this.vgGroups.find(item => item.name == userGroup.groupName);
    this.initGroup(group);
  }

  activateUser(userGroup: VGUserGroup): void {
    this.log(`Activate User : ${userGroup.email}`);
    const memberIndex = this.vgUsers.findIndex(item => item.email == userGroup.email)
    if (memberIndex >= 0) {
      this.calcCombinedPerm(memberIndex);
    }
  }

  initGroup(curGroup: VGGroup): void {

    this.actGroup = new VGGroupExpanded();
    if (curGroup) {
      this.confirm = 'Modify';
      this.actGroup._id = curGroup._id;
      this.log(`Init Group Set GroupID : ${this.actGroup._id} ID ${curGroup._id}`);
      this.actGroup.name = curGroup.name;
      this.actGroup.global = curGroup.global;
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
      this.confirm = 'Add';
      this.actGroup._id = undefined;
      this.actGroup.name = '';
      this.actGroup.global = false;
      this.actGroup.checkedView = true;
    }
    this.log(`Init Group for Creation / Modification: ${this.actGroup.name} ID ${this.actGroup._id}`);

  }

  addModifyVCGroup(): void {
    const newGroup = new VGGroup;

    newGroup.name = this.actGroup.name.trim();
    newGroup.global = this.actGroup.global;
    newGroup.vcid = this.visbocenter._id;
    newGroup.permission = new VGPermission;
    newGroup.permission.vc = this.helperVCPerm(this.actGroup);
    newGroup.permission.vp = this.helperVPPerm(this.actGroup);

    this.log(`Add/Modify VisboCenter Group: Group: ${newGroup.name} New/Modify ${this.actGroup._id}`);

    if (this.actGroup._id) {
      // modify existing Group
      this.log(`Modify VisboCenter Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: vc ${newGroup.permission.vc} vp ${newGroup.permission.vp}`);
      newGroup._id = this.actGroup._id;
      this.visbocenterService.modifyVCGroup(newGroup, true)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Modify VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vgGroups = this.vgGroups.filter(vcGroup => vcGroup._id !== newGroup._id);
            this.vgGroups.push(group);
            // update User List to reflect new Group Name & ID
            for (let i = 0; i < this.vgUsers.length; i++) {
              if (this.vgUsers[i].groupId === newGroup._id) {
                this.vgUsers[i].groupName = group.name;
              }
            }
            this.sortUserTable();
            this.sortGroupTable();
            this.alertService.success(`Group ${group.name} changed successfully`);
          },
          error => {
            this.log(`Modify VisboCenter Group error: ${error.error.message}`);
            if (error.status === 403) {
              this.alertService.error(`Permission Denied: Modify Group to Visbo Center`);
            } else {
              this.log(`Error during add VC Group ${error.error.message}`); // log to console instead
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    } else {
      // create new Group
      this.log(`Add VisboCenter Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: vc ${newGroup.permission.vc} vp ${newGroup.permission.vp}`);
      this.visbocenterService.addVCGroup(newGroup, true)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Add VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vgGroups.push(group);
            this.alertService.success(`Group ${group.name} added successfully`);
          },
          error => {
            this.log(`Add VisboCenter Group error: ${error.error.message}`);
            if (error.status === 403) {
              this.alertService.error(`Permission Denied: Add Group to Visbo Center`);
            } else {
              this.log(`Error during add VC Group ${error.error.message}`); // log to console instead
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  removeVCGroup(group: VGGroup ): void {
    this.log(`Remove VisboCenter Group: ${group.name}/${group._id} VC: ${group.vcid}`);
    this.visbocenterService.deleteVCGroup(group, true)
      .subscribe(
        response => {
          this.log(`Remove VisboCenter Group result: ${JSON.stringify(response)}`);
          // filter user from vgUsers
          this.vgGroups = this.vgGroups.filter(vcGroup => vcGroup !== group);
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser.groupId !== group._id);
          this.alertService.success(`Group ${group.name} removed successfully`);
        },
        error => {
          this.log(`Remove VisboCenter Group error: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Remove Group from Visbo Center`);
          } else {
            this.log(`Error during remove VC user ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  sortUserTable(n?: number): void {
    if (!this.vgUsers) { return; }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortUserColumn === undefined ) {
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

  sortGroupTable(n?: number): void {
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

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys VisboCenter Details: ' + message);
  }
}
