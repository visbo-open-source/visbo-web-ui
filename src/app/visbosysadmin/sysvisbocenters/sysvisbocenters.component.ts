import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { VisboCenter } from '../../_models/visbocenter';
import { VisboCenterService } from '../../_services/visbocenter.service';

import { VGPermission, VGPSYSTEM, VGPVC, VGPVP } from '../../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-sysvisbocenters',
  templateUrl: './sysvisbocenters.component.html'
})
// Overview
// The SysVisboCentersComponent is an Angular component responsible for listing, 
// managing, and navigating Visbo Centers at a system-wide level. 
// It allows users with appropriate permissions to:
// -  View active or deleted Visbo Centers
// -  Create new Visbo Centers
// -  Delete existing ones
// -  Navigate to center-specific detail or VP (Variant Project) views
export class SysVisboCentersComponent implements OnInit {

  visbocenters: VisboCenter[];            // Array of Visbo Centers retrieved from the backend
  sysvisbocenter: VisboCenter;            // Holds the system-wide Visbo Center, if any
  combinedPerm: VGPermission = undefined; // Current user's combined system permissions
  deleted = false;                        // Flag to toggle between active and deleted centers
  permSystem = VGPSYSTEM;                 // Constant for system-level permissions
  permVC = VGPVC;                         // Constant for VC-level permissions
  permVP = VGPVP;                         // Constant for VP-level permissions
  sortAscending: boolean;                 // Determines if sorting is ascending
  sortColumn: number;                     // Index of column currently used for sorting

  constructor(
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  // ngOnInit
  // -  Initializes the component by checking query parameters for deleted flag
  // -  Retrieves the list of Visbo Centers
  // -  Loads user permission roles
  ngOnInit(): void {
    this.log(`Init SysVC Deleted: ${this.deleted}`);
    this.log(`Init GetVisboCenters ${JSON.stringify(this.route.snapshot.queryParams)}`);
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboCenters(this.deleted);
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
  }

  // -  Toggles between viewing active and deleted Visbo Centers.
  // -  Updates URL query parameters accordingly.
  toggleVisboCenters(): void {
    this.deleted = !this.deleted;
    this.log(`VC toggleVisboCenters ${this.deleted}`);
    this.getVisboCenters(this.deleted);
    this.router.navigate(['sysvc'], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
    // this.router.navigate(['sysvcDetail/'+visbocenter._id], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  // -  Fetches Visbo Centers from the backend.
  // -  Applies sorting once fetched
  // -  Displays success or error messages.
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

  // Retrieves the system-wide Visbo Center (usually a single global config VC).
  getSysVisboCenter(): void {
    this.visbocenterService.getSysVisboCenter()
      .subscribe(vc => {
        if (vc.length > 0) {
          this.sysvisbocenter = vc[0];
        }
      });
  }

  // Adds a new Visbo Center with the provided name and description.
  // Displays appropriate error if name exists or permission is denied.
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

  // Deletes the selected Visbo Center.
  // Optimistically removes the entry from the UI.
  // Displays success or failure message.
  delete(visbocenter: VisboCenter): void {
    // remove item from list
    this.messageService.add(`VC: Delete VC: ${visbocenter.name} ID: ${visbocenter._id}`);
    this.visbocenters = this.visbocenters.filter(vc => vc !== visbocenter);
    this.visbocenterService.deleteVisboCenter(visbocenter).subscribe(
      () => {
        const message = 'Deleted Visbo Center: ' + visbocenter.name;
        this.alertService.success(message, true);
      },
      error => {
        this.log(`delete VC failed: error: ${JSON.stringify(error)}`);
        if (error.status === 403) {
          this.alertService.error(`Permission Denied: Visbo Center ${name}`);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  // Navigates to the detail view of a selected Visbo Center.
  // Adds deleted query param if the center is soft-deleted.
  gotoDetail(visbocenter: VisboCenter): void {
    const deleted = visbocenter.deletedAt ? true : false;
    this.log(`navigate to VC Detail ${visbocenter._id} Deleted ${deleted}`);
    this.router.navigate(['sysvcDetail/' + visbocenter._id], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  // Navigates directly to the Variant Projects (sysvp) view for
  // the selected Visbo Center if user has permission.
  gotoClickedRow(visbocenter: VisboCenter): void {
    this.log(`clicked row ${visbocenter.name}`);
    // check that the user has Permission to see VPs
    if (this.hasSystemPerm(this.permVC.View)) {
      this.router.navigate(['sysvp/' + visbocenter._id]);
    }
  }

  // Checks if the user has the given system-level permission.
  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0;
  }

  // Checks if the user has the given Visbo Center-level permission.
  hasVCPerm(perm: number): boolean {
    return (this.combinedPerm.vc & perm) > 0;
  }

  // Checks if the user has the given Variant Project-level permission.
  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm.vp & perm) > 0;
  }

  // Sorts the list of Visbo Centers based on:
  // 1: name
  // 2: update timestamp
  // 3: number of Variant Projects (vpCount)
  // Toggles sort direction when same column is clicked again.
  sortVCTable(n?:number): void {
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
