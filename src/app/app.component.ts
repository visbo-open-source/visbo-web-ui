import { Component, OnInit } from '@angular/core';
import { MessageService } from './_services/message.service';
import { AuthenticationService } from './_services/authentication.service';
import { AlertService } from './_services/alert.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'Your Projects served with Visbo ';
  version = '1.2';
  restVersionDate = new Date();
  restUIVersionDate = new Date();

  constructor(
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.restVersion();
    // this.pwPolicy();
  }

  restVersion() {
    this.authenticationService.restVersion()
      .subscribe(
        data => {
          this.log(`Version Status check result ${JSON.stringify(data)}`);
          this.restVersionDate = new Date(data.version);
          this.restUIVersionDate = new Date(data.versionUI);
          this.log(`Version Status check success ${data.version}/${this.restVersionDate} UI ${data.versionUI}/${this.restUIVersionDate}`);
        },
        error => {
          this.log(`Version Status check Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
        }
      );
  }

  pwPolicy() {
    this.authenticationService.initPWPolicy()
      .subscribe(
        data => {
          this.log(`Init PW Policy success`);
        },
        error => {
          this.log(`Init PW Policy Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('App: ' + message);
  }

}
