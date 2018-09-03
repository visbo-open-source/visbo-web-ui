import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

import { UserService } from '../_services/user.service';
import { VisboUser, VisboUserProfile, VisboUserResponse } from '../_models/login';

@Component({
  selector: 'app-userprofile',
  templateUrl: './userprofile.component.html'
})
export class UserProfileComponent implements OnInit {

  user: VisboUser;
  model: any = {};
  loading = false;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.log(`Start init User Get Profile `);
    this.getUserProfile();
  }

  getUserProfile(): void {
    this.log("User Get Profile");
    this.userService.getUserProfile()
      .subscribe(
        user => {
          this.model = user;
          this.log(`get User Profile success ${user.email}`);
        },
        error => {
          this.log(`get User profile failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  saveUserProfile(): void {
    this.loading = true;
    this.log(`Save profile info now ${this.model.email}`);
    this.userService.updateUserProfile(this.model)
      .subscribe(
        user => {
          this.log(`Save profile success updatedAt ${user.updatedAt}`);
          this.model = user;
          this.alertService.success(`User Profile updated successfully`, true);
          this.loading = false;
        },
        error => {
          this.log(`update User profile failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status == 403) {
            this.alertService.error('Permission Denied');
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
          this.loading = false;
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('UserProfile: ' + message);
  }

}
