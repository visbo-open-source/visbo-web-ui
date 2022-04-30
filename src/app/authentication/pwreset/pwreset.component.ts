import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { VisboUser } from '../../_models/visbouser';

import { getErrorMessage } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-pwreset',
  templateUrl: './pwreset.component.html',
  styleUrls: ['./pwreset.component.css']
})
export class PwresetComponent implements OnInit {
  user: VisboUser;

  loading = false;
  token: string;
  PWPolicy: string;
  PWPolicyDescription: string;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.getPWPolicy();
    this.user = new VisboUser();
    this.token = this.route.snapshot.queryParams.token;
    this.log(`Init PW Reset Token ${this.token}`);
  }

  pwreset(): void {
    this.loading = true;

    this.authenticationService.pwreset(this.user, this.token)
      .subscribe(
        () => {
          const message = this.translate.instant('pwReset.msg.pwResetSuccess');
          this.alertService.success(message, true);
          this.router.navigate(['login']);
        },
        error => {
          this.loading = false;
          const message = this.translate.instant('pwReset.msg.pwResetError');
          this.alertService.error(message, true);
          this.log(`Error during Reset Password ${error.error.message}`);
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
  private log(message: string): void {
    this.messageService.add('PW Reset: ' + message);
  }
}
