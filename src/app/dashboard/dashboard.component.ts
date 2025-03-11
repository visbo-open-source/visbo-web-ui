import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';
import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboGetShortText } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

// The DashboardComponent is an Angular component that serves as the main dashboard for the VISBO application. 
// It displays the top Visbo Centers and Visbo Projects, provides navigation to detailed views, and manages user permissions.

export class DashboardComponent implements OnInit {
  visbocenters: VisboCenter[] = [];           // Holds a list of the top 3 Visbo Centers, sorted by their last modification date.
  visboprojects: VisboProject[] = [];         // Holds a list of the top 3 Visbo Projects, also sorted by their last modification date.

  currentLang: string;                        // Stores the current language of the application, used for localized content.

  combinedPerm: VGPermission = undefined;     // Represents the combined user permissions, used for checking access rights.

  permVC = VGPVC;                             // Permission constants specific to Visbo Centers
  permVP = VGPVP;                             // Permission constants specific to Visbo Projects.

  constructor(
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  // Initializes the component, fetching data and setting the page title.
  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.titleService.setTitle(this.translate.instant('dashboard.title'));

    this.getVisboCenters();
    this.getVisboProjects();
  }

  // Fetches the top 3 Visbo Centers, sorted by their last modification date
  getVisboCenters(): void {
    // get top 3 visbo centers ordered by last modification date
    this.visbocenterService.getVisboCenters()
      .subscribe(
        visbocenters => {
          this.visbocenters = visbocenters.sort(function(vc1, vc2) { return vc1.updatedAt > vc2.updatedAt ? -1 : 1; }).slice(0, 3);
        },
        error => {
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Fetches the top 3 Visbo Projects, similarly sorted by their last modification date
  getVisboProjects(): void {
    // get top 3 visbo projects ordered by last modification date
    this.visboprojectService.getVisboProjects(null)
      .subscribe(
        visboprojects => {
          this.visboprojects = visboprojects.sort(function(vp1, vp2) { return vp1.updatedAt > vp2.updatedAt ? -1 : 1; }).slice(0, 3);
        },
        error => {
          // console.log('get VPs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Checks if the user has the specified permission for Visbo Centers.
  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  // Navigates to the Visbo Project associated with the clicked Visbo Center.
  gotoClickedVc(visbocenter: VisboCenter): void {
    this.router.navigate(['vp/' + visbocenter._id]);
  }

  // Navigates to the detailed view of the Visbo Center.
  gotoClickedVcDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['vcDetail/' + visbocenter._id]);
  }

  // Navigates to the appropriate view based on the project type (VPTYPE.PORTFOLIO).
  gotoClickedVp(visboproject: VisboProject): void {
    if (visboproject.vpType === VPTYPE.PORTFOLIO) {
      this.router.navigate(['vpf/' + visboproject._id]);
    } else {
      this.router.navigate(['vpKeyMetrics/' + visboproject._id]);
    }
  }

  //  Navigates to the Visbo Center associated with the clicked Visbo Project.
  gotoClickedVpVc(visboproject: VisboProject): void {
    this.router.navigate(['vp/' + visboproject.vcid]);
  }

  // Navigates to the detailed view of the Visbo Project
  gotoClickedVpDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/' + visboproject._id]);
  }

  // Shortens the given text to the specified length.
  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

}
