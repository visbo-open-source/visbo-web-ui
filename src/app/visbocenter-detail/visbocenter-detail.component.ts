import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboCenter } from '../_models/visbocenter';
import { VCUser } from '../_models/visbocenter';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService }  from '../_services/visboproject.service';

@Component({
  selector: 'app-visbocenter-detail',
  templateUrl: './visbocenter-detail.component.html'
})
export class VisboCenterDetailComponent implements OnInit {

  @Input() visbocenter: VisboCenter;
  vcIsAdmin: boolean;
  vcIsSysAdmin: string;
  userIndex: number;

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
    this.vcIsSysAdmin = this.visbocenterService.getSysAdminRole()
    this.log(`SysAdmin Role: ${this.vcIsSysAdmin}`)
  }

  getVisboCenter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    //this.log('VisboCenter Detail of: ' + id);
    this.visbocenterService.getVisboCenter(id)
      .subscribe(
        visbocenter => {
          this.visbocenter = visbocenter;
          this.vcIsAdmin = this.visbocenter.users.find(user => user.email == currentUser.email && user.role == 'Admin') ? true : false;
          this.log(`User is Admin? ${this.vcIsAdmin}`)
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
  goBack(): void {
    this.location.back();
  }
  save(): void {
    this.visbocenterService.updateVisboCenter(this.visbocenter)
      .subscribe(
        () => { this.goBack() },
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
    // remove item from list
    // this.visbocenterService.deleteVisboCenter(visbocenter)
    //   .subscribe(() => this.goBack());
    this.log(`Delete VC: ${visbocenter.name} ID: ${visbocenter._id}`);
    this.visbocenterService.deleteVisboCenter(visbocenter)
      .subscribe(
        () => { this.goBack() },
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

  addvcuser(email: string, role: string, message: string, vcid: string): void {
    email = email.trim();
    role = role.trim();
    message = message.trim();
    this.log(`Add VisboCenter User: ${email} Role: ${role} VC: ${vcid}`);
    if (!email || !role) { return; }
    this.visbocenterService.addVCUser({ email: email, role: role} as VCUser, message, vcid )
      .subscribe(
        users => {
          this.visbocenter.users.push(users[0]);
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

  helperRemoveUser(userIndex: number):void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.userIndex = userIndex
  }

  removevcuser(user: VCUser, vcid: string): void {
    this.log(`Remove VisboCenter User: ${user.email}/${user.userId} Role: ${user.role} VC: ${vcid}`);
    this.visbocenterService.deleteVCUser(user, vcid)
      .subscribe(
        result => {
          // this.log(`Remove VisboCenter User result: ${JSON.stringify(result)}`);
          this.visbocenter.users = result;
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

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenter: ' + message);
  }
}
