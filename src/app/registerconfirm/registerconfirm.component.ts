import { Component } from '@angular/core';
import { Event, Router, RoutesRecognized } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { Login } from '../_models/login';

@Component({
    moduleId: module.id,
    templateUrl: 'registerconfirm.component.html'
})

export class RegisterConfirmComponent {
  model: any = {};

  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) { }

  ngOnInit(){
    this.model.hash = this.route.snapshot.queryParams.hash
    this.model._id = this.route.snapshot.queryParams.id
    this.log(`Init Register Confirm userid ${this.model._id} Token ${this.model.hash}`);

    this.authenticationService.registerconfirm(this.model)
      .subscribe(
        data => {
          this.alertService.success(`Congratulation, your e-mail address ${data.email} is now confirmed. Please login.`, true);
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Register Confirm ${error.error.message}`)
          this.alertService.error(error.error.message);
          this.router.navigate(['login']);
        }
      );
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('Register Confirm: ' + message);
  }
}
