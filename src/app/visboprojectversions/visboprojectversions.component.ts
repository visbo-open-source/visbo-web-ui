import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-visboprojectversions',
  templateUrl: './visboprojectversions.component.html'
})
export class VisboProjectVersionsComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];
  vpSelected: string;
  vpActive: VisboProject;
  deleted: boolean = false;
  sortAscending: boolean;
  sortColumn: number;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    // this.getVisboCenters();
    this.getVisboProjectVersions();
  }

  onSelect(visboprojectversion: VisboProjectVersion): void {
    this.getVisboProjectVersions();
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm == undefined) return false
    return (this.combinedPerm.vp & perm) > 0
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var i: number;
    this.vpSelected = id;
    this.log(`get VP name if ID is used ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          visboproject => {
            this.vpActive = visboproject;
            this.combinedPerm = visboproject.perm;
            this.log(`get VP name if ID is used ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
            this.visboprojectversionService.getVisboProjectVersions(id, this.deleted)
              .subscribe(
                visboprojectversions => this.visboprojectversions = visboprojectversions,
                error => {
                  this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
                  // redirect to login and come back to current URL
                  if (error.status == 403) {
                    this.alertService.error(`Permission Denied for Visbo Project Versions`);
                  } else if (error.status == 401) {
                    this.alertService.error(`Session expired, please login again`, true);
                    this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
                  } else {
                    this.alertService.error(error.error.message);
                  }
                }
              );
          },
          error => {
            this.log(`get VPV VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status == 403) {
              this.alertService.error(`Permission Denied for Visbo Project`);
            } else if (error.status == 401) {
              this.alertService.error(`Session expired, please login again`, true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
            } else {
              this.alertService.error(error.error.message);
            }
        });
    } else {
      this.vpSelected = null;
      this.vpActive = null;
      this.visboprojectversionService.getVisboProjectVersions(null)
        .subscribe(
          visboprojectversions => this.visboprojectversions = visboprojectversions,
          error => {
            this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
            // redirect to login and come back to current URL
            if (error.status == 403) {
              this.alertService.error(`Permission Denied for Visbo Project Versions`);
            } else if (error.status == 401) {
              this.alertService.error(`Session expired, please login again`, true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
            } else {
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  toggleVisboProjectVersions(): void {
    this.deleted = !this.deleted
    var url = this.route.snapshot.url.join('/')
    this.log(`VP toggleVisboProjectVersions ${this.deleted} URL ${url}`);
    this.getVisboProjectVersions();
    // MS TODO: go to the current url and add delete flag
    this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoClickedRow(visboprojectversion: VisboProjectVersion):void {
    this.log(`goto VPV Detail for VP ${visboprojectversion.name} Deleted ${this.deleted}`);
    this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)], {});
}

  gotoVPDetail(visboproject: VisboProject):void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  sortVPVTable(n) {
    if (!this.visboprojectversions) return
    if (n != undefined) {
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n == 5 ) ? true : false;
      }
      else this.sortAscending = !this.sortAscending;
    }
    if (this.sortColumn == 1) {
      // sort by VPV Timestamp
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.timestamp > b.timestamp)
          result = 1;
        else if (a.timestamp < b.timestamp)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by VPV endDate
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.endDate > b.endDate)
          result = 1;
        else if (a.endDate < b.endDate)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by VPV ampelStatus
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.ampelStatus > b.ampelStatus)
          result = 1;
        else if (a.ampelStatus < b.ampelStatus)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by VPV Erloes
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // this.log("Sort VC Date %s", a.updatedAt)
        if (a.Erloes > b.Erloes)
          result = 1;
        else if (a.Erloes < b.Erloes)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort by VC vpvCount
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.variantName.toLowerCase() > b.variantName.toLowerCase())
          result = 1;
        else if (a.variantName.toLowerCase() < b.variantName.toLowerCase())
          result = -1;
        return result
      })
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectVersion: ' + message);
  }
}
