import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';

import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-oauthconfirm',
  templateUrl: './oauthconfirm.component.html',
  styleUrls: ['./oauthconfirm.component.css']
})
export class OauthconfirmComponent implements OnInit {

  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    const hash = this.route.snapshot.queryParams.hash;
    console.log(`Init OAuth Confirm Hash ${hash}`);

    this.authenticationService.oauthconfirm(hash);
    console.log(`OAuth Confirm Success`);
    const message = this.translate.instant('oauthconfirm.msg.loginSuccess');
    this.alertService.success(message, true);
    this.router.navigate(['/']);

    // this.authenticationService.oauthconfirm(hash)
    //   .subscribe(
    //     () => {
    //       this.log(`OAuth Confirm Success`);
    //       const message = this.translate.instant('oauthconfirm.msg.loginSuccess');
    //       this.alertService.success(message, true);
    //       this.router.navigate(['/']);
    //     },
    //     error => {
    //       this.log(`Error during OAuth Confirm ${error.error.message}`);
    //       this.alertService.error(getErrorMessage(error));
    //       this.router.navigate(['login']);
    //     }
    //   );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('OAuth Confirm: ' + message);
  }
}
