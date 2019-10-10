import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthenticationService } from '../_services/authentication.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'sysvisbo-navbar',
  templateUrl: './sysnavbar.component.html'
})
export class SysNavbarComponent implements OnInit {
  combinedPerm: VGPermission = undefined;
  permSystem: any = VGPSystem;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

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
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    this.log(`Navbar Init Sys Role ${JSON.stringify(this.combinedPerm)} ${this.permSystem.View}`)
  }

  gotoClickedItem(action: string):void {
    // console.log("clicked nav item %s", action);
    this.router.navigate([action]);
  }

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0
  }

  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0
  }

/** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys NavBar: ' + message);
  }
}
