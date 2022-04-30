import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { AuthenticationService } from '../../_services/authentication.service';

import { VisboUser, VisboUserProfile, VisboUserStatus } from '../../_models/visbouser';
import { getErrorMessage } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})

export class RegisterComponent implements OnInit {
  user: VisboUser;
  check_DP: boolean;
  check_TOU: boolean;
  PWPolicy: string;
  PWPolicyDescription: string;
  hash = undefined;
  loading = false;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.getPWPolicy();
    const id = this.route.snapshot.paramMap.get('id');
    this.hash = this.route.snapshot.queryParams.hash;
    if (id) {
      this.getUser(id, this.hash);
    } else {
      const user = new VisboUser();
      user.profile = new VisboUserProfile();
      user.status = new VisboUserStatus();
      this.user = user;
    }
    this.log(`Register for User ${id} hash ${this.hash}`);
  }

  register(): void {
    if (!this.check_DP || !this.check_TOU) {
      const message = this.translate.instant('register.msg.confirmDP_TOU');
      this.alertService.error(message, false);
      return;
    }
    this.loading = true;
    this.log(`Call register Service ${JSON.stringify(this.user)}`);
    this.authenticationService.createUser(this.user, this.hash)
      .subscribe(
        user => {
          if (this.hash) {
            const message = this.translate.instant('register.msg.registerSuccess', {email: user.email});
            this.alertService.success(message, true);
          } else {
            const message = this.translate.instant('register.msg.registerSuccessConfirm', {email: user.email});
            this.alertService.success(message, true);
          }
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Create User ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
          this.loading = false;
        }
      );
  }

  getUser(id: string, hash: string): void {
    this.authenticationService.getUser(id, hash)
      .subscribe(
        user => {
          this.log(`Init Signup User success ${JSON.stringify(user)}`);
          if (!user.profile)  {
            user.profile = new VisboUserProfile();
          }
          this.user = user;
        },
        error => {
          this.log(`Init Signup User Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(getErrorMessage(error));
        }
      );
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
    this.messageService.add('Register: ' + message);
  }
}
