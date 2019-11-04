import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { FormsModule }   from '@angular/forms';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboCenter } from '../_models/visbocenter';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService }  from '../_services/visboproject.service';

@Component({
  selector: 'app-sysvisboproject-detail',
  templateUrl: './sysvisboproject-detail.component.html',
  styleUrls: ['./sysvisboproject-detail.component.css']
})
export class SysvisboprojectDetailComponent implements OnInit {
  @Input() visboproject: VisboProject;
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  vgGroupsInvite: VGGroup[];
  actGroup: any = {};
  userIndex: number;
  groupIndex: number;
  showGroups: boolean;
  newUserInvite: any = {};

  combinedPerm: VGPermission = undefined;
  permSystem: any = VGPSystem;
  permVC: any = VGPVC;
  permVP: any = VGPVP;
  deleted: boolean = false;

  sortUserColumn: number = 1;
  sortUserAscending: boolean = true;
  sortGroupColumn: number = 1;
  sortGroupAscending: boolean = true;

  constructor(
    private messageService: MessageService,
    private visbocenterService: VisboCenterService,
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private location: Location,
    private alertService: AlertService,
    private router: Router
  ) { }

  ngOnInit() {
    this.combinedPerm = this.visbocenterService.getSysAdminRole()
    this.getVisboProject();
    this.getVisboProjectUsers();
    this.log(`SysAdmin Role: ${JSON.stringify(this.combinedPerm)}`)
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    this.log('VisboProject Detail of: ' + id);
    this.visboprojectService.getVisboProject(id, true)
      .subscribe(
        visboproject => {
          this.visboproject = visboproject
          this.combinedPerm = visboproject.perm;
          this.log(`Get VisboProject ${id} Perm ${JSON.stringify(this.combinedPerm)}`)
        },
        error => {
          this.log(`get VPs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

  gotoVPAudit(visboproject: VisboProject):void {
    this.log(`GoTo VP Audit ${visboproject.name} ${this.visboproject.name}`)
    this.router.navigate(['vpAudit/'.concat(visboproject._id)], { queryParams: { sysadmin: 1 }});
  }

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0
  }

  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0
  }

  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm.vp & perm) > 0
  }

  toggleUserGroup(): void {
    this.showGroups = !this.showGroups;
  }

  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    this.log('VisboProject UserList of: ' + id);
    this.visboprojectService.getVPUsers(id, true)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.log(`fetched Users ${this.vgUsers.length}, Groups ${this.vgGroups.length}`)
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VP Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied`);
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
    // remove item from list
    // this.visboprojectService.deleteVisboProject(visboproject).subscribe();
    // this.goBack();
    this.visboprojectService.deleteVisboProject(visboproject)
      .subscribe(
        () => { this.goBack() },
        error => {
          this.log(`delete VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${visboproject.name}`);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  gotoVCDetail(visboproject: VisboProject):void {
    this.router.navigate(['sysvcDetail/'.concat(visboproject.vcid)]);
  }

  gotoVPList(visboproject: VisboProject):void {
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
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${this.visboproject.name}`);
          } else if (error.status == 409) {
            this.alertService.error(`Visbo Project ${this.visboproject.name} exists already`);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  addNewVPUser(): void {
    var email = this.newUserInvite.email.trim();
    var groupName = this.newUserInvite.groupName.trim();
    var inviteGroup = this.vgGroups.filter(group => group.name == groupName)[0]
    var groupId = inviteGroup._id;
    var inviteMessage = '';
    if (this.newUserInvite.inviteMessage) inviteMessage = this.newUserInvite.inviteMessage.trim();
    var vpid = this.visboproject._id;
    this.log(`Add VisboProject User: ${email} Group: ${groupName}/${groupId} VP: ${vpid}`);
    if (!email || !groupId) { return; }
    this.visboprojectService.addVPUser(email, groupId, inviteMessage, vpid, true)
      .subscribe(
        group => {
          // Add User to User & Group list
          var newUserGroup = new VGUserGroup();
          newUserGroup.userId = group.users.filter(user => user.email == email)[0].userId;
          newUserGroup.email = email;
          newUserGroup.groupId = group._id;
          newUserGroup.groupName = group.name;
          newUserGroup.groupType = inviteGroup.groupType;
          newUserGroup.internal = inviteGroup.internal;
          this.log(`Add VisboCenter User Push: ${JSON.stringify(newUserGroup)}`);
          this.vgUsers.push(newUserGroup);
          this.sortUserTable();
          for (var i=0; i< this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id == group._id) {
              this.vgGroups[i] = group;
              break;
            }
          }
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.log(`Add VisboProject User error: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Add User to Visbo Project`);
          } else {
            this.log(`Error during add VP user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  helperRemoveUser(memberIndex: number):void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.userIndex = memberIndex
  }

  helperRemoveGroup(memberIndex: number):void {
    this.groupIndex = memberIndex
  }

  removeVPUser(user: VGUserGroup, vpid: string): void {
    this.log(`Remove VisboProject User: ${user.email}/${user.userId} Group: ${user.groupName} VP: ${vpid}`);
    this.visboprojectService.deleteVPUser(user, vpid, true)
      .subscribe(
        users => {
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser !== user);
          // filter user from vgGroups
          for (var i=0; i<this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id == user.groupId) {
              for (var j=0; j<this.vgGroups[i].users.length; j++) {
                if (this.vgGroups[i].users[j].userId == user.userId) {
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
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Remove User from Visbo Project`);
          } else {
            this.log(`Error during remove User from VP user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  helperVPPerm(newGroup: any): number {
    var perm: number = 0;
    if (newGroup.checkedVPView) perm += this.permVP.View;
    if (newGroup.checkedVPViewAudit) perm += this.permVP.ViewAudit;
    if (newGroup.checkedVPModify) perm += this.permVP.Modify;
    if (newGroup.checkedCreateVariant) perm += this.permVP.CreateVariant;
    if (newGroup.checkedVPManagePerm) perm += this.permVP.ManagePerm;
    if (newGroup.checkedVPDelete) perm += this.permVP.DeleteVP;

    return perm
  }

  initGroup(curGroup: VGGroup): void {

    if (curGroup) {
      this.actGroup.confirm = (curGroup.groupType == 'VP') ? 'Modify' : 'View';
      this.actGroup.gid = curGroup._id;
      this.log(`Init Group Set GroupID : ${this.actGroup.gid} ID ${curGroup._id}`);
      this.actGroup.groupName = curGroup.name;
      this.actGroup.groupType = curGroup.groupType;
      this.actGroup.internal = curGroup.internal;
      this.actGroup.checkGlobal = curGroup.global;
      this.actGroup.checkedView = (curGroup.permission.vc & this.permVC.View) > 0
      this.actGroup.checkedViewAudit = (curGroup.permission.vc & this.permVC.ViewAudit) > 0
      this.actGroup.checkedModify = (curGroup.permission.vc & this.permVC.Modify) > 0
      this.actGroup.checkedCreateVP = (curGroup.permission.vc & this.permVC.CreateVP) > 0
      this.actGroup.checkedManagePerm = (curGroup.permission.vc & this.permVC.ManagePerm) > 0

      this.actGroup.checkedVPView = (curGroup.permission.vp & this.permVP.View) > 0
      this.actGroup.checkedVPViewAudit = (curGroup.permission.vp & this.permVP.ViewAudit) > 0
      this.actGroup.checkedVPModify = (curGroup.permission.vp & this.permVP.Modify) > 0
      this.actGroup.checkedCreateVariant = (curGroup.permission.vp & this.permVP.CreateVariant) > 0
      this.actGroup.checkedVPManagePerm = (curGroup.permission.vp & this.permVP.ManagePerm) > 0
      this.actGroup.checkedVPDelete = (curGroup.permission.vp & this.permVP.DeleteVP) > 0
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
    var newGroup = new VGGroup;

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
            // update User List to reflect new Group Name & ID
            for (var i=0; i < this.vgUsers.length; i++) {
              if (this.vgUsers[i].groupId == newGroup._id) {
                this.vgUsers[i].groupName = group.name
              }
            }
            this.sortUserTable();
            this.sortGroupTable();
            this.alertService.success(`Group ${group.name} changed successfully`);
          },
          error => {
            this.log(`Modify VisboProject Group error: ${error.error.message}`);
            if (error.status == 403) {
              this.alertService.error(`Permission Denied: Modify Group to Visbo Project`);
            } else {
              this.log(`Error during modify VP Group ${error.error.message}`); // log to console instead
              this.alertService.error(error.error.message);
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
            if (error.status == 403) {
              this.alertService.error(`Permission Denied: Add Group to Visbo Center`);
            } else {
              this.log(`Error during add VC Group ${error.error.message}`); // log to console instead
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  sortUserTable(n: number = undefined) {

    if (!this.vgUsers) return
    // change sort order otherwise sort same column same direction
    if (n != undefined || this.sortUserColumn == undefined) {
      if (n != this.sortUserColumn) {
        this.sortUserColumn = n;
        this.sortUserAscending = undefined;
      }
      if (this.sortUserAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortUserAscending = (n == 1 || n == 2) ? true : false;
        // console.log("Sort VC Column undefined", this.sortUserColumn, this.sortUserAscending)
      } else this.sortUserAscending = !this.sortUserAscending;
    }
    // this.log(`Sort Users Column ${this.sortUserColumn}`); // log to console instead
    if (this.sortUserColumn == 1) {
      // sort user email
      this.vgUsers.sort(function(a, b) {
        var result = 0
        if (a.email > b.email)
          result = 1;
        else if (a.email < b.email)
          result = -1;
        return result
      })
    } else if (this.sortUserColumn == 2) {
      // sort user group name
      this.vgUsers.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.groupName.toLowerCase() > b.groupName.toLowerCase())
          result = 1;
        else if (a.groupName.toLowerCase() < b.groupName.toLowerCase())
          result = -1;
        return result
      })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortUserColumn, this.sortUserAscending)
    if (!this.sortUserAscending) {
      this.vgUsers.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortUserColumn, this.sortUserAscending)
    }
  }

  sortGroupTable(n: number = undefined) {

    if (!this.vgGroups) return
    // change sort order otherwise sort same column same direction
    if (n != undefined || this.sortGroupColumn == undefined) {
      if (n != this.sortGroupColumn) {
        this.sortGroupColumn = n;
        this.sortGroupAscending = undefined;
      }
      if (this.sortGroupAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortGroupAscending = (n == 1) ? true : false;
        // console.log("Sort VC Column undefined", this.sortGroupColumn, this.sortGroupAscending)
      }
      else this.sortGroupAscending = !this.sortGroupAscending;
    }
    // this.log(`Sort Groups Column ${this.sortGroupColumn}`); // log to console instead
    if (this.sortGroupColumn == 1) {
      // sort user email
      this.vgGroups.sort(function(a, b) {
        var result = 0
        if (a.name.toLowerCase() > b.name.toLowerCase())
          result = 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortGroupColumn == 2) {
      // sort user group name
      this.vgGroups.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        return b.users.length - a.users.length
      })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortGroupColumn, this.sortGroupAscending)
    if (!this.sortGroupAscending) {
      this.vgGroups.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortGroupColumn, this.sortGroupAscending)
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectDetail: ' + message);
  }
}
