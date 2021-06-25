import { Component, OnInit } from '@angular/core';
import { MessageService } from './_services/message.service';
import { AuthenticationService } from './_services/authentication.service';
import { AlertService } from './_services/alert.service';

import { TranslateService } from '@ngx-translate/core';
import { getErrorMessage, getPreView, switchPreView } from './_helpers/visbo.helper';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  // title = 'Your Projects served with Visbo ';
  version = '21-06';
  restVersionString = new Date();
  restUIVersionString = new Date();
  localsAvailable = false;

  constructor(
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    const langToSet = this.translate.getBrowserLang();
    this.log(`Browser Language: ${langToSet}`);
    // MS TODO: Verify if this really waits
    // load the tranlation file and use later instant access
    this.translate.use(langToSet).subscribe(
      () => {
        this.log(`Successfully initialized '${langToSet}' language.'`);
        this.localsAvailable = true;
      },
      () => {
        this.log(`Problem with '${langToSet}' language initialization.'`);
      });
    this.restVersion();
    // this.pwPolicy();
  }

  restVersion(): void {
    this.authenticationService.restVersion()
      .subscribe(
        data => {
          this.log(`Version Status check result ${JSON.stringify(data)}`);
          if (data.version) {
            this.restVersionString = new Date(data.version);
          }
          if (data.versionUI) {
            this.restUIVersionString = new Date(data.versionUI);
          }
          this.log(`Version check success ${data.version}/${this.restVersionString} UI ${data.versionUI}/${this.restUIVersionString}`);
        },
        error => {
          this.log(`Version Status check Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  pwPolicy(): void {
    this.authenticationService.initPWPolicy()
      .subscribe(
        () => {
          this.log(`Init PW Policy success`);
        },
        error => {
          this.log(`Init PW Policy Failed: ${error.status} ${error.error.message} `);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getPreView(): boolean {
    return getPreView();
  }

  switchPreView(): boolean {
    return switchPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('App: ' + message);
  }

}
