import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

import { UserService } from '../_services/user.service';
import { VisboUser, VisboUserProfile } from '../_models/visbouser';
import { AuthenticationService } from '../_services/authentication.service';

import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-userprofile',
  templateUrl: './userprofile.component.html'
})
export class UserProfileComponent implements OnInit {

  user: VisboUser;
  oldpw: string;
  newpw: string;
  changePW: boolean;

  currentLang: string;

  PWPolicy: string;
  PWPolicyDescription: string;
  loading = false;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private router: Router,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.titleService.setTitle(this.translate.instant('profile.titleShort'));
    this.getPWPolicy();
    // this.passwordInit();
    this.log('Start init User Get Profile');
    this.getUserProfile();
  }

  getUserProfile(): void {
    this.log('User Get Profile');
    this.userService.getUserProfile()
      .subscribe(
        user => {
          this.user = user;
          if (!this.user.profile) this.user.profile = new VisboUserProfile();
          this.log(`get User Profile success ${user.email}`);
        },
        error => {
          this.log(`get User profile failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  saveUserProfile(): void {
    this.loading = true;
    this.log(`Save profile info now ${this.user.email}`);
    this.userService.updateUserProfile(this.user)
      .subscribe(
        user => {
          this.log(`Save profile success updatedAt ${user.updatedAt}`);
          this.user = user;

          const message = this.translate.instant('profile.msg.updateSuccess');
          this.alertService.success(message, true);
          this.loading = false;
        },
        error => {
          this.log(`update User profile failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status === 403) {
            const message = this.translate.instant('profile.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
          this.loading = false;
        }
      );
  }

  passwordInit(): void {
    this.changePW = true;
    this.oldpw = '';
    this.newpw = '';
  }

  passwordChange(): void {
    this.log(`Password Change ${this.user.email} Len Old ${this.oldpw.length} New ${this.newpw.length}`);

    this.changePW = false;
    this.userService.passwordChange(this.oldpw, this.newpw)
      .subscribe(
        user => {
          this.log(`Change Password success updatedAt ${user.updatedAt}`);
          this.user = user;
          const message = this.translate.instant('profile.msg.changePWSuccess');
          this.alertService.success(message, true);
        },
        error => {
          this.log(`change password failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status === 403) {
            const message = this.translate.instant('profile.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  userReset(): void {
    this.getUserProfile();
  }

  getPWPolicy(): void {
    this.authenticationService.initPWPolicy()
      .subscribe(
        data => {
          this.log(`Init PW Policy success ${JSON.stringify(data)}`);
          this.PWPolicy = data.PWPolicy;
          this.PWPolicyDescription = data.Description;

        },
        error => {
          this.log(`Init PW Policy Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('UserProfile: ' + message);
  }

}
