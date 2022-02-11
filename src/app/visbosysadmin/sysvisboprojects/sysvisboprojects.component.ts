import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VisboProject } from '../../_models/visboproject';
import { VisboProjectService } from '../../_services/visboproject.service';
import { VisboCenter } from '../../_models/visbocenter';
import { VisboCenterService } from '../../_services/visbocenter.service';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-sysvisboprojects',
  templateUrl: './sysvisboprojects.component.html'
})
export class SysVisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;

  combinedPerm: VGPermission = undefined;
  permVC = VGPVC;
  permVP = VGPVP;

  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    // console.log("Init VisboProjects");
    this.getVisboProjects();
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
  }

  getVisboProjects(): void {
    this.log(`VP getSysVisboProjects SysAdminRole ${JSON.stringify(this.combinedPerm)}`);
    const id = this.route.snapshot.paramMap.get('id');

    this.vcSelected = id;
    if (id) {
      this.visbocenterService.getVisboCenter(id, true)
        .subscribe(
          visbocenters => {
            this.vcActive = visbocenters;
            this.combinedPerm = visbocenters.perm;
            this.log(`Get VisboProject for VC ${id} Perm ${JSON.stringify(this.combinedPerm)}`);
            if (this.combinedPerm.vp & this.permVP.View) {
              this.visboprojectService.getVisboProjects(id, true)
                .subscribe(
                  visboprojects => {
                    this.visboprojects = visboprojects;
                    this.sortVPTable(1);
                  },
                  error => {
                    this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
                    this.alertService.error(getErrorMessage(error));
                  }
                );
            } else {
              this.visboprojects = [];
            }
          },
          error => {
            this.log(`get VC failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
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
            this.alertService.error(getErrorMessage(error));
          }
        );
    }
  }

  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  gotoClickedRow(visboproject: VisboProject): void {
    this.log(`clicked row ${visboproject.name}`);
    // this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)]);
  }

  gotoDetail(visboproject: VisboProject): void {
    this.router.navigate(['sysvpDetail/'.concat(visboproject._id)]);
  }

  gotoVCDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['sysvcDetail/'.concat(visbocenter._id)]);
  }

  sortVPTable(n: number): void {
    if (!this.visboprojects) { return; }
    if (n !== undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = n === 1 || n === 3 ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      this.visboprojects.sort(function(a, b) { return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    } else if (this.sortColumn === 2) {
      this.visboprojects.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.visboprojects.sort(function(a, b) { return visboCmpString(a.vc.name.toLowerCase(), b.vc.name.toLowerCase()); });
    } else if (this.sortColumn === 4) {
      this.visboprojects.sort(function(a, b) { return a.vpvCount - b.vpvCount; });
    }
    if (!this.sortAscending) {
      this.visboprojects.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}
