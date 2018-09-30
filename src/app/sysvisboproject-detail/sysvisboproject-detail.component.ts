import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Location } from '@angular/common';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProjectService }  from '../_services/visboproject.service';
import { VisboProject } from '../_models/visboproject';
import { VPUser } from '../_models/visboproject';

@Component({
  selector: 'app-sysvisboproject-detail',
  templateUrl: './sysvisboproject-detail.component.html'
})
export class SysVisboProjectDetailComponent implements OnInit {

  @Input() visboproject: VisboProject;
  newUserInvite: any = {};
  vpIsAdmin: boolean;
  vpIsSysAdmin: string;
  userIndex: number;

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
    this.getVisboProject();
    this.vpIsSysAdmin = this.visbocenterService.getSysAdminRole()
    this.log(`SysAdmin Role: ${this.vpIsSysAdmin}`)
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    //this.log('VisboProject Detail of: ' + id);
    this.visboprojectService.getVisboProject(id, true)
      .subscribe(
        visboproject => {
          this.visboproject = visboproject
          this.vpIsAdmin = this.visboproject.users.find(user => user.email == currentUser.email && user.role == 'Admin') ? true : false;
          this.log(`User is Admin? ${this.vpIsAdmin}`)
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

  delete(visboproject: VisboProject): void {
    // remove item from list
    // this.visboprojectService.deleteVisboProject(visboproject).subscribe();
    // this.goBack();
    this.visboprojectService.deleteVisboProject(visboproject)
      .subscribe(
        () => { this.goBack },
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
    var role = this.newUserInvite.role.trim();
    var inviteMessage = this.newUserInvite.inviteMessage.trim();
    var vpid = this.visboproject._id
    this.log(`Add VisboProject User: ${email} Role: ${role} VP: ${vpid}`);
    if (!email || !role) { return; }
    this.visboprojectService.addVPUser({ email: email, role: role} as VPUser, inviteMessage, vpid )
      .subscribe(
        user => {
          this.visboproject.users.push(user);
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.log(`Add VisboProject User error: ${error.error.message}`);
          if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  helperRemoveUser(userIndex: number):void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.userIndex = userIndex
  }

  removevpuser(user: VPUser, vpid: string): void {
    this.log(`Remove VisboProject User: ${user.email}/${user.userId} Role: ${user.role} VP: ${vpid}`);
    this.visboprojectService.deleteVPUser(user, vpid)
      .subscribe(
        users => {
          this.log(`Remove VisboProject User result: ${JSON.stringify(users)}`);
          this.visboproject.users = users;
          this.alertService.success(`User ${user.email} removed successfully`);
        },
        error => {
          this.log(`Remove VisboProject User error: ${error.error.message}`);
          if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectDetail: ' + message);
  }
}
