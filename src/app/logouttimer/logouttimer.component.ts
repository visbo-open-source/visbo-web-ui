import { Component, OnInit, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { interval } from 'rxjs';

import { AuthenticationService } from '../_services/authentication.service';
import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

@Component({
  selector: 'app-logouttimer',
  templateUrl: './logouttimer.component.html',
  styleUrls: ['./logouttimer.component.css']
})
export class LogoutTimerComponent implements OnInit {

  logoutTimer: boolean = true;
  logoutTime: Date = new Date();
  timerID: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    public authenticationService: AuthenticationService,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    // Get Logout Time from authentication Service
    this.logoutTime = new Date();
    this.logoutTime.setSeconds(this.logoutTime.getSeconds()+100)
    this.log(`Logout Time Init ${this.logoutTime.toISOString()} `)
    this.checkLogout();
  }

  checkLogout(){
    //emit value in sequence every 10 second
    const source = interval(10000);
    const subscribe = source.subscribe(
        val => {
          var current = new Date();
          var logoutTime: Date;
          logoutTime = this.authenticationService.logoutCheck()
          if (!logoutTime) logoutTime = current
          var diff = Math.round((logoutTime.getTime() - current.getTime())/1000)
          // this.log(`Check Logout Time ${logoutTime.toISOString()} diff ${diff}`)
          if (diff > 0 && diff <= 60) {
            this.alertService.error(`AutoLogout: Session expires in ${diff} Seconds`, true);
          }
          if (diff < 0) {
            this.log(`Logout Time passed`);
            this.alertService.error("AutoLogout: Session expired, please log in again", true);
            this.router.navigate(['login']);
            // this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );

    // this.authenticationService.logoutCheck().subscribe(
    //       data => {
    //           console.log(JSON.stringify(data));
    //           this.log(JSON.stringify(data));
    //       }
    //    );
  }
  /** Log a message with the MessageService */
  private log(message: string) {
    // console.log('logoutTimer: ' + message)
    this.messageService.add('logoutTimer: ' + message);
  }
}
