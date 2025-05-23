import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AlertService } from '../../_services/alert.service';
import { MessageService } from '../../_services/message.service';
import { VisboUserInvite } from '../../_models/visbouser';
import { VGGroup, VGGroupExpanded, VGPermission, VGUserGroup, VGPSYSTEM, VGPVC, VGPVP } from '../../_models/visbogroup';
import { VisboCenterService } from '../../_services/visbocenter.service';
import { VisboProject } from '../../_models/visboproject';
import { VisboProjectService } from '../../_services/visboproject.service';

import { getErrorMessage, visboCmpString } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-sysvisboproject-detail',
  templateUrl: './sysvisboproject-detail.component.html',
  styleUrls: ['./sysvisboproject-detail.component.css']
})

  // Overview
  // The SysvisboprojectDetailComponent is an Angular component used in the VISBO platform
  // to administer a specific Visbo Project (VP). 
  // It supports:
  // -  Loading and displaying detailed project information.
  // -  Managing user-group associations and permissions.
  // -  Adding/removing groups and users.
  // -  Displaying and editing permission settings at the project level.
export class SysvisboprojectDetailComponent implements OnInit {
  @Input() visboproject: VisboProject;
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  vgGroupsInvite: VGGroup[];
  actGroup: VGGroupExpanded;
  confirm: string;
  userIndex: number;
  groupIndex: number;
  showGroups: boolean;
  newUserInvite = new VisboUserInvite();

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
    private visboprojectService: VisboProjectService,
    private location: Location,
    private alertService: AlertService,
    private router: Router
  ) { }

  // Loads system administrator permissions.
  // Fetches project details via getVisboProject().
  // Loads associated users and groups with getVisboProjectUsers().
  ngOnInit(): void {
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    this.getVisboProject();
    this.getVisboProjectUsers();
    this.log(`SysAdmin Role: ${JSON.stringify(this.combinedPerm)}`);
  }

  // Fetches the project details based on the route parameter (id) and stores permissions.
  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProject Detail of: ' + id);
    this.visboprojectService.getVisboProject(id, true)
      .subscribe(
        visboproject => {
          this.visboproject = visboproject;
          this.combinedPerm = visboproject.perm;
          this.log(`Get VisboProject ${id} Perm ${JSON.stringify(this.combinedPerm)}`);
        },
        error => {
          this.log(`get VPs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Navigates to the audit view for the project.
  gotoVPAudit(visboproject: VisboProject): void {
    this.log(`GoTo VP Audit ${visboproject.name} ${this.visboproject.name}`);
    this.router.navigate(['vpAudit/'.concat(visboproject._id)], { queryParams: { sysadmin: 1 }});
  }

  // check for various levels of access (System, VisboCenter, VisboProject) by bitmask comparison.

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0;
  }

  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasUserVPPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    this.log(`Has User VP Permission ${perm}? ${(this.combinedUserPerm.vp & perm) > 0} `);
    return (this.combinedUserPerm.vp & perm) > 0;
  }

  toggleUserGroup(): void {
    this.showGroups = !this.showGroups;
  }

  // Fetches all user-group-permission associations for the project and initializes sorting.
  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProject User Group Perm List of: ' + id);
    this.visboprojectService.getVPUserGroupPerm(id, true)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.log(`fetched Users ${this.vgUsers.length}, Groups ${this.vgGroups.length}`);
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VP Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  goBack(): void {
    this.location.back();
  }

  delete(visboproject: VisboProject): void {
    // remove item from list
    // this.visboprojectService.deleteVisboProject(visboproject).subscribe();
    // this.goBack();
    this.visboprojectService.deleteVisboProject(visboproject)
      .subscribe(
        () => { this.goBack(); },
        error => {
          this.log(`delete VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${visboproject.name}`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  gotoVCDetail(visboproject: VisboProject): void {
    this.router.navigate(['sysvcDetail/'.concat(visboproject.vcid)]);
  }

  gotoVPList(visboproject: VisboProject): void {
    this.router.navigate(['sysvp/'.concat(visboproject.vcid)]);
  }

  save(): void {
    this.visboprojectService.updateVisboProject(this.visboproject)
      .subscribe(
        (vp) => {
          this.alertService.success(`Visbo Project ${vp.name} updated successfully`, true);
          this.goBack();
        },
        error => {
          this.log(`save VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${this.visboproject.name}`);
          } else if (error.status === 409) {
            this.alertService.error(`Visbo Project ${this.visboproject.name} exists already`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // Adds a new user to the project based on the input email and selected group. 
  // Updates the group and user lists.
  addNewVPUser(): void {
    const email = this.newUserInvite.email.trim();
    const groupName = this.newUserInvite.groupName.trim();
    const inviteGroup = this.vgGroups.filter(group => group.name === groupName)[0];
    const groupId = inviteGroup._id;
    const vpid = this.visboproject._id;
    let inviteMessage = '';
    if (this.newUserInvite.inviteMessage) {
      inviteMessage = this.newUserInvite.inviteMessage.trim();
    }
    this.log(`Add VisboProject User: ${email} Group: ${groupName}/${groupId} VP: ${vpid}`);
    if (!email || !groupId) { return; }
    this.visboprojectService.addVPUser(email, groupId, inviteMessage, vpid, true)
      .subscribe(
        group => {
          // Add User to User & Group list
          const newUserGroup = new VGUserGroup();
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
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.log(`Add VisboProject User error: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Add User to Visbo Project`);
          } else {
            this.log(`Error during add VP user ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // Calculates the combined effective permissions for a user based on all their groups.
  calcCombinedPerm(memberIndex: number): void {
    this.userIndex = memberIndex;
    this.combinedUserPerm = {system: 0, vc: 0, vp: 0};
    this.vgUsers.forEach(this.addUserPerm, this);
    this.log(`Combined Permission for ${this.vgUsers[memberIndex].email}  ${JSON.stringify(this.combinedUserPerm)}`);
  }

  // Adds a user's group permissions to the overall combinedUserPerm.
  addUserPerm(listUser: VGUserGroup): void {
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

  // Returns the number of users in a group.
  helperUsersPerGroup(groupName: string): number {
    const group = this.vgGroups && this.vgGroups.find(x => x.name === groupName);
    if (group) {
      return group.users.length;
    }
    return 0;
  }

  // Removes a user from the project and synchronizes 
  // both the user list and the associated group’s user list.
  removeVPUser(user: VGUserGroup, vpid: string): void {
    this.log(`Remove VisboProject User: ${user.email}/${user.userId} Group: ${user.groupName} VP: ${vpid}`);
    this.visboprojectService.deleteVPUser(user, vpid, true)
      .subscribe(
        () => {
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
          this.log(`Remove VisboProject User error: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Remove User from Visbo Project`);
          } else {
            this.log(`Error during remove User from VP user ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
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

  // Triggers permission calculation or group setup when a group is selected.
  activateGroup(userGroup: VGUserGroup): void {
    this.log(`Activate Group : ${userGroup.groupName}`);
    const group = this.vgGroups.find(item => item.name == userGroup.groupName);
    this.initGroup(group);
  }

  // Triggers permission calculation or group setup when a user is selected.
  activateUser(userGroup: VGUserGroup): void {
    this.log(`Activate User : ${userGroup.email}`);
    const memberIndex = this.vgUsers.findIndex(item => item.email == userGroup.email)
    if (memberIndex >= 0) {
      this.calcCombinedPerm(memberIndex);
    }
  }

  // Initializes the actGroup model either for creation (if no group exists) 
  // or for editing (existing group).
  initGroup(curGroup: VGGroup): void {
    this.actGroup = new VGGroupExpanded();
    if (curGroup) {
      this.confirm = (curGroup.groupType === 'VP') ? 'Modify' : 'View';
      this.actGroup._id = curGroup._id;
      this.log(`Init Group Set GroupID : ${this.actGroup._id} ID ${curGroup._id}`);
      this.actGroup.name = curGroup.name;
      this.actGroup.groupType = curGroup.groupType;
      this.actGroup.internal = curGroup.internal;
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
      this.actGroup.groupType = 'VP';
      this.actGroup.internal = false;
      this.actGroup.global = false;
      this.actGroup.checkedView = true;
    }
    this.log(`Init Group for Creation / Modification: ${this.actGroup.name} ID ${this.actGroup._id} Action ${this.confirm} `);

  }

  // Creates or updates a project-specific user group and sets VP-level permissions.
  addModifyVPGroup(): void {
    const newGroup = new VGGroup;

    this.log(`Modify VisboProject Group: Group: ${this.actGroup.name} VC: ${this.visboproject.vcid} VP: ${this.visboproject._id} }`);
    newGroup.name = this.actGroup.name.trim();
    newGroup.global = false;
    newGroup.vcid = this.visboproject.vcid;
    newGroup.vpids = [];
    newGroup.vpids.push(this.visboproject._id);
    newGroup.permission = new VGPermission;
    newGroup.permission.vp = this.helperVPPerm(this.actGroup);

    if (this.actGroup._id) {
      // modify existing Group
      this.log(`Modify VisboProject Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: ${JSON.stringify(newGroup.permission)}`);
      newGroup._id = this.actGroup._id;
      this.visboprojectService.modifyVPGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            this.log(`Modify VisboProject Group Push: ${JSON.stringify(group)}`);
            this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup._id !== newGroup._id);
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
            this.log(`Modify VisboProject Group error: ${error.error.message}`);
            if (error.status === 403) {
              this.alertService.error(`Permission Denied: Modify Group to Visbo Project`);
            } else {
              this.log(`Error during modify VP Group ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    } else {
      // create new Group
      this.log(`Add VisboCenter Group: Group: ${newGroup.name} VP: ${newGroup.vpids[0]} Perm: ${JSON.stringify(newGroup.permission)}`);
      this.visboprojectService.addVPGroup(newGroup)
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
              this.log(`Error during add VC Group ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  // Sorts the user list by email or group name.
  sortUserTable(n?: number): void {
    if (!this.vgUsers) { return; }
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

  // Sorts the group list by name or user count.
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
    this.messageService.add('VisboProjectDetail: ' + message);
  }
}
