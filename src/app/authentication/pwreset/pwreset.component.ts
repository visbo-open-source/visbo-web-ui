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

// The PwresetComponent is an Angular component responsible for handling the password reset functionality. 
// It allows users to set a new password using a reset token, typically received via email. 
// The component also retrieves and displays the password policy for guidance.

export class PwresetComponent implements OnInit {
  user: VisboUser;                // Holds user information, particularly the new password to be set
  loading = false;                // Indicates whether the password reset process is currently in progress. 
                                  // Useful for displaying a loading spinner or disabling the submit button.
  token: string;                  // The reset token used to authenticate the password reset request. Retrieved from the URL query parameters.
  PWPolicy: string;               // The password policy requirements (e.g., complexity rules) fetched from the server.
  PWPolicyDescription: string;    // A user-friendly description of the password policy to guide the user.

  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  // Initializes the component and sets up the required state.
  ngOnInit(): void {
    this.getPWPolicy();
    this.user = new VisboUser();
    this.token = this.route.snapshot.queryParams.token;
    this.log(`Init PW Reset Token ${this.token}`);
  }

  // Submits the password reset request with the new password and the reset token.
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

  // Fetches the password policy from the server to provide guidance to the user.
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
