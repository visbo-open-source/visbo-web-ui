import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

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
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    console.log(`return url ${this.returnUrl}`)
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
                this.router.navigate([this.returnUrl]);
              },
              error => {
                this.log(`No SysVC found: `);
                this.router.navigate([this.returnUrl]);
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
    var email = this.model.username.trim();
    this.log(`Login: Forward to password forgotten ${email} `);
    // MS TODO: Check if user name is an e-Mail Address
    this.router.navigate(['pwforgotten'], { queryParams: { email: email }});
  }

  relogin() {
    // called after server respons with 401 "not authenticated"
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.log(`reLogin after error 401 to URL ${this.route.snapshot.queryParams["returnUrl"]}`);
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('Login: ' + message);
  }
}
