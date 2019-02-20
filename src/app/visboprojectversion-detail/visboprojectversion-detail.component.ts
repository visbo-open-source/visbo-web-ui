import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Location } from '@angular/common';

import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { MessageService } from '../_services/message.service';
import { VisboProjectService }  from '../_services/visboproject.service';
import { VisboProjectVersionService }  from '../_services/visboprojectversion.service';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProject } from '../_models/visboproject';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-visboprojectversion-detail',
  templateUrl: './visboprojectversion-detail.component.html'
})
export class VisboProjectVersionDetailComponent implements OnInit {

  @Input() visboprojectversion: VisboProjectVersion;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;
  deleted: boolean = false;

  constructor(
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private visboprojectversionService: VisboProjectVersionService,
    private location: Location,
    private alertService: AlertService,
    private router: Router
  ) { }

  ngOnInit() {
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboProjectVersion();
  }

  getVisboProjectVersion(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var currentUser = this.authenticationService.getActiveUser();

    this.log('VisboProjectVersion Detail of: ' + id);
    this.visboprojectversionService.getVisboProjectVersion(id, this.deleted)
      .subscribe(
        visboprojectversion => {
          this.visboprojectversion = visboprojectversion
          this.log(`Get VisboProjectVersion for VPV ${id} ${visboprojectversion.name} `)
        },
        error => {
          this.log(`get VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            // redirect to login and come back to current URL
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  goBack(): void {
    this.location.back();
  }

  delete(visboprojectversion: VisboProjectVersion): void {
    this.log(`delete VPV ${visboprojectversion._id}`);

    this.visboprojectversionService.deleteVisboProjectVersion(visboprojectversion, this.deleted)
      .subscribe(
        () => {
            this.alertService.success(`Visbo Project Version ${visboprojectversion._id} deleted successfully`, true);
            this.log(`delete VPV success`);
            this.goBack();
          },
        error => {
          this.log(`delete VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Project Version ${visboprojectversion._id}`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  gotoVCDetail(visboproject: VisboProject):void {
    this.router.navigate(['vcDetail/'.concat(visboproject.vcid)]);
  }

  gotoVPList(visboproject: VisboProject):void {
    this.log(`goto VP List: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vp/'.concat(visboproject.vcid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  save(): void {
    this.log(`update VPV ${this.visboprojectversion._id}`);
    this.visboprojectversionService.updateVisboProjectVersion(this.visboprojectversion, this.deleted)
      .subscribe(
        (vpv) => {
          this.alertService.success(`Visbo Project ${vpv.name} updated successfully`, true);
          this.goBack();
        },
        error => {
          this.log(`save VPV failed: error: ${error.status} message: ${error.error.message}`);
          // redirect to login and come back to current URL
          if (error.status == 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${this.visboprojectversion._id}`);
          } else if (error.status == 409) {
            this.alertService.error(`Visbo Project ${this.visboprojectversion._id} exists already`);
          } else if (error.status == 401) {
            this.alertService.error(`Session expired, please login again`, true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectVersionDetail: ' + message);
  }
}
