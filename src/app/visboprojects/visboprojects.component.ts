import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProject, VPTYPE } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VGGroup, VGPermission, VGUser, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';

import { visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboprojects',
  templateUrl: './visboprojects.component.html'
})
export class VisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;
  deleted = false;
  sortAscending: boolean;
  sortColumn: number;

  combinedPerm: VGPermission = undefined;
  permVC: any = VGPVC;
  permVP: any = VGPVP;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.log(`Init GetVisboProjects ${JSON.stringify(this.route.snapshot.queryParams)}`);
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.log(`Init VP Deleted: ${this.deleted}`);
    this.getVisboProjects(this.deleted);
  }

  onSelect(visboproject: VisboProject): void {
    this.getVisboProjects(this.deleted);
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  getVPType(vpType: number): string {
    return VPTYPE[vpType];
  }

  toggleVisboProjects(): void {
    this.deleted = !this.deleted;
    const url = this.route.snapshot.url.join('/');
    this.log(`VP toggleVisboProjects ${this.deleted} URL ${url}`);
    this.getVisboProjects(this.deleted);
    // MS TODO: go to the current url and add delete flag
    this.router.navigate([url], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  getVisboProjects(deleted: boolean): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.vcSelected = id;
    if (id) {
      this.visbocenterService.getVisboCenter(id)
        .subscribe(
          visbocenters => {
            this.vcActive = visbocenters;
            this.combinedPerm = visbocenters.perm;
            this.visboprojectService.getVisboProjects(id, false, deleted)
              .subscribe(
                visboprojects => {
                  this.visboprojects = visboprojects;
                  this.sortVPTable(1);
                },
                error => {
                  this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
                  this.alertService.error(error.error.message);
                }
              );
          },
          error => {
            this.log(`get VC failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(error.error.message);
          }
        );
    } else {
      this.vcSelected = null;
      this.vcActive = null;
      this.visboprojectService.getVisboProjects(null, false, deleted)
        .subscribe(
          visboprojects => {
            this.visboprojects = visboprojects;
            this.sortVPTable(1);
          },
          error => {
            this.log(`get VPs all failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(error.error.message);
          }
        );
    }
  }

  addproject(name: string, vcid: string, desc: string): void {
    name = name.trim();
    this.log(`call create VP ${name} with VCID ${vcid} Desc ${desc} `);
    if (!name) { return; }
    this.visboprojectService.addVisboProject({ name: name, description: desc, vcid: vcid } as VisboProject).subscribe(
      vp => {
        // console.log("add VP %s with ID %s to VC %s", vp[0].name, vp[0]._id, vp[0].vcid);
        this.visboprojects.push(vp);
        this.sortVPTable(undefined);
        this.alertService.success(`Visbo Project ${vp.name} created successfully`);
      },
      error => {
        this.log(`add VP failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          this.alertService.error(`Permission Denied for Visbo Project ${name}`);
        } else if (error.status === 409) {
          // this.alertService.error(`Visbo Project ${name} already exists or not allowed`);
          this.alertService.error('Visbo Project already exists or not allowed');
        } else {
          this.alertService.error(error.error.message);
        }
      }
    );
  }

  delete(visboproject: VisboProject): void {
    // remove item from list
    this.visboprojects = this.visboprojects.filter(vp => vp !== visboproject);
    this.visboprojectService.deleteVisboProject(visboproject)
      .subscribe(
        error => {
          // this.log(`delete VP failed: error: ${error.status} messages: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied: Visbo Project ${name}`, true);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );
  }

  // get the versions of the project
  gotoClickedRow(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    // MS TODO: use enumerator for Type
    if (visboproject.vpType === 1) {
      this.log(`goto VPF for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpf/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    } else {
      this.log(`goto VPV for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    }
  }

  // get the details of the project
  gotoDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVCDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['vcDetail/'.concat(visbocenter._id)]);
  }

  sortVPTable(n) {
    if (n !== undefined) {
      if (!this.visboprojects) {
        return;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    // console.log("Sort VP Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn === 1) {
      // sort by VP Name
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.visboprojects.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.vc.name.toLowerCase(), b.vc.name.toLowerCase());
      });
    } else if (this.sortColumn === 4) {
      // sort by VC vpvCount
      this.visboprojects.sort(function(a, b) {
        return a.vpvCount - b.vpvCount;
      });
    } else if (this.sortColumn === 5) {
      // sort by VP vpType
      this.visboprojects.sort(function(a, b) {
        return a.vpType - b.vpType;
      });
    }
    // console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visboprojects.reverse();
      // console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}
