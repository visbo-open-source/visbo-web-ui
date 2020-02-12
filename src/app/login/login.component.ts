import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { FormsModule }   from '@angular/forms';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { Login } from '../_models/login';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  model: any = {};
  restVersionString: string = undefined;
  loading = false;
  returnUrl: string;
  returnParams: any = undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private visbocenterService: VisboCenterService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    // reset login status
    this.authenticationService.logout();
    // this.restVersion();

    if (this.route.snapshot.queryParams.email) this.model.username = this.route.snapshot.queryParams.email
    // get return url from route parameters or default to '/'

    var returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    var parts = returnUrl.split('?');
    this.returnUrl = parts[0];
    this.returnParams = this.queryStringToJSON(parts[1]);

    console.log(`return url ${this.returnUrl} params ${this.returnParams}`)
    if (this.returnUrl.indexOf('/login') >= 0) this.returnUrl = '/' // do not return to login
  }

  restVersion() {
    if (this.restVersionString) return;
    this.authenticationService.restVersion()
      .subscribe(
        data => {
          this.restVersionString = data.version;
          this.log(`Version Status check success ${this.restVersionString}`);
        },
        error => {
          this.log(`Version Status check Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
        }
      );
  }

  login() {
    this.loading = true;
    this.authenticationService.login(this.model.username, this.model.password)
      .subscribe(
        user => {
          // this.log(`Login Success Result ${JSON.stringify(user)}`);
          if (user.status && user.status.expiresAt) {
            var expiration = new Date(user.status.expiresAt)
            this.log(`Login Success BUT EXPIRATION at: ${expiration.toLocaleString()}`);
            this.alertService.error(`Your password expires at ${expiration.toLocaleString()}. Please change your password before`, true);
          }
          this.visbocenterService.getSysVisboCenter()
            .subscribe(
              vc => {
                this.log(`Login Success ${this.returnUrl} Role ${JSON.stringify(this.visbocenterService.getSysAdminRole())} `);
                this.router.navigate([this.returnUrl], {replaceUrl: true, queryParams: this.returnParams});
              },
              error => {
                this.log(`No SysVC found: `);
                this.router.navigate(["/"], {replaceUrl: true});
              }
            )
        },
        error => {
          this.log(`Login Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
          this.loading = false;
        }
      );
  }

  pwforgotten() {
    var email = (this.model.username || '').trim();
    this.log(`Forward to password forgotten ${email} `);
    // MS TODO: Check if user name is an e-Mail Address
    this.router.navigate(['pwforgotten'], { queryParams: { email: email }});
  }

  register() {
    this.log(`Forward to Register `);
    this.router.navigate(['register']);
  }

  relogin() {
    // called after server respons with 401 "not authenticated"
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.log(`reLogin after error 401 to URL ${this.route.snapshot.queryParams["returnUrl"]}`);
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  queryStringToJSON(querystring: string) {
    var pairs = (querystring || '').split('&');
    var result = {};

    pairs.forEach(function(text) {
      var pair = text.split('=');
      // if (pair[0]) result[pair[0]] = decodeURIComponent(pair[1]) || '';
      if (pair[0]) result[pair[0]] = pair[1] || '';
    });
    return JSON.parse(JSON.stringify(result));
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Login: ' + message);
  }
}
