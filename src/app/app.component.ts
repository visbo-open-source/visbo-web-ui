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

// 🔍 Overview
// The AppComponent is the root component of the Visbo application. It is responsible for:
// -  Initializing language translations based on the user's browser settings
// -  Fetching the backend and UI version info for display or audit
// -  (Optionally) Initializing password policy (currently commented out)
// -  Providing preview mode utilities
// -  Logging important application lifecycle messages
export class AppComponent implements OnInit {
  // title = 'Your Projects served with Visbo ';
  version = '25-04';                    // UI version label for display (25-04).
  restVersionString = new Date();       // Date object holding the backend version timestamp.
  restUIVersionString = new Date();     // Date object holding the frontend (UI) version timestamp.
  localsAvailable = false;              // Boolean flag indicating whether translation/localization is loaded successfully.

  constructor(
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

// ngOnInit
// -  Detects the browser's default language.
// -  Loads the translation file using TranslateService.use(...).
// -  Calls restVersion() to load backend and UI version timestamps.
// -  (Optionally) Calls pwPolicy() to initialize password policy settings.
  ngOnInit(): void {
    let langToSet: string;
    if (this.translate.getLangs().includes(this.translate.getBrowserLang())) {
      langToSet = this.translate.getBrowserLang();
    } else {
      langToSet = 'en';
    }
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

  // Calls the backend via authenticationService.restVersion() to retrieve:
  // -  Backend version (version)
  // -  UI version (versionUI)
  // Stores the retrieved timestamps into restVersionString and restUIVersionString.
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

  // pwPolicy
  // -  Initializes the password policy via authenticationService.initPWPolicy().
  // -  Logs the success or failure of the policy initialization.
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

  // Wrapper methods for global utility functions:
  // -  getPreView() returns whether the app is in preview mode.
  // -  switchPreView() toggles preview mode state.
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
