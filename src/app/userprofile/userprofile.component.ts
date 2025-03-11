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


// The UserProfileComponent is an Angular component that manages the user's profile within the VISBO application. 
// It allows users to view and update their profile information, change their password, and reset their profile data. 
// The component also ensures compliance with the password policy.

export class UserProfileComponent implements OnInit {

  user: VisboUser;              // Holds the user's profile data, including personal details and profile settings.
  oldpw: string;                // Stores the old password when initiating a password change.
  newpw: string;                // Stores the new password entered by the user.
  changePW: boolean;            // Indicates if the password change mode is active.

  currentLang: string;          // Stores the current language setting of the application

  PWPolicy: string;             // Stores the password policy fetched from the server.
  PWPolicyDescription: string;  // Provides a user-friendly description of the password policy.
  loading = false;              // Manages the loading state, particularly when saving profile or changing the password.

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


  // Initializes the component, fetching the password policy and loading the user's profile.
  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.titleService.setTitle(this.translate.instant('profile.titleShort'));
    this.getPWPolicy();
    // this.passwordInit();
    this.log('Start init User Get Profile');
    this.getUserProfile();
  }

  // Retrieves the current user's profile information from the server.
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

  // Saves the updated user profile data to the server.
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

  // Prepares the component for a password change by resetting related fields.
  passwordInit(): void {
    this.changePW = true;
    this.oldpw = '';
    this.newpw = '';
  }

  // Submits a request to change the user's password.
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

  // Resets the user profile to its current state by re-fetching from the server.
  userReset(): void {
    this.getUserProfile();
  }

  // Retrieves the password policy from the authentication service.
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
