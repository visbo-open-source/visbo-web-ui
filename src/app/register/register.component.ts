import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { Login } from '../_models/login';

@Component({
    moduleId: module.id,
    templateUrl: 'register.component.html'
})

export class RegisterComponent {
  model: any = {};
  loading = false;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) { }

  register() {
    this.loading = true;
    this.authenticationService.createUser(this.model)
      .subscribe(
        data => {
          this.alertService.success('Registration successful', true);
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Create User ${error.error.message}`)
          this.alertService.error(error.error.message);
          this.loading = false;
        }
      );
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('Register: ' + message);
  }
}
