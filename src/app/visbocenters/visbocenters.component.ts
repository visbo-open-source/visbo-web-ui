import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visbocenters',
  styleUrls: ['./visbocenters.component.css'],
  templateUrl: './visbocenters.component.html'
})
export class VisboCentersComponent implements OnInit {

  visbocenters: VisboCenter[];
  sysvisbocenter: VisboCenter;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.titleService.setTitle(this.translate.instant('vc.title'));
    this.getVisboCenters();
  }

  getVisboCenters(): void {
    // this.log("VC getVisboCenters");
    this.visbocenterService.getVisboCenters()
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

  gotoDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['vcDetail/' + visbocenter._id]);
  }

  gotoClickedRow(visbocenter: VisboCenter): void {
    // this.log(`clicked row ${visbocenter.name}`);
    this.router.navigate(['vp/' + visbocenter._id]);
  }

  sortVCTable(n: number): void {
    if (!this.visbocenters) { return; }
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
      this.visbocenters.sort(function(a, b) {
        return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
      });
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
    this.messageService.add('VisboCenter: ' + message);
  }
}
