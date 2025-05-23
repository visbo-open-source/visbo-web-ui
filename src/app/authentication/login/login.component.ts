import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { Router, ActivatedRoute } from '@angular/router';

import { TranslateService} from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { VisboCenterService } from '../../_services/visbocenter.service';
import { VisboSetting } from '../../_models/visbosetting';

import { getErrorMessage } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})

// The LoginComponent is responsible for managing the user login process within the application. 
// It handles standard email/password authentication, One-Time Token (OTT) login, and Google login. 
// It also manages language settings and redirects users after successful authentication.

export class LoginComponent implements OnInit {
  email: string;                // Stores the user's email address.
  ott: string;                  // One-time token for quick authentication.
  userpw: string;               // User password for authentication
  restVersionString: string;    
  loading = false;              // Indicates if a login operation is in progress
  returnUrl: string;            // URL to navigate to after a successful login
  returnParams: string;         // Additional query parameters for navigation
  setting: VisboSetting[];      // Holds settings retrieved from the server
  currentLang = 'en';           // Current language setting, default is 'en'

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private visbocenterService: VisboCenterService,
    private alertService: AlertService,
    private translate: TranslateService,
    private titleService: Title
  ) { }


  // Initializes the component by logging out the user, fetching settings, and setting up the return URL and parameters.
  ngOnInit(): void {
     // reset login status
    this.authenticationService.logout();
    this.getSetting();
    this.log(`current Language ${this.translate.currentLang} getLangs() ${JSON.stringify(this.translate.getLangs())}`);
    this.currentLang = this.translate.currentLang;
    this.titleService.setTitle(this.translate.instant('login.title'));

    // get return url from route parameters or default to '/'
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    const parts = returnUrl.split('?');
    this.returnUrl = parts[0];
    this.returnParams = parts[1];

    this.log(`return url ${this.returnUrl} params ${this.returnParams}`);
    if (this.route.snapshot.queryParams.ott) {
      const params = this.queryStringToJSON(this.returnParams);
      this.ott = params.ott;
      this.log(`LoginOtt Token ${this.ott} `);
      this.loginOTT();
    } else {
      if (this.route.snapshot.queryParams.email) {
        this.email = this.route.snapshot.queryParams.email;
      }
    }
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

  // Attempts to authenticate the user using email and password. 
  // On success, retrieves system center settings and redirects the user accordingly.
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
                const params = this.queryStringToJSON(this.returnParams);
                delete params.ott
                this.router.navigate([this.returnUrl], {replaceUrl: true, queryParams: params});
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

  // Authenticates the user using a one-time token (OTT). 
  // Similar to login(), it handles redirection and displays success or error messages.
  loginOTT(): void {
    this.authenticationService.loginOTT(this.ott)
      .subscribe(
        user => {
          this.ott = undefined;
          this.log(`Login Success Result ${JSON.stringify(user)}`);
          const lastLogin = new Date(user.status.lastLoginAt);
          const message = this.translate.instant('login.msg.loginSuccess', {lastLogin: lastLogin.toLocaleString()});
          this.alertService.success(message, true);

          this.visbocenterService.getSysVisboCenter()
            .subscribe(
              () => {
                this.log(`Login OTT Success ${this.returnUrl} Role ${JSON.stringify(this.visbocenterService.getSysAdminRole())} `);
                const params = this.queryStringToJSON(this.returnParams);
                delete params.ott
                this.router.navigate([this.returnUrl], {replaceUrl: true, queryParams: params});
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
          if (error.status === 400) {
            message = this.translate.instant('login.msg.loginOTTFailure');
          }
          this.ott = undefined;
          this.alertService.error(message);
          this.loading = false;
        }
      );
  }

  // Returns the URL for initiating Google login.
  loginGoogleUrl(): string {
    const url = this.authenticationService.loginGoogleUrl();
    return url;
  }

  // Initiates the Google authentication process, handles user login, and manages redirection.
  loginGoogle(): void {
    this.loading = true;
    this.log(`GoogleLogin Start `);
    this.authenticationService.loginGoogle()
      .subscribe(
        user => {
          this.log(`Google Login Success ${this.returnUrl} Role ${JSON.stringify(user)} `);
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

  // Navigates the user to the password recovery page.
  pwforgotten(): void {
    const email = (this.email || '').trim();
    this.log(`Forward to password forgotten ${email} `);
    // MS TODO: Check if user name is an e-Mail Address
    this.router.navigate(['pwforgotten'], { queryParams: { email: email }});
  }

  // Redirects to the user registration page.
  register(): void {
    this.log('Forward to Register');
    this.router.navigate(['register']);
  }

  // Handles automatic re-login after a 401 (Not Authenticated) error.
  relogin(): void {
    // called after server respons with 401 'not authenticated'
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.log(`reLogin after error 401 to URL ${this.route.snapshot.queryParams['returnUrl']}`);
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // Switches the current language and updates the language setting.
  useLanguage(language: string): void {
    this.translate.use(language);
    this.currentLang = language;
  }

  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Parses a query string into a JSON object.
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

  // Checks if a specific setting exists and returns its value if available.
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

  // Fetches settings from the authentication service and logs the result.
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
