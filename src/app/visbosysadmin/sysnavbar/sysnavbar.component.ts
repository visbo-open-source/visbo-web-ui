import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { VisboCenterService } from '../../_services/visbocenter.service';
import { AlertService } from '../../_services/alert.service';
import { MessageService } from '../../_services/message.service';

import { VGPermission, VGPSYSTEM, VGPVC, VGPVP } from '../../_models/visbogroup';

@Component({
  selector: 'app-sysnavbar',
  templateUrl: './sysnavbar.component.html',
  styleUrls: ['./sysnavbar.component.css']
})

// 🔍 Overview
// The SysNavbarComponent provides a navigation header for system-level administration 
// within the VISBO application. 
// It handles:
// -  Permission-based visibility of navbar items
// -  Route navigation
// -  Logging initialization and actions
//
// 🧱 Core Responsibilities
// -  Determine system, VC, and VP permissions for the current user
// -  Navigate to a route when a navigation item is clicked
// -  Initialize the navbar with user permissions
export class SysNavbarComponent implements OnInit {
  combinedPerm: VGPermission;
  permSystem = VGPSYSTEM;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private messageService: MessageService,
    public visbocenterService: VisboCenterService
  ) { }

  // ngOnInit
  // -  Loads the user's system-level combined permissions via visbocenterService.getSysAdminRole()
  // -  Logs the loaded permission state
  ngOnInit(): void {
    // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    this.log(`Navbar Init Sys Role ${JSON.stringify(this.combinedPerm)} ${this.permSystem.View}`);
  }

  // Navigates to a route defined by the passed action string.
  gotoClickedItem(action: string): void {
    this.router.navigate([action]);
  }

  // Checks whether the user has a given system-level permission.
  // The check uses a bitmask comparison from the combinedPerm object.
  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0;
  }

  // Checks whether the user has a given Visbo Center-level permission.
  // The check uses a bitmask comparison from the combinedPerm object.
  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0;
  }

/** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys NavBar: ' + message);
  }
}
