import { Component, OnInit } from '@angular/core';
import { Event, Router, RoutesRecognized } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { Login } from '../_models/login';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pwreset',
  templateUrl: './pwreset.component.html',
  styleUrls: ['./pwreset.component.css']
})
export class PwresetComponent implements OnInit {
  model: any = {};

  loading = false;
  token = '';
  PWPolicy: string;
  PWPolicyDescription: string;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) { }

  ngOnInit(){
    this.getPWPolicy();
    this.token = this.route.snapshot.queryParams.token
    this.log(`Init PW Reset Token ${this.token}`);
  }

  pwreset() {
    this.loading = true;
    this.model.token = this.token;

    this.authenticationService.pwreset(this.model)
      .subscribe(
        data => {
          this.alertService.success('Reset Password Request successful.', true);
          this.router.navigate(['login']);
        },
        error => {
          this.loading = false;
          this.log(`Error during Reset Password ${error.error.message}`)
          this.alertService.error(`Password Reset: ${error.error.message}`);
        }
      );
  }

  getPWPolicy() {
    this.authenticationService.initPWPolicy()
      .subscribe(
        data => {
          this.log(`Init PW Policy success ${JSON.stringify(data)}`);
          this.PWPolicy = data.PWPolicy
          this.PWPolicyDescription = data.Description

        },
        error => {
          this.log(`Init PW Policy Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('PW Reset: ' + message);
  }
}
