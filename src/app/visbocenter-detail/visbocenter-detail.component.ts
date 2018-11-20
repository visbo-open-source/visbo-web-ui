import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { FormsModule }   from '@angular/forms';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboCenter } from '../_models/visbocenter';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VisboPermission } from '../_models/visbogroup';
import { VCUser } from '../_models/visbocenter';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService }  from '../_services/visboproject.service';

const constPermVC = { "View": 1, "ViewAudit": 2, "Modify": 16, "ManagePerm": 32, "CreateVP": 256 };
const constPermVP = { "View": 1, "ViewAudit": 2, "Modify": 16, "ManagePerm": 32, "CreateVPV": 256, "DeleteVP": 1024 };
const permSystem = { "View": 1, "ViewAudit": 2, "ViewLog":4, "ManagePerm": 32, "ViewVC":128, "CreateVC":256, "ManageVC":512, "DeleteVC":1024 };

@Component({
  selector: 'app-visbocenter-detail',
  templateUrl: './visbocenter-detail.component.html'
})
export class VisboCenterDetailComponent implements OnInit {

  @Input() visbocenter: VisboCenter;
  vcUsers: VGUserGroup[];
  vcGroups: VGGroup[];
  newUserInvite: any = {};
  actGroup: any = {};
  vcPerm: number;
  vpPerm: number;
  systemPerm: number;
  userIndex: number;
  groupIndex: number;
  showGroups: boolean;
  permVC: any = constPermVC;
  permVP: any = constPermVP;
  testPerm: VisboPermission;

  sortUserColumn: number = 1;
  sortUserAscending: boolean = true;
  sortGroupColumn: number = 1;
  sortGroupAscending: boolean = true;

  constructor(
    private messageService: MessageService,
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.getVisboCenter();
    this.getVisboCenterUsers();
    // this.vcIsSysAdmin = this.visbocenterService.getSysAdminRole()
    // this.log(`SysAdmin Role: ${this.vcIsSysAdmin}`)
    this.log(`TEST PERM: ${JSON.stringify(this.testPerm)}`)
  }

  getVisboCenter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    //this.log('VisboCenter Detail of: ' + id);
    this.visbocenterService.getVisboCenter(id)
      .subscribe(
        visbocenter => {
          this.visbocenter = visbocenter;
          this.vcPerm = 0
          this.vpPerm = 0
          this.systemPerm = 0
          if (visbocenter.perm && visbocenter.perm.vc ) this.vcPerm = visbocenter.perm.vc
          if (visbocenter.perm && visbocenter.perm.vp ) this.vpPerm = visbocenter.perm.vp
          if (visbocenter.perm && visbocenter.perm.system ) this.systemPerm = visbocenter.perm.system
        },
        error => {
          this.log(`Get VC failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  hasVCPerm(perm: number): boolean {
    return (this.vcPerm & perm) > 0
  }

  hasVPPerm(perm: number): boolean {
    return (this.vpPerm & perm) > 0
  }

  getVisboCenterUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    this.log('VisboCenter UserList of: ' + id);
    this.visbocenterService.getVCUsers(id)
      .subscribe(
        mix => {
          this.vcUsers = mix.users;
          this.vcGroups = mix.groups;
          this.log(`fetched Users ${this.vcUsers.length}, Groups ${this.vcGroups.length}`)
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VC Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  gotoVCAudit(visbocenter: VisboCenter):void {
    this.router.navigate(['vcAudit/'.concat(visbocenter._id)]);
  }

  goBack(): void {
    // this.log(`VC Details go Back ${JSON.stringify(this.location)}`)
    this.location.back();
  }

  gotoVPList(visbocenter: VisboCenter):void {
    this.router.navigate(['vp/'.concat(visbocenter._id)]);
  }

  save(): void {
    this.visbocenterService.updateVisboCenter(this.visbocenter)
      .subscribe(
        vc => {
          this.alertService.success(`Visbo Center ${vc.name} updated successfully`, true);
          this.goBack()
        },
        error => {
          this.log(`save VC failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Center ${this.visbocenter.name}`);
          } else if (error.status == 409) {
            this.alertService.error(`Visbo Center ${this.visbocenter.name} exists already`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  delete(visbocenter: VisboCenter): void {
    this.log(`Delete VC: ${visbocenter.name} ID: ${visbocenter._id}`);
    this.visbocenterService.deleteVisboCenter(visbocenter)
      .subscribe(
        vc => {
          this.alertService.success(`Visbo Center ${visbocenter.name} deleted successfully`, true);
          this.goBack()
        },
        error => {
          this.log(`delete VC failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Center ${visbocenter.name}`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  toggleUserGroup(): void {
    this.showGroups = !this.showGroups;
  }

  addNewVCUser(): void {
    var email = this.newUserInvite.email.trim();
    var groupName = this.newUserInvite.groupName.trim();
    var groupId = this.vcGroups.filter(group => group.name == groupName)[0]._id;
    var inviteMessage = (this.newUserInvite.inviteMessage || '').trim();
    var vcid = this.visbocenter._id
    this.log(`Add VisboCenter User: ${email} Group: ${groupName}/${groupId} VC: ${vcid}`);
    if (!email || !groupId) { return; }
    this.visbocenterService.addVCUser(email, groupId, inviteMessage, vcid )
      .subscribe(
        group => {
          // TODO: Add User to User & Group list
          var newUserGroup = new VGUserGroup();
          newUserGroup.userId = group.users.filter(user => user.email == email)[0].userId;
          newUserGroup.email = email;
          newUserGroup.groupId = group._id;
          newUserGroup.groupName = group.name;
          this.log(`Add VisboCenter User Push: ${JSON.stringify(newUserGroup)}`);
          this.vcUsers.push(newUserGroup);
          this.sortUserTable();
          for (var i=0; i< this.vcGroups.length; i++) {
            if (this.vcGroups[i]._id == group._id) {
              this.vcGroups[i] = group;
              break;
            }
          }
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.log(`Add VisboCenter User error: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Add User to Visbo Center`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.log(`Error during add VC user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  helperRemoveUser(memberIndex: number):void {
    this.userIndex = memberIndex
  }

  helperRemoveGroup(memberIndex: number):void {
    this.groupIndex = memberIndex
  }

  removeVCUser(user: VGUserGroup, vcid: string): void {
    this.log(`Remove VisboCenter User: ${user.email}/${user.userId} Group: ${user.groupName} VC: ${vcid}`);
    this.visbocenterService.deleteVCUser(user, vcid)
      .subscribe(
        users => {
          // this.log(`Remove VisboCenter User result: ${JSON.stringify(result)}`);
          // this.visbocenter.users = users;
          // filter user from vcUsers
          this.vcUsers = this.vcUsers.filter(vcUser => vcUser !== user);
          // TODO: filter user from vcGroups
          for (var i=0; i<this.vcGroups.length; i++) {
            if (this.vcGroups[i]._id == user.groupId) {
              for (var j=0; j<this.vcGroups[i].users.length; j++) {
                if (this.vcGroups[i].users[j].userId == user.userId) {
                  this.vcGroups[i].users.splice(j, 1); // remove item from array
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
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Remove User from Visbo Center`);
          } else if (error.status == 401) {
            this.log('Re-login add VC user'); // log to console instead
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.log(`Error during remove VC user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  helperVCPerm(newGroup: any): number {
    var perm: number = 0;
    if (newGroup.checkedView) perm += this.permVC.View;
    if (newGroup.checkedViewAudit) perm += this.permVC.ViewAudit;
    if (newGroup.checkedModify) perm += this.permVC.Modify;
    if (newGroup.checkedCreateVP) perm += this.permVC.CreateVP;
    if (newGroup.checkedManagePerm) perm += this.permVC.ManagePerm;

    return perm
  }

  // const constPermVC = { "View": 1, "ViewAudit": 2, "Modify": 16, "ManagePerm": 32, "CreateVP": 256 };
  // const constPermVP = { "View": 1, "ViewAudit": 2, "Modify": 16, "ManagePerm": 32, "CreateVPV": 256, "DeleteVP": 1024 };
  // const permSystem = { "View": 1, "ViewAudit": 2, "ViewLog":4, "ManagePerm": 32, "ViewVC":128, "CreateVC":256, "ManageVC":512, "DeleteVC":1024 };

  helperVPPerm(newGroup: any): number {
    var perm: number = 0;
    if (newGroup.checkedVPView) perm += this.permVP.View;
    if (newGroup.checkedVPViewAudit) perm += this.permVP.ViewAudit;
    if (newGroup.checkedVPModify) perm += this.permVP.Modify;
    if (newGroup.checkedVPCreateVPV) perm += this.permVP.CreateVPV;
    if (newGroup.checkedVPManagePerm) perm += this.permVP.ManagePerm;
    if (newGroup.checkedVPDelete) perm += this.permVP.DeleteVP;

    return perm
  }

  initGroup(curGroup: VGGroup): void {

    if (curGroup) {
      this.actGroup.confirm = 'Modify';
      this.actGroup.gid = curGroup._id;
      this.log(`Init Group Set GroupID : ${this.actGroup.gid} ID ${curGroup._id}`);
      this.actGroup.groupName = curGroup.name;
      this.actGroup.checkGlobal = curGroup.global;
      this.actGroup.checkedView = (curGroup.permission.vc & this.permVC.View) > 0
      this.actGroup.checkedViewAudit = (curGroup.permission.vc & this.permVC.ViewAudit) > 0
      this.actGroup.checkedModify = (curGroup.permission.vc & this.permVC.Modify) > 0
      this.actGroup.checkedCreateVP = (curGroup.permission.vc & this.permVC.CreateVP) > 0
      this.actGroup.checkedManagePerm = (curGroup.permission.vc & this.permVC.ManagePerm) > 0

      this.actGroup.checkedVPView = (curGroup.permission.vp & this.permVP.View) > 0
      this.actGroup.checkedVPViewAudit = (curGroup.permission.vp & this.permVP.ViewAudit) > 0
      this.actGroup.checkedVPModify = (curGroup.permission.vp & this.permVP.Modify) > 0
      this.actGroup.checkedVPCreateVPV = (curGroup.permission.vp & this.permVP.CreateVPV) > 0
      this.actGroup.checkedVPManagePerm = (curGroup.permission.vp & this.permVP.ManagePerm) > 0
      this.actGroup.checkedVPDelete = (curGroup.permission.vp & this.permVP.DeleteVP) > 0
    } else {
      this.actGroup.confirm = 'Add';
      this.actGroup.gid = undefined;
      this.actGroup.groupName = '';
      this.actGroup.checkGlobal = false;
      this.actGroup.checkedView = true;
    }
    this.log(`Init Group for Creation / Modification: ${this.actGroup.groupName} ID ${this.actGroup.gid}`);

  }


  addModifyVCGroup(): void {
    var newGroup = new VGGroup;

    newGroup.name = this.actGroup.groupName.trim();
    newGroup.global = this.actGroup.checkGlobal;
    newGroup.vcid = this.visbocenter._id;
    newGroup.permission = new VGPermission;
    newGroup.permission.vc = this.helperVCPerm(this.actGroup);
    newGroup.permission.vp = this.helperVPPerm(this.actGroup);

    this.log(`Add/Modify VisboCenter Group: Group: ${newGroup.name} New/Modify ${this.actGroup.gid}`);

    if (this.actGroup.gid) {
      // modify existing Group
      this.log(`Modify VisboCenter Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: vc ${newGroup.permission.vc} vp ${newGroup.permission.vp}`);
      newGroup._id = this.actGroup.gid;
      this.visbocenterService.modifyVCGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Modify VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vcGroups = this.vcGroups.filter(vcGroup => vcGroup._id !== newGroup._id);
            this.vcGroups.push(group);
            // TODO update User List to reflect new Group Name & ID
            for (var i=0; i < this.vcUsers.length; i++) {
              if (this.vcUsers[i].groupId == newGroup._id) {
                this.vcUsers[i].groupName = group.name
              }
            }
            this.sortUserTable();
            this.sortGroupTable();
            this.alertService.success(`Group ${group.name} changed successfully`);
          },
          error => {
            this.log(`Modify VisboCenter Group error: ${error.error.message}`);
            if (error.status == 403) {
              this.alertService.error(`Permission Denied: Modify Group to Visbo Center`);
            } else if (error.status == 401) {
              this.alertService.error(`Session expired, please login again`, true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
            } else {
              this.log(`Error during add VC Group ${error.error.message}`); // log to console instead
              this.alertService.error(error.error.message);
            }
          }
        );
    } else {
      // create new Group
      this.log(`Add VisboCenter Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: vc ${newGroup.permission.vc} vp ${newGroup.permission.vp}`);
      this.visbocenterService.addVCGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Add VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vcGroups.push(group);
            this.alertService.success(`Group ${group.name} added successfully`);
          },
          error => {
            this.log(`Add VisboCenter Group error: ${error.error.message}`);
            if (error.status == 403) {
              this.alertService.error(`Permission Denied: Add Group to Visbo Center`);
            } else if (error.status == 401) {
              this.alertService.error(`Session expired, please login again`, true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
            } else {
              this.log(`Error during add VC Group ${error.error.message}`); // log to console instead
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  removeVCGroup(group: VGGroup ): void {
    this.log(`Remove VisboCenter Group: ${group.name}/${group._id} VC: ${group.vcid}`);
    this.visbocenterService.deleteVCGroup(group)
      .subscribe(
        response => {
          this.log(`Remove VisboCenter Group result: ${JSON.stringify(response)}`);
          // filter user from vcUsers
          this.vcGroups = this.vcGroups.filter(vcGroup => vcGroup !== group);
          this.vcUsers = this.vcUsers.filter(vcUser => vcUser.groupId !== group._id);
          this.alertService.success(`Group ${group.name} removed successfully`);
        },
        error => {
          this.log(`Remove VisboCenter Group error: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Remove Group from Visbo Center`);
          } else if (error.status == 401) {
            this.log('Re-login add VC user'); // log to console instead
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.log(`Error during remove VC user ${error.error.message}`); // log to console instead
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  sortUserTable(n: number = undefined) {

    if (!this.vcUsers) return
    // change sort order otherwise sort same column same direction
    if (n != undefined || this.sortUserColumn == undefined) {
      if (n != this.sortUserColumn) {
        this.sortUserColumn = n;
        this.sortUserAscending = undefined;
      }
      if (this.sortUserAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortUserAscending = (n == 1 || n == 2) ? true : false;
        // console.log("Sort VC Column undefined", this.sortUserColumn, this.sortUserAscending)
      }
      else this.sortUserAscending = !this.sortUserAscending;
    }
    // this.log(`Sort Users Column ${this.sortUserColumn}`); // log to console instead
    if (this.sortUserColumn == 1) {
      // sort user email
      this.vcUsers.sort(function(a, b) {
        var result = 0
        if (a.email > b.email)
          result = 1;
        else if (a.email < b.email)
          result = -1;
        return result
      })
    } else if (this.sortUserColumn == 2) {
      // sort user group name
      this.vcUsers.sort(function(a, b) {
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
      this.vcUsers.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortUserColumn, this.sortUserAscending)
    }
  }

  sortGroupTable(n: number = undefined) {

    if (!this.vcGroups) return
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
      this.vcGroups.sort(function(a, b) {
        var result = 0
        if (a.name.toLowerCase() > b.name.toLowerCase())
          result = 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortGroupColumn == 2) {
      // sort user group name
      this.vcGroups.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        return b.users.length - a.users.length
      })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortGroupColumn, this.sortGroupAscending)
    if (!this.sortGroupAscending) {
      this.vcGroups.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortGroupColumn, this.sortGroupAscending)
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenter Details: ' + message);
  }
}
