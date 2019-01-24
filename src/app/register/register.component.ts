import { Component } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

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
  userRegister = undefined
  hash = undefined;
  loading = false;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) { }

  ngOnInit() {
    // console.log("Init Registration");
    const id = this.route.snapshot.paramMap.get('id');
    this.hash = this.route.snapshot.queryParams.hash
    if (id) {
      this.log(`Register for User ${id} hash ${this.hash}`)
      this.userRegister = id;
    } else {
      this.userRegister = undefined;
    }
    this.model = {};
  }

  register() {
    this.loading = true;
    this.log(`Call register Service`)
    if (this.userRegister) {
      this.model._id = this.userRegister;
    }
    this.authenticationService.createUser(this.model, this.hash)
      .subscribe(
        data => {
          if (this.hash) {
            this.alertService.success(`Congratulation, your e-mail address ${data.email} is now confirmed. Please login.`, true);
          } else {
            this.alertService.success(`Congratulation, you registered successfully your e-mail address ${data.email}. Please check your e-Mail for conirmation.`, true);
          }
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
