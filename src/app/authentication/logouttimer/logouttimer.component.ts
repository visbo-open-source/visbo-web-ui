import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { interval } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from '../../_services/authentication.service';
import { AlertService } from '../../_services/alert.service';
import { MessageService } from '../../_services/message.service';

@Component({
  selector: 'app-logouttimer',
  templateUrl: './logouttimer.component.html',
  styleUrls: ['./logouttimer.component.css']
})

// The LogoutTimerComponent is an Angular component responsible for handling automatic session timeout and notifying the user before logout. 
// It monitors session expiration and redirects to the login page if the session has expired.

export class LogoutTimerComponent implements OnInit {

  logoutTimer = true;               // Indicates if the logout timer is currently active. Default is true
  logoutTime: Date = new Date();    // Holds the exact date and time when the session is scheduled to expire. Initially set to 100 seconds from the component initialization.
  timerID: number;                  // Reserved for storing the ID of the timer if needed for future functionality such as clearing intervals

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    public authenticationService: AuthenticationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) { }

  // Initializes the component by setting the logout time and starts the session expiration check.
  ngOnInit(): void {    
    this.logoutTime = new Date();
    this.logoutTime.setSeconds(this.logoutTime.getSeconds() + 100);
    this.log(`Logout Time Init ${this.logoutTime.toISOString()} `);
    this.checkLogout();
  }

  // Checks the session status every 10 seconds and triggers alerts or logout actions if necessary.
  checkLogout(): void {
    // emit value in sequence every 10 second
    const source = interval(10000);
    source.subscribe(
        () => {
          const current = new Date();
          let logoutTime = this.authenticationService.logoutCheck();
          if (!logoutTime) {
            logoutTime = current;
          }
          const diff = Math.round((logoutTime.getTime() - current.getTime()) / 1000);
          // this.log(`Check Logout Time ${logoutTime.toISOString()} diff ${diff}`)
          if (diff > 0 && diff <= 120) {
            const message = this.translate.instant('autologout.msg.sessionExpires', {remaining: diff});
            this.alertService.error(message);
          }
          if (diff < 0) {
            const message = this.translate.instant('autologout.msg.sessionExpired');
            this.alertService.error(message, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('logoutTimer: ' + message);
  }
}
