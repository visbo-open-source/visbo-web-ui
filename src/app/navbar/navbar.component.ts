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
export class NavbarComponent implements OnInit {  
  
  combinedPerm: VGPermission;
  permSystem = VGPSYSTEM;
  visboCenters: VisboCenter[] = [];
  organisation: VisboOrganisation[] = []; 
  currentUser: VisboUser;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private messageService: MessageService,    
    private userService: UserService,
    public visbocenterService: VisboCenterService,
    public visboSettingService: VisboSettingService
  ) { }

  ngOnInit(): void {
    // get return url from route parameters or default to '/'
    // this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    this.log(`Navbar Init Sys Role ${JSON.stringify(this.combinedPerm)} View ${this.permSystem.View}`);   
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));     
    //this.getVisboCenters();
     
  }

  gotoClickedItem(action: string): void {
    this.log(`clicked nav item ${action}`);
    this.router.navigate([action]);
  }

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm?.system & perm) > 0;
  }
  
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

  hasApproveRights(): boolean {   
    return this.currentUser.status.isApprover;
  }

  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('NavBar: ' + message);
  }
}
