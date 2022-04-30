import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { VisboCenterService } from '../_services/visbocenter.service';
import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

import { VGPermission, VGPSYSTEM } from '../_models/visbogroup';
import { getPreView } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-usernavbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  combinedPerm: VGPermission;
  permSystem = VGPSYSTEM;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private messageService: MessageService,
    public visbocenterService: VisboCenterService
  ) { }

  ngOnInit(): void {
    // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    this.log(`Navbar Init Sys Role ${JSON.stringify(this.combinedPerm)} View ${this.permSystem.View}`);
  }

  gotoClickedItem(action: string): void {
    this.log(`clicked nav item ${action}`);
    this.router.navigate([action]);
  }

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm?.system & perm) > 0;
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('NavBar: ' + message);
  }
}
