import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-sysvisbocenters',
  templateUrl: './sysvisbocenters.component.html'
})
export class SysVisboCentersComponent implements OnInit {

  visbocenters: VisboCenter[];
  sysvisbocenter: VisboCenter;
  combinedPerm: VGPermission = undefined;
  deleted = false;
  permSystem: any = VGPSystem;
  permVC: any = VGPVC;
  permVP: any = VGPVP;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.log(`Init SysVC Deleted: ${this.deleted}`);
    this.log(`Init GetVisboCenters ${JSON.stringify(this.route.snapshot.queryParams)}`);
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboCenters(this.deleted);
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
  }

  onSelect(visbocenter: VisboCenter): void {
    this.getVisboCenters(this.deleted);
  }

  toggleVisboCenters(): void {
    this.deleted = !this.deleted;
    this.log(`VC toggleVisboCenters ${this.deleted}`);
    this.getVisboCenters(this.deleted);
    this.router.navigate(['sysvc'], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['sysvcDetail/'+visbocenter._id], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  getVisboCenters(deleted: boolean): void {
    this.log(`VC getVisboCenters ${JSON.stringify(this.combinedPerm)} deleted ${this.deleted}`);
    this.visbocenterService.getVisboCenters(true, deleted)
      .subscribe(
        visbocenters => {
          this.visbocenters = visbocenters;
          this.sortVCTable(1);
          this.log('get VCs success');

        },
        error => {
          this.log(`get VCs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getSysVisboCenter(): void {
    this.visbocenterService.getSysVisboCenter()
      .subscribe(vc => {
        if (vc.length > 0) {
          this.sysvisbocenter = vc[0];
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
        if (error.status === 403) {
          this.alertService.error(`Permission Denied for Visbo Center ${name}`);
        } else if (error.status === 409) {
          this.alertService.error(`Visbo Center Name ${name} already exists or not allowed`);
        } else {
          this.alertService.error(getErrorMessage(error));
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
        if (error.status === 403) {
          this.alertService.error(`Permission Denied: Visbo Center ${name}`);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  gotoDetail(visbocenter: VisboCenter): void {
    const deleted = visbocenter.deletedAt ? true : false;
    this.log(`navigate to VC Detail ${visbocenter._id} Deleted ${deleted}`);
    this.router.navigate(['sysvcDetail/' + visbocenter._id], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoClickedRow(visbocenter: VisboCenter): void {
    this.log(`clicked row ${visbocenter.name}`);
    // check that the user has Permission to see VPs
    if (this.hasSystemPerm(this.permVC.View)) {
      this.router.navigate(['sysvp/' + visbocenter._id]);
    }
  }

  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0;
  }

  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm.vp & perm) > 0;
  }

  sortVCTable(n) {
    if (!this.visbocenters) {
      return;
    }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortColumn === undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = n === 1 ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      this.visbocenters.sort(function(a, b) { return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    } else if (this.sortColumn === 2) {
      this.visbocenters.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.visbocenters.sort(function(a, b) { return a.vpCount - b.vpCount; });
    }
    if (!this.sortAscending) {
      this.visbocenters.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys VisboCenter: ' + message);
  }
}
