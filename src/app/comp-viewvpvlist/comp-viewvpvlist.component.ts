import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VGPermission } from '../_models/visbogroup';

import { visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewvpvlist',
  templateUrl: './comp-viewvpvlist.component.html'
})
export class VisboCompViewVPVListComponent implements OnInit, OnChanges {

  @Input() vps: VisboProjectVersion[];
  @Input() combinedPerm: VGPermission;

  vpFilter: string;

  vpList: VisboProjectVersion[];
  vpvWithKM: number;
  hasCost: Boolean;

  currentLang: string;

  sortAscending: boolean;
  sortColumn: number;


  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.log(`ProjectVPVList Init`);

    this.visboViewVPVList();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`ProjectVPVList Changes ${JSON.stringify(changes)}`);
    this.visboViewVPVList();
  }

  visboViewVPVList(): void {
    this.vpList = [];
    this.hasCost = false;

    if (!this.vps || this.vps.length === 0) {
      return;
    }

    // this.vps.sort((a, b) => visboCmpString(b.name.toLowerCase(), a.name.toLowerCase()));

    for (let i = 0; i < this.vps.length; i++) {
      if (this.vpFilter
        && !(this.vps[i].name.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
          || this.vps[i].businessUnit?.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
          || this.vps[i].leadPerson?.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
          || this.vps[i].VorlagenName?.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
        )
      ) {
        // ignore projects not matching filter
        continue;
      }
      if (this.vps[i].keyMetrics && this.vps[i].keyMetrics.costBaseLastTotal > 0) {
        this.hasCost = true;
      }

      this.vpList.push(this.vps[i]);
    }
  }

  calcPercent(current: number, baseline: number): number {
    if (baseline === undefined) {
      return undefined;
    } else if (baseline === 0) {
      return 1;
    } else {
      return (current || 0) / baseline;
    }
  }

  calcDateDiff(current: Date, baseline: Date): number {
    let currentTime = current ? (new Date(current)).getTime() : 0;
    let baselineTime = baseline ? (new Date(baseline)).getTime() : 0;
    return Math.round((baselineTime - currentTime) / 1000 / 3600 / 24 / 7 * 10) / 10;
  }

  combineName(vpName, variantName): string {
    let result = vpName || '';
    result = result
    if (variantName) {
      result = result.concat(' ( ', variantName, ' ) ')
    }
    return result;
  }

  gotoVP(id: string, variantName: string): void {
    this.log(`goto VP ${id}/${variantName}`);
    this.router.navigate(['vpKeyMetrics//'.concat(id)], variantName ? { queryParams: { variantName: variantName }} : {});
  }

  sortTable(n?: number): void {
    if (!this.vpList) { return; }
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
      this.vpList.sort((a, b) => visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()));
    } else if (this.sortColumn === 2) {
      this.vpList.sort((a, b) => visboCmpString(a.variantName.toLowerCase() || '', b.variantName.toLowerCase() || ''));
    } else if (this.sortColumn === 3) {
      this.vpList.sort((a, b) => visboCmpDate(a.timestamp, b.timestamp));
    } else if (this.sortColumn === 4) {
      this.vpList.sort((a, b) => (b.keyMetrics ? 1 : -1) - (a.keyMetrics ? 1 : -1));
    } else if (this.sortColumn === 5) {
      this.vpList.sort((a, b) => (b.ampelStatus || 0) - (a.ampelStatus || 0));
    } else if (this.sortColumn === 6) {
      this.vpList.sort((a, b) => visboCmpDate(a.endDate, b.endDate));
    } else if (this.sortColumn === 7) {
      this.vpList.sort((a, b) => (this.calcPercent(b.keyMetrics?.costCurrentTotal, b.keyMetrics?.costBaseLastTotal) || 0)
                                  - (this.calcPercent(a.keyMetrics?.costCurrentTotal, a.keyMetrics?.costBaseLastTotal) || 0));
    } else if (this.sortColumn === 8) {
      this.vpList.sort((a, b) => (this.calcPercent(b.keyMetrics?.timeCompletionCurrentActual, b.keyMetrics?.timeCompletionBaseLastActual) || 0)
                                  - (this.calcPercent(a.keyMetrics?.timeCompletionCurrentActual, a.keyMetrics?.timeCompletionBaseLastActual) || 0));
    } else if (this.sortColumn === 9) {
      this.vpList.sort((a, b) => (this.calcPercent(b.keyMetrics?.deliverableCompletionCurrentActual, b.keyMetrics?.deliverableCompletionBaseLastActual) || 0)
                                  - (this.calcPercent(a.keyMetrics?.deliverableCompletionCurrentActual, a.keyMetrics?.deliverableCompletionBaseLastActual) || 0));
    } else if (this.sortColumn === 10) {
      this.vpList.sort((a, b) => (b.keyMetrics?.costCurrentTotal || 0) - (a.keyMetrics?.costCurrentTotal || 0));
    } else if (this.sortColumn === 11) {
      this.vpList.sort((a, b) => (this.calcDateDiff(b.keyMetrics?.endDateCurrent, b.keyMetrics?.endDateBaseLast) || 0)
                                  - (this.calcDateDiff(a.keyMetrics?.endDateCurrent, a.keyMetrics?.endDateBaseLast) || 0));
    }
    if (!this.sortAscending) {
      this.vpList.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewVPVList: ' + message);
  }

}
