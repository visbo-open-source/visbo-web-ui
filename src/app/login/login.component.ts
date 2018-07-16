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

    console.log(`init Login: ${JSON.stringify(this.route.snapshot.queryParams)}`)
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    console.log(`return url ${this.returnUrl}`)
  }

  login() {
    this.loading = true;
    this.authenticationService.login(this.model.username, this.model.password)
      .subscribe(
        data => {
          console.log(`Login Success ${this.returnUrl}`);
          this.visbocenterService.getSysVisboCenters().subscribe(vc => vc);
          this.router.navigate([this.returnUrl]);
        },
        error => {
          console.log(`Login Failed: ${error.status} ${error.error.message} `);
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
