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
  version = '1.0';
  restVersionString = undefined;

  constructor(
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.restVersion();
  }

  restVersion() {
    if (this.restVersionString) return;
    this.authenticationService.restVersion()
      .subscribe(
        data => {
          this.restVersionString = data.version;
          this.log(`Version Status check success ${this.restVersionString}`);
        },
        error => {
          this.log(`Version Status check Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(error.error.message);
        }
      );
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('App: ' + message);
  }

}
