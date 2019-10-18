import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VisboProjectService }  from '../_services/visboproject.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  visbocenters: VisboCenter[] = [];
  visboprojects: VisboProject[] = [];

  constructor(
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboCenters();
    this.getVisboProjects();
  }

  getVisboCenters(): void {
    // get top 3 visbo centers ordered by last modification date
    this.visbocenterService.getVisboCenters()
      .subscribe(
        visbocenters => {
          this.visbocenters = visbocenters.sort(function(vc1, vc2){return vc1.updatedAt>vc2.updatedAt?-1:1}).slice(0, 3)
        },
        error => {
          console.log('get VCs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  getVisboProjects(): void {
    // get top 3 visbo projects ordered by last modification date
    this.visboprojectService.getVisboProjects(null)
      .subscribe(
        visboprojects => {
          this.visboprojects = visboprojects.sort(function(vp1, vp2){return vp1.updatedAt>vp2.updatedAt?-1:1}).slice(0, 3)
        },
        error => {
          console.log('get VPs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  gotoClickedVc(visbocenter: VisboCenter):void {
    // console.log("clicked row %s", visbocenter.name);
    this.router.navigate(['vp/'+visbocenter._id]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

  gotoClickedVcDetail(visbocenter: VisboCenter):void {
    console.log("clicked row %s", visbocenter.name);
    this.router.navigate(['vcDetail/'+visbocenter._id]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

  gotoClickedVp(visboproject: VisboProject):void {
    console.log("clicked row %s", visboproject.name);
    if (visboproject.vpType == VPTYPE["Portfolio"]) {
      this.router.navigate(['vpf/'+visboproject._id]);
    } else {
      this.router.navigate(['vpv/'+visboproject._id]);
    }
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

  gotoClickedVpDetail(visboproject: VisboProject):void {
    console.log("clicked row %s", visboproject.name);
    this.router.navigate(['vpDetail/'+visboproject._id]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }
}
