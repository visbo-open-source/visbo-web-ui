import { Component, OnInit } from '@angular/core';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-sysvisbocenters',
  templateUrl: './sysvisbocenters.component.html'
})
export class SysVisboCentersComponent implements OnInit {

  visbocenters: VisboCenter[];
  sysvisbocenter: VisboCenter;
  vcIsSysAdmin: string;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboCenters();
    this.vcIsSysAdmin = this.visbocenterService.getSysAdminRole()
  }

  onSelect(visbocenter: VisboCenter): void {
    this.getVisboCenters();
  }

  getVisboCenters(): void {
    this.log(`VC getVisboCenters ${this.vcIsSysAdmin}`);
    this.visbocenterService.getVisboCenters(true)
      .subscribe(
        visbocenters => {
          this.visbocenters = visbocenters;
          this.sortVCTable(1);
          this.log('get VCs success');

        },
        error => {
          this.log(`get VCs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  getSysVisboCenters(): void {
    var currentUser = this.authenticationService.getActiveUser();

    // console.log("VC getSysVisboCenters for User %s", currentUser.email);
    this.visbocenterService.getSysVisboCenters()
      .subscribe(visbocenters => {
        if (visbocenters.length >0) {
          this.sysvisbocenter = visbocenters[0];
        }
      });
  }

  add(name: string, description: string): void {
    name = name.trim();
    description = description.trim();
    this.log(`VC: Add VC: ${name}`);
    if (!name) { return; }
    this.visbocenterService.addVisboCenter({ name: name, description: description } as VisboCenter).subscribe(
      vc => {
        this.visbocenters.push(vc);
        this.sortVCTable(undefined);
        this.alertService.success(`Visbo Center ${vc.name} created successfully`);
      },
      error => {
        this.log(`add VC failed: error: ${error.status} message: ${error.error.message}`);
        if (error.status == 403) {
          this.alertService.error(`Permission Denied for Visbo Center ${name}`);
        } else if (error.status == 409) {
          this.alertService.error(`Visbo Center Name ${name} already exists or not allowed`);
        } else if (error.status == 401) {
          this.alertService.error(`Session expired, please login again`, true);
          this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
        } else {
          this.alertService.error(error.error.message);
        }
      }
    );
  }

  delete(visbocenter: VisboCenter): void {
    // remove item from list
    this.messageService.add(`VC: Delete VC: ${visbocenter.name} ID: ${visbocenter._id}`);
    this.visbocenters = this.visbocenters.filter(vc => vc !== visbocenter);
    this.visbocenterService.deleteVisboCenter(visbocenter).subscribe(
      error => {
        this.log(`delete VC failed: error: ${error.status} message: ${error.error.message}`);
        if (error.status == 403) {
          this.alertService.error(`Permission Denied: Visbo Center ${name}`);
        } else if (error.status == 401) {
          this.alertService.error(`Session expired, please login again`, true);
          this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
        } else {
          this.alertService.error(error.error.message);
        }
      }
    );
  }

  gotoDetail(visbocenter: VisboCenter):void {
    this.log(`navigate to VC Detail ${visbocenter._id}`);
    this.router.navigate(['sysvcDetail/'+visbocenter._id]);
  }

  gotoClickedRow(visbocenter: VisboCenter):void {
    this.log(`clicked row ${visbocenter.name}`);
    this.router.navigate(['sysvp/'+visbocenter._id]);
  }

  sortVCTable(n) {

    if (!this.visbocenters) return
    // change sort order otherwise sort same column same direction
    if (n != undefined || this.sortColumn == undefined) {
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = n == 1 ? true : false;
        // console.log("Sort VC Column undefined", this.sortColumn, this.sortAscending)
      }
      else this.sortAscending = !this.sortAscending;
    }
    // console.log("Sort VC Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn == 1) {
      this.visbocenters.sort(function(a, b) {
        var result = 0
        if (a.name.toLowerCase() > b.name.toLowerCase())
          result = 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      this.visbocenters.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort VP Count
      this.visbocenters.sort(function(a, b) { return a.vpCount - b.vpCount })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visbocenters.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys VisboCenter: ' + message);
  }
}
