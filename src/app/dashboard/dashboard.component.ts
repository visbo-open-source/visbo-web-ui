import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';
import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  visbocenters: VisboCenter[] = [];
  visboprojects: VisboProject[] = [];

  combinedPerm: VGPermission = undefined;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getVisboCenters();
    this.getVisboProjects();
  }

  getVisboCenters(): void {
    // get top 3 visbo centers ordered by last modification date
    this.visbocenterService.getVisboCenters()
      .subscribe(
        visbocenters => {
          this.visbocenters = visbocenters.sort(function(vc1, vc2) { return vc1.updatedAt > vc2.updatedAt ? -1 : 1; }).slice(0, 3);
        },
        error => {
          console.log('get VCs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getVisboProjects(): void {
    // get top 3 visbo projects ordered by last modification date
    this.visboprojectService.getVisboProjects(null)
      .subscribe(
        visboprojects => {
          this.visboprojects = visboprojects.sort(function(vp1, vp2) { return vp1.updatedAt > vp2.updatedAt ? -1 : 1; }).slice(0, 3);
        },
        error => {
          console.log('get VPs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  gotoClickedVc(visbocenter: VisboCenter): void {
    this.router.navigate(['vp/' + visbocenter._id]);
  }

  gotoClickedVcDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['vcDetail/' + visbocenter._id]);
  }

  gotoClickedVp(visboproject: VisboProject): void {
    if (visboproject.vpType === VPTYPE['Portfolio']) {
      this.router.navigate(['vpf/' + visboproject._id]);
    } else {
      this.router.navigate(['vpKeyMetrics/' + visboproject._id]);
    }
  }

  gotoClickedVpVc(visboproject: VisboProject): void {
    this.router.navigate(['vp/' + visboproject.vcid]);
  }

  gotoClickedVpDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/' + visboproject._id]);
  }
}
