import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { Login } from '../_models/login';

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
    // console.log(`return url ${this.returnUrl}`)
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
        data => {
          this.log(`Login Success check sysVC now`);
          this.visbocenterService.getSysVisboCenter()
            .subscribe(
              vc => {
                this.log(`Login Success ${this.returnUrl} Role ${this.visbocenterService.getSysAdminRole()} Perm ${vc[0].perm.system}`);
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
