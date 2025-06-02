import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { VisboUser } from '../../_models/visbouser';

import { getErrorMessage } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-pwforgotten',
  templateUrl: './pwforgotten.component.html',
  styleUrls: ['./pwforgotten.component.css']
})

// The PwforgottenComponent is an Angular component responsible for handling the "Forgot Password" functionality.
// It allows users to request a password reset by providing their email address. 
// If successful, a password reset email is sent to the user, and they are redirected to the login page.

export class PwforgottenComponent implements OnInit {
  user: VisboUser;        // An instance of the VisboUser class, holding user information, particularly the email address for password reset.
  loading = false;        // Indicates whether the password reset request is in progress. Used to manage the UI state, such as showing a loading spinner.

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  //  Initializes the component and sets the user's email address if provided in the query parameters.
  ngOnInit(): void {
    this.user = new VisboUser();
    if (this.route.snapshot.queryParams.email) {
      this.user.email = this.route.snapshot.queryParams.email;
    }
    this.log(`Password Forgotten for User ${this.user.email}`);
  }

  // Initiates the password reset process by calling the authenticationService.pwforgotten method.
  pwforgotten(): void {
    this.loading = true;
    this.authenticationService.pwforgotten(this.user)
      .subscribe(
        () => {
          this.alertService.success('Password Forgotten Request successful. Please check your Mail to continue.', true);
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Password Forgotten ${error.error.message}`);
          this.alertService.error(getErrorMessage(error), true);
          this.loading = false;
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('PW Forgotten: ' + message);
  }
}
