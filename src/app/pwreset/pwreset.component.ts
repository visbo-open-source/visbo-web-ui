import { Component } from '@angular/core';
import { Event, Router, RoutesRecognized } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { Login } from '../_models/login';

@Component({
    moduleId: module.id,
    templateUrl: 'pwreset.component.html'
})

export class PWResetComponent {
  model: any = {};
  loading = false;
  token = '';

  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) { }

  ngOnInit(){
    this.token = this.route.snapshot.queryParams.token
    this.log(`Init PW Reset Token ${this.token}`);
  }

  pwreset() {
    this.loading = true;
    this.model.token = this.token;
    this.log(`Reset Password Model ${JSON.stringify(this.model)}`)

    this.authenticationService.pwreset(this.model)
      .subscribe(
        data => {
          this.alertService.success('Reset Password Request successful.', true);
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Reset Password ${error.error.message}`)
          this.alertService.error(error.error.message);
          this.loading = false;
        }
      );
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('PW Reset: ' + message);
  }
}
