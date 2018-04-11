import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthenticationService } from '../_services/authentication.service';
import { AlertService } from '../_services/alert.service';

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
    public authenticationService: AuthenticationService
  ) { }

  ngOnInit() {
    console.log('Navbar init')
    // reset login status
    // this.authenticationService.logout();
    //
    // // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

}
