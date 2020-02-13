import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { Login } from '../_models/login';

@Component({
  selector: 'app-pwforgotten',
  templateUrl: './pwforgotten.component.html',
  styleUrls: ['./pwforgotten.component.css']
})
export class PwforgottenComponent implements OnInit {
  model: any = {};
  loading = false;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) { }

  ngOnInit() {
    if (this.route.snapshot.queryParams.email) {
      this.model.username = this.route.snapshot.queryParams.email;
    }
    this.log(`Password Forgotten for User ${this.model.username}`);
  }

  pwforgotten() {
    this.loading = true;
    this.authenticationService.pwforgotten(this.model)
      .subscribe(
        data => {
          this.alertService.success('Password Forgotten Request successful. Please check your Mail to continue.', true);
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Password Forgotten ${error.error.message}`);
          this.alertService.error(error.error.message);
          this.loading = false;
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('PW Forgotten: ' + message);
  }
}
