import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService }  from '../_services/visbocenter.service';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-sysvisboprojects',
  templateUrl: './sysvisboprojects.component.html'
})
export class SysVisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;
  vcIsAdmin: boolean;
  systemPerm: VGPermission = undefined;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private alertService: AlertService,
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    // console.log("Init VisboProjects");
    this.getVisboProjects();
    this.systemPerm = this.visbocenterService.getSysAdminRole()
  }

  onSelect(visboproject: VisboProject): void {
    this.getVisboProjects();
  }

  getVisboProjects(): void {
    this.log(`VP getSysVisboProjects SysAdminRole ${JSON.stringify(this.systemPerm)}`);
    const id = this.route.snapshot.paramMap.get('id');
    var i: number;
    var currentUser = this.authenticationService.getActiveUser();

    this.vcSelected = id;
    if (id) {
      this.visbocenterService.getVisboCenter(id, true)
        .subscribe(
          visbocenters => {
            this.vcActive = visbocenters;
            this.vcIsAdmin = this.vcActive.users.find(user => user.email == currentUser.email && user.role == 'Admin') ? true : false;
            this.log(`User is Admin? ${this.vcIsAdmin}`)
            this.visboprojectService.getVisboProjects(id, true)
              .subscribe(
                visboprojects => {
                  this.visboprojects = visboprojects;
                  this.sortVPTable(1);
                },
                error => {
                  this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
                  this.alertService.error(error.error.message);
                  // redirect to login and come back to current URL
                  if (error.status == 401) {
                    this.alertService.error("Session expired, please log in again", true);
                    this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
                  }
                }
              );
          },
          error => {
            this.log(`get VC failed: error:  ${error.status} message: ${error.error.message}`);
            // redirect to login and come back to current URL
            if (error.status == 401) {
              this.alertService.error("Session expired, please log in again", true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
            } else {
              this.alertService.error(error.error.message);
            }
          }
        );
    } else {
      this.vcSelected = null;
      this.vcActive = null;
      this.visboprojectService.getVisboProjects(null, true)
        .subscribe(
          visboprojects => {
            this.visboprojects = visboprojects;
            this.sortVPTable(1);
          },
          error => {
            this.log(`get VPs all failed: error:  ${error.status} message: ${error.error.message}`);
            // redirect to login and come back to current URL
            if (error.status == 401) {
              this.alertService.error("Session expired, please log in again", true);
              this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
            } else {
              this.alertService.error(error.error.message);
            }
          }
        );
    }
  }

  // addproject(name: string, vcid: string, desc: string, vpPublic: boolean): void {
  //   name = name.trim();
  //   this.log(`call create VP ${name} with VCID ${vcid} Desc ${desc} Public ${vpPublic}`);
  //   if (!name) { return; }
  //   this.visboprojectService.addVisboProject({ name: name, description: desc, vpPublic: vpPublic == true, vcid: vcid } as VisboProject).subscribe(
  //     vp => {
  //       // console.log("add VP %s with ID %s to VC %s", vp[0].name, vp[0]._id, vp[0].vcid);
  //       this.visboprojects.push(vp);
  //       this.sortVPTable(undefined);
  //       this.alertService.success(`Visbo Project ${vp.name} created successfully`);
  //     },
  //     error => {
  //       this.log(`add VP failed: error: ${error.status} messages: ${error.error.message}`);
  //       if (error.status == 403) {
  //         this.alertService.error(`Permission Denied for Visbo Project ${name}`);
  //       } else if (error.status == 409) {
  //         // this.alertService.error(`Visbo Project ${name} already exists or not allowed`);
  //         this.alertService.error('Visbo Project already exists or not allowed');
  //       } else if (error.status == 401) {
  //         this.alertService.error(`Session expired, please login again`, true);
  //         this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
  //       } else {
  //         this.alertService.error(error.error.message);
  //       }
  //     }
  //   );
  // }
  //
  // delete(visboproject: VisboProject): void {
  //   // remove item from list
  //   this.visboprojects = this.visboprojects.filter(vp => vp !== visboproject);
  //   this.visboprojectService.deleteVisboProject(visboproject)
  //     .subscribe(
  //       error => {
  //         // this.log(`delete VP failed: error: ${error.status} messages: ${error.error.message}`);
  //         if (error.status == 403) {
  //           this.alertService.error(`Permission Denied: Visbo Project ${name}`, true);
  //         } else if (error.status == 401) {
  //           this.alertService.error(`Session expired, please login again`, true);
  //           this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
  //         } else {
  //           this.alertService.error(error.error.message);
  //         }
  //       }
  //     );
  // }

  gotoClickedRow(visboproject: VisboProject):void {
    console.log("clicked row %s", visboproject.name);
    // this.router.navigate(['vpv/'.concat(visboproject._id)]);
  }

  gotoDetail(visboproject: VisboProject):void {
    this.router.navigate(['sysvpDetail/'.concat(visboproject._id)]);
  }

  gotoVCDetail(visbocenter: VisboCenter):void {
    this.router.navigate(['sysvcDetail/'.concat(visbocenter._id)]);
  }

  sortVPTable(n) {
    if (n != undefined) {
      if (!this.visboprojects) return
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = n == 1 || n == 3 ? true : false;
      }
      else this.sortAscending = !this.sortAscending;
    }
    // console.log("Sort VP Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn == 1) {
      // sort by VP Name
      this.visboprojects.sort(function(a, b) {
        var result = 0
        if (a.name.toLowerCase() > b.name.toLowerCase())
          result = 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by VP updatedAt
      this.visboprojects.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by VC Name
      this.visboprojects.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.vc.name.toLowerCase() > b.vc.name.toLowerCase())
          result = 1;
        else if (a.vc.name.toLowerCase() < b.vc.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by VC vpvCount
      this.visboprojects.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.vpvCount > b.vpvCount)
          result = 1;
        else if (a.vpvCount < b.vpvCount)
          result = -1;
        return result
      })
    }
    // console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visboprojects.reverse();
      // console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}
