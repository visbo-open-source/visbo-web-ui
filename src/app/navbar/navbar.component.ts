import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthenticationService } from '../_services/authentication.service';
import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

@Component({
  selector: 'visbo-navbar',
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  model: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private messageService: MessageService,
    public authenticationService: AuthenticationService
  ) { }

  ngOnInit() {
    // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  gotoClickedItem(action: string):void {
    console.log("clicked nav item %s", action);
    this.router.navigate([action]);
  }
}
