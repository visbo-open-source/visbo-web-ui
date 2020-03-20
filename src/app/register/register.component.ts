import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { Login } from '../_models/login';

import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})

export class RegisterComponent implements OnInit {
  model: any = {};
  PWPolicy: string;
  PWPolicyDescription: string;
  userRegister = undefined;
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

  ngOnInit() {
    this.getPWPolicy();
    const id = this.route.snapshot.paramMap.get('id');
    this.hash = this.route.snapshot.queryParams.hash;
    if (id) {
      this.log(`Register for User ${id} hash ${this.hash}`);
      this.userRegister = id;
    } else {
      this.userRegister = undefined;
    }
    this.model = {};
  }

  register() {
    this.loading = true;
    this.log(`Call register Service`);
    if (this.userRegister) {
      this.model._id = this.userRegister;
    }
    this.authenticationService.createUser(this.model, this.hash)
      .subscribe(
        data => {
          if (this.hash) {
            const message = this.translate.instant('register.msg.registerSuccess', {email: data.email});
            this.alertService.success(message, true);
          } else {
            const message = this.translate.instant('register.msg.registerSuccessConfirm', {email: data.email});
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
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Register: ' + message);
  }
}
