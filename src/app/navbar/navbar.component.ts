import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthenticationService } from '../_services/authentication.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'visbo-navbar',
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  systemPerm: VGPermission = undefined;
  permSystem: any = VGPSystem;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private messageService: MessageService,
    public authenticationService: AuthenticationService,
    public visbocenterService: VisboCenterService
  ) { }

  ngOnInit() {
    // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.systemPerm = this.visbocenterService.getSysAdminRole();
    this.log(`Navbar Init Sys Role ${JSON.stringify(this.systemPerm)} View ${this.permSystem.View}`)
  }

  gotoClickedItem(action: string):void {
    // console.log("clicked nav item %s", action);
    this.router.navigate([action]);
  }

  hasSystemPerm(perm: number): boolean {
    return (this.systemPerm.system & perm) > 0
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('NavBar: ' + message);
  }
}
