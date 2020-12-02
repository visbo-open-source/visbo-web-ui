import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSetting } from '../_models/visbosetting';

import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  email: string;
  userpw: string;
  restVersionString: string;
  loading = false;
  returnUrl: string;
  returnParams: string;
  setting: VisboSetting[];
  userLang = 'en';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private visbocenterService: VisboCenterService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    // reset login status
    this.authenticationService.logout();
    this.getSetting();

    if (this.route.snapshot.queryParams.email) {
      this.email = this.route.snapshot.queryParams.email;
    }

    // get return url from route parameters or default to '/'
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    const parts = returnUrl.split('?');
    this.returnUrl = parts[0];
    this.returnParams = parts[1];

    this.log(`current Language ${this.translate.currentLang} getLangs() ${JSON.stringify(this.translate.getLangs())}`);
    this.userLang = this.translate.currentLang;
    this.log(`return url ${this.returnUrl} params ${this.returnParams}`);
    // if (this.returnUrl.indexOf('/login') >= 0) this.returnUrl = '/' // do not return to login
  }

  restVersion(): void {
    if (this.restVersionString) {
      return;
    }
    this.authenticationService.restVersion()
      .subscribe(
        data => {
          this.restVersionString = data.version.toISOString();
          this.log(`Version Status check success ${this.restVersionString}`);
        },
        error => {
          this.log(`Version Status check Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  login(): void {
    this.loading = true;
    this.authenticationService.login(this.email, this.userpw)
      .subscribe(
        user => {
          // this.log(`Login Success Result ${JSON.stringify(user)}`);
          if (user.status && user.status.expiresAt) {
            const expiration = new Date(user.status.expiresAt);
            this.log(`Login Success BUT EXPIRATION at: ${expiration.toLocaleString()}`);
            const message = this.translate.instant('autologout.msg.pwExpires', {expiresAt: expiration.toLocaleString()});
            this.alertService.error(message, true);
          } else {
            const lastLogin = new Date(user.status.lastLoginAt);
            const message = this.translate.instant('login.msg.loginSuccess', {lastLogin: lastLogin.toLocaleString()});
            this.alertService.success(message, true);
          }
          this.visbocenterService.getSysVisboCenter()
            .subscribe(
              () => {
                this.log(`Login Success ${this.returnUrl} Role ${JSON.stringify(this.visbocenterService.getSysAdminRole())} `);
                this.router.navigate([this.returnUrl], {replaceUrl: true, queryParams: this.queryStringToJSON(this.returnParams)});
              },
              error => {
                this.log(`No SysVC found:  ${error.status} ${error.error.message}`);
                this.router.navigate(['/'], {replaceUrl: true});
              }
            );
        },
        error => {
          this.log(`Login Failed: ${error.status} ${error.error.message} `);
          let message = getErrorMessage(error);
          if (error.status === 403) {
            message = this.translate.instant('login.msg.loginFailure', {user: this.email});
          }
          this.alertService.error(message);
          this.loading = false;
        }
      );
  }

  loginGoogleUrl(): string {
    const url = this.authenticationService.loginGoogleUrl();
    return url;
  }

  loginGoogle(): void {
    this.loading = true;
    console.log(`GoogleLogin Start `);
    this.authenticationService.loginGoogle()
      .subscribe(
        user => {
          console.log(`Google Login Success ${this.returnUrl} Role ${JSON.stringify(user)} `);
          this.log(`Google Login Success Result ${JSON.stringify(user)}`);
          const lastLogin = new Date(user.status.lastLoginAt);
          const message = this.translate.instant('login.msg.loginSuccess', {lastLogin: lastLogin.toLocaleString()});
          this.alertService.success(message, true);

          this.visbocenterService.getSysVisboCenter()
            .subscribe(
              () => {
                this.log(`Login Success ${this.returnUrl} Role ${JSON.stringify(this.visbocenterService.getSysAdminRole())} `);
                this.router.navigate([this.returnUrl], {replaceUrl: true, queryParams: this.queryStringToJSON(this.returnParams)});
              },
              error => {
                this.log(`No SysVC found:  ${error.status} ${error.error.message}`);
                this.router.navigate(['/'], {replaceUrl: true});
              }
            );
        },
        error => {
          this.log(`Google Login Failed: ${error.status} ${error.error.message} `);
          let message = getErrorMessage(error);
          if (error.status === 403) {
            message = this.translate.instant('login.msg.loginFailure', {user: this.email});
          }
          this.alertService.error(message);
          this.loading = false;
        }
      );
  }

  pwforgotten(): void {
    const email = (this.email || '').trim();
    this.log(`Forward to password forgotten ${email} `);
    // MS TODO: Check if user name is an e-Mail Address
    this.router.navigate(['pwforgotten'], { queryParams: { email: email }});
  }

  register(): void {
    this.log('Forward to Register');
    this.router.navigate(['register']);
  }

  relogin(): void {
    // called after server respons with 401 'not authenticated'
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.log(`reLogin after error 401 to URL ${this.route.snapshot.queryParams['returnUrl']}`);
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  useLanguage(language: string): void {
    this.translate.use(language);
  }

  // queryStringToJSON(querystring: string): HttpParams {
  //   const pairs = (querystring || '').split('&');
  //   let result = new HttpParams();
  //
  //   pairs.forEach(function(text) {
  //     const pair = text.split('=');
  //     // if (pair[0]) result[pair[0]] = decodeURIComponent(pair[1]) || '';
  //     if (pair[0]) {
  //       result = result.append(pair[0], pair[1] || '');
  //     }
  //   });
  //   return result;
  // }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  queryStringToJSON(querystring: string): any {
    const pairs = (querystring || '').split('&');
    const result = {};

    pairs.forEach(function(text) {
      const pair = text.split('=');
      // if (pair[0]) result[pair[0]] = decodeURIComponent(pair[1]) || '';
      if (pair[0]) {
        result[pair[0]] = pair[1] || '';
      }
    });
    return result;
  }

  hasSetting(name: string): string {
    let result = undefined;
    if (name && this.setting) {
      const setting = this.setting.find(item => item.name == name);
      if (setting) {
        result = setting.value;
      }
    }
    return result;
  }

  getSetting(): void {
    this.authenticationService.getSetting()
      .subscribe(
        setting => {
          this.log(`ReST Server Setting success ${JSON.stringify(setting)}`);
          this.setting = setting;
        },
        error => {
          this.log(`Init Settings Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Login: ' + message);
  }
}
