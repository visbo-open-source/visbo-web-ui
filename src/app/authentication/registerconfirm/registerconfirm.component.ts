import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { AuthenticationService } from '../../_services/authentication.service';

import { getErrorMessage } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-registerconfirm',
  templateUrl: './registerconfirm.component.html',
  styleUrls: ['./registerconfirm.component.css']
})
export class RegisterconfirmComponent implements OnInit {

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
    const userId = this.route.snapshot.queryParams.id;
    this.log(`Init Register Confirm userid ${userId} Token ${hash}`);

    this.authenticationService.registerconfirm(userId, hash)
      .subscribe(
        () => {
          this.log(`Register Confirm Success`);
          const message = this.translate.instant('registerConfirm.msg.registerSuccess');
          this.alertService.success(message, true);
          this.router.navigate(['login']);
        },
        error => {
          this.log(`Error during Register Confirm ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
          this.router.navigate(['login']);
        }
      );
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Register Confirm: ' + message);
  }
}
