import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { FormsModule }   from '@angular/forms';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboCenter } from '../_models/visbocenter';
import { VCUser } from '../_models/visbocenter';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService }  from '../_services/visboproject.service';

@Component({
  selector: 'app-sysvisbosystem',
  templateUrl: './sysvisbosystem.component.html'
})
export class SysVisboSystemComponent implements OnInit {

  // @Input() visbocenter: VisboCenter;
  sysvisbocenter: VisboCenter;
  newUserInvite: any = {};
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
    this.log(`Init SysAdmin`)
    this.getSysVisboCenter();
    this.vcIsSysAdmin = this.visbocenterService.getSysAdminRole()
    if ( this.vcIsSysAdmin == 'Admin') this.vcIsAdmin = true;
    this.log(`SysAdmin Role: ${this.vcIsSysAdmin}`)
  }

  getSysVisboCenter(): void {
    this.visbocenterService.getSysVisboCenters()
      .subscribe(visbocenters => {
        if (visbocenters.length >0) {
          this.sysvisbocenter = visbocenters[0];
        }
      });
  }

  goBack(): void {
    // this.log(`VC Details go Back ${JSON.stringify(this.location)}`)
    this.location.back();
  }

  save(): void {
    this.visbocenterService.updateVisboCenter(this.sysvisbocenter)
      .subscribe(
        vc => {
          this.alertService.success(`Visbo Center ${vc.name} updated successfully`, true);
          // this.goBack()
        },
        error => {
          this.log(`save VC failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Center ${this.sysvisbocenter.name}`);
          } else if (error.status == 409) {
            this.alertService.error(`Visbo Center ${this.sysvisbocenter.name} exists already`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  addNewVCUser(): void {
    var email = this.newUserInvite.email.trim();
    var role = this.newUserInvite.role.trim();
    var inviteMessage = this.newUserInvite.inviteMessage.trim();
    var vcid = this.sysvisbocenter._id
    this.log(`Add VisboCenter User: ${email} Role: ${role} VC: ${vcid}`);
    if (!email || !role) { return; }
    this.visbocenterService.addVCUser({ email: email, role: role} as VCUser, inviteMessage, vcid )
      .subscribe(
        user => {
          this.sysvisbocenter.users.push(user);
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
        users => {
          // this.log(`Remove VisboCenter User result: ${JSON.stringify(result)}`);
          this.sysvisbocenter.users = users;
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
    this.messageService.add('Sys VisboCenter: ' + message);
  }
}
