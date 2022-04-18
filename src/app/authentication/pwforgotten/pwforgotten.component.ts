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
export class PwforgottenComponent implements OnInit {
  user: VisboUser;
  loading = false;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.user = new VisboUser();
    if (this.route.snapshot.queryParams.email) {
      this.user.email = this.route.snapshot.queryParams.email;
    }
    this.log(`Password Forgotten for User ${this.user.email}`);
  }

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
