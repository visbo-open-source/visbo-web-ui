import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';
import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { UserService } from '../_services/user.service';
import { VisboUser, VisboUserProfile } from '../_models/visbouser';

import { VGPermission, VGPSYSTEM } from '../_models/visbogroup';
import { VisboOrganisation } from '../_models/visbosetting';
import { VisboCenter } from '../_models/visbocenter';
import { getPreView } from '../_helpers/visbo.helper';
import { DashboardComponent } from '../dashboard/dashboard.component';


@Component({
  selector: 'app-usernavbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})

// The NavbarComponent is an Angular component responsible for managing the navigation bar of the VISBO application. 
// It handles dynamic navigation, user permissions, and displays Visbo Centers and Organizations based on the user's access rights.

export class NavbarComponent implements OnInit {  
  
  combinedPerm: VGPermission;                   // Holds the combined permissions of the currently logged-in user, primarily to manage system-level access.
  permSystem = VGPSYSTEM;                       // System permission constants used to validate access to various system features.
  visboCenters: VisboCenter[] = [];             // Array to store Visbo Centers retrieved from the service.
  organisation: VisboOrganisation[] = [];       // List of organizations associated with the selected Visbo
  currentUser: VisboUser;                       // The currently logged-in user, loaded from local storage.

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private messageService: MessageService,    
    private userService: UserService,
    public visbocenterService: VisboCenterService,
    public visboSettingService: VisboSettingService
  ) { }

  //  Initializes the navigation bar component.
  ngOnInit(): void {
    // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    this.log(`Navbar Init Sys Role ${JSON.stringify(this.combinedPerm)} View ${this.permSystem.View}`);   
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));     
    //this.getVisboCenters();
     
  }

  // Navigates to a route specified by the action parameter when a navigation item is clicked.
  gotoClickedItem(action: string): void {
    this.log(`clicked nav item ${action}`);
    this.router.navigate([action]);
  }

  // Checks if the user has the specified system permission.
  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm?.system & perm) > 0;
  }

  // Retrieves all Visbo Centers and updates the visboCenters array.
  getVisboCenters(): void {
    // this.log("VC getVisboCenters");
    this.visbocenterService.getVisboCenters()
      .subscribe(
        visbocenters => {
          this.visboCenters = visbocenters;
          this.log('get VCs success');
        },
        error => {
          this.log(`get VCs failed: error: ${error.status} message: ${error.error.message}`);
          //this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Fetches the list of organizations for a specific Visbo Center.
  getOrganizationList(selectedCenterId: string): void {
    this.visboSettingService.getVCOrganisations(
      selectedCenterId, false, new Date().toISOString(), true, false).subscribe(
      organisation => {
        this.organisation = organisation;      
        },
      error => {
        console.log(error);
      });
  }

  // Checks if the current user has approval rights.
  hasApproveRights(): boolean {   
    return this.currentUser.status.isApprover;
  }

  // Retrieves the application's preview mode status.
  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('NavBar: ' + message);
  }
}
