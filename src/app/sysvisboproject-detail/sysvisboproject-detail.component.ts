import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Location } from '@angular/common';

import { FormsModule }   from '@angular/forms';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProjectService }  from '../_services/visboproject.service';
import { VisboProject } from '../_models/visboproject';
import { VPUser } from '../_models/visboproject';

import { VGGroup, VGUserGroup, VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-sysvisboproject-detail',
  templateUrl: './sysvisboproject-detail.component.html'
})
export class SysVisboProjectDetailComponent implements OnInit {

  @Input() visboproject: VisboProject;
  vpUsers: VGUserGroup[];
  vpGroups: VGGroup[];
  newUserInvite: any = {};
  vpIsAdmin: boolean;
  combinedPerm: VGPermission = undefined;
  userIndex: number;

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
          this.vpIsAdmin = this.visboproject.users.find(user => user.email == currentUser.email && user.role == 'Admin') ? true : false;
          this.log(`getVisboProject ${visboproject.name} User is Admin? ${this.vpIsAdmin}`)
        },
        error => {
          this.log(`get VPs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            // redirect to login and come back to current URL
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
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

  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    this.log('VisboProject UserList of: ' + id);
    this.visboprojectService.getVPUsers(id, true)
      .subscribe(
        mix => {
          this.vpUsers = mix.users;
          this.vpGroups = mix.groups;
          this.log(`fetched Users ${this.vpUsers.length}, Groups ${this.vpGroups.length}`)
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VP Users failed: error: ${error.status} message: ${error.error.message}`);
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
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  goBack(): void {
    this.location.back();
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
          // redirect to login and come back to current URL
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${this.visboproject.name}`);
          } else if (error.status == 409) {
            this.alertService.error(`Visbo Project ${this.visboproject.name} exists already`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  addNewVPUser(): void {
    var email = this.newUserInvite.email.trim();
    var groupName = this.newUserInvite.groupName.trim();
    var groupId = this.vpGroups.filter(group => group.name == groupName)[0]._id;
    var role = this.newUserInvite.role.trim();
    var inviteMessage = this.newUserInvite.inviteMessage.trim();
    var vpid = this.visboproject._id
    this.log(`Add VisboProject User: ${email} Role: ${role} VP: ${vpid}`);
    // if (!email || !role) { return; }
    // this.visboprojectService.addVPUser(email, role, inviteMessage, vpid, true )
    //   .subscribe(
    //     user => {
    //       this.visboproject.users.push(user);
    //       this.alertService.success(`User ${email} added successfully`);
    //     },
    //     error => {
    //       this.log(`Add VisboProject User error: ${error.error.message}`);
    //       if (error.status == 401) {
    //         this.alertService.error(`Session expired, please login again`, true);
    //         this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
    //       } else {
    //         this.alertService.error(error.error.message);
    //       }
    //     }
    //   );
  }

  helperRemoveUser(userIndex: number):void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.userIndex = userIndex
  }

  removevpuser(user: VPUser, vpid: string): void {
    this.log(`Remove VisboProject User: ${user.email}/${user.userId} Role: ${user.role} VP: ${vpid}`);
    // this.visboprojectService.deleteVPUser(user, vpid)
    //   .subscribe(
    //     users => {
    //       this.log(`Remove VisboProject User result: ${JSON.stringify(users)}`);
    //       this.visboproject.users = users;
    //       this.alertService.success(`User ${user.email} removed successfully`);
    //     },
    //     error => {
    //       this.log(`Remove VisboProject User error: ${error.error.message}`);
    //       if (error.status == 401) {
    //         this.alertService.error(`Session expired, please login again`, true);
    //         this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
    //       } else {
    //         this.alertService.error(error.error.message);
    //       }
    //     }
    //   );
  }

  sortUserTable(n: number = undefined) {

    if (!this.vpUsers) return
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
      this.vpUsers.sort(function(a, b) {
        var result = 0
        if (a.email > b.email)
          result = 1;
        else if (a.email < b.email)
          result = -1;
        return result
      })
    } else if (this.sortUserColumn == 2) {
      // sort user group name
      this.vpUsers.sort(function(a, b) {
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
      this.vpUsers.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortUserColumn, this.sortUserAscending)
    }
  }

  sortGroupTable(n: number = undefined) {

    if (!this.vpGroups) return
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
      this.vpGroups.sort(function(a, b) {
        var result = 0
        if (a.name.toLowerCase() > b.name.toLowerCase())
          result = 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortGroupColumn == 2) {
      // sort user group name
      this.vpGroups.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        return b.users.length - a.users.length
      })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortGroupColumn, this.sortGroupAscending)
    if (!this.sortGroupAscending) {
      this.vpGroups.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortGroupColumn, this.sortGroupAscending)
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectDetail: ' + message);
  }
}
