import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

import { UserService } from '../_services/user.service';
import { VisboUser, VisboUserProfile, VisboUserResponse } from '../_models/login';
import { AuthenticationService } from '../_services/authentication.service';

@Component({
  selector: 'app-userprofile',
  templateUrl: './userprofile.component.html'
})
export class UserProfileComponent implements OnInit {

  user: VisboUser;
  model: any = {};
  modelPw: any = {};

  PWPolicy: string;
  PWPolicyDescription: string;
  loading = false;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.getPWPolicy();
    this.log('Start init User Get Profile');
    this.modelPw = {};
    this.getUserProfile();
  }

  getUserProfile(): void {
    this.log('User Get Profile');
    this.userService.getUserProfile()
      .subscribe(
        user => {
          this.user = user;
          this.model.email = user.email;
          this.model.updatedAt = user.updatedAt;
          if (user.profile) {
            this.model.firstName = user.profile.firstName;
            this.model.lastName = user.profile.lastName;
            this.model.company = user.profile.company;
            this.model.phone = user.profile.phone;
          }
          if (user.status) {
            this.model.registeredAt = user.status.registeredAt;
            this.model.lastLoginAt = user.status.lastLoginAt;
            this.model.lastLoginFailedAt = user.status.lastLoginFailedAt;
          }

          this.log(`get User Profile success ${user.email}`);
        },
        error => {
          this.log(`get User profile failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

  saveUserProfile(): void {
    this.loading = true;
    this.log(`Save profile info now ${this.model.email}`);
    if (!this.user.profile) {
      this.user.profile = new VisboUserProfile;
    }
    this.user.profile.firstName = this.model.firstName;
    this.user.profile.lastName = this.model.lastName;
    this.user.profile.company = this.model.company;
    this.user.profile.phone = this.model.phone;

    this.userService.updateUserProfile(this.user)
      .subscribe(
        user => {
          this.log(`Save profile success updatedAt ${user.updatedAt}`);
          this.user = user;
          this.model.email = user.email;
          this.model.updatedAt = user.updatedAt;
          this.model.firstName = user.profile.firstName;
          this.model.lastName = user.profile.lastName;
          this.model.company = user.profile.company;
          this.model.phone = user.profile.phone;
          this.model.registeredAt = user.status.registeredAt;
          this.model.lastLoginAt = user.status.lastLoginAt;
          this.model.lastLoginFailedAt = user.status.lastLoginFailedAt;

          this.alertService.success(`User Profile updated successfully`, true);
          this.loading = false;
        },
        error => {
          this.log(`update User profile failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status === 403) {
            this.alertService.error('Permission Denied');
          } else {
            this.alertService.error(error.error.message);
          }
          this.loading = false;
        }
      );
  }

  passwordInit(): void {
    this.modelPw = {};
  }

  passwordChange(): void {
    this.log(`Password Change ${this.model.email} Len Old ${this.modelPw.oldpassword.length} New ${this.modelPw.newpassword.length}`);
    let model: any;
    model = {};
    model.oldpassword = this.modelPw.oldpassword;
    model.password = this.modelPw.newpassword;

    this.userService.passwordChange(model)
      .subscribe(
        user => {
          this.log(`Change Password success updatedAt ${user.updatedAt}`);
          this.user = user;
          this.model.email = user.email;
          this.model.updatedAt = user.updatedAt;
          this.model.firstName = user.profile.firstName;
          this.model.lastName = user.profile.lastName;
          this.model.company = user.profile.company;
          this.model.phone = user.profile.phone;
          this.model.registeredAt = user.status.registeredAt;
          this.model.lastLoginAt = user.status.lastLoginAt;
          this.model.lastLoginFailedAt = user.status.lastLoginFailedAt;

          this.alertService.success(`Password changed successfully`, true);
        },
        error => {
          this.log(`change password failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status === 403) {
            this.alertService.error('Permission Denied');
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  userReset(): void {
    this.getUserProfile();
  }

  getPWPolicy() {
    this.authenticationService.initPWPolicy()
      .subscribe(
        data => {
          this.log(`Init PW Policy success ${JSON.stringify(data)}`);
          this.PWPolicy = data.PWPolicy;
          this.PWPolicyDescription = data.Description;

        },
        error => {
          this.log(`Init PW Policy Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('UserProfile: ' + message);
  }

}
