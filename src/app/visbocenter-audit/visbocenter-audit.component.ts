import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboAudit, VisboAuditActionType, QueryAuditType } from '../_models/visboaudit';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboAuditService } from '../_services/visboaudit.service';

import { visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

function encodeCSV(source: string): string {
  let result: string;
  if (!source) {
    return source;
  }
  result = source.replace(/\t/g, ' ');
  if (result[0] === '='  || result[0] === '+'  || result[0] === '-' ) {
      result = "'".concat(result);
  }
  return result;
}

@Component({
  selector: 'app-visbocenter-audit',
  templateUrl: './visbocenter-audit.component.html',
  styleUrls: ['./visbocenter-audit.component.css']
})
export class VisbocenterAuditComponent implements OnInit {

  @Input() visbocenter: VisboCenter;
  combinedPerm: any;
  audit: VisboAudit[];
  auditIndex: number;
  auditFrom: Date;
  auditTo: Date;
  auditCount: number;
  auditText: string;
  showMore: boolean;
  sortAscending: boolean;
  sortColumn: number;
  today: Date;
  auditType: string;
  auditTypeAction: string;
  auditTypeList: any[] = [
    {name: 'All', action: ''},
    {name: 'Read', action: 'GET'},
    {name: 'Create', action: 'POST'},
    {name: 'Update', action: 'PUT'},
    {name: 'Delete', action: 'DELETE'}
  ];
  auditArea: string;
  auditAreaAction: string;
  auditAreaList: any[] = [
    {name: 'All', action: ''},
    {name: 'VC', action: 'vc'},
    {name: 'VP', action: 'vp'}
  ];
  sysadmin: boolean;
  deleted = false;

  constructor(
    private visboauditService: VisboAuditService,
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.sysadmin = this.route.snapshot.queryParams['sysadmin'];
    this.deleted = this.route.snapshot.queryParams['deleted'] === true;
    const id = this.route.snapshot.paramMap.get('id');
    this.visbocenterService.getVisboCenter(id, this.sysadmin, this.deleted)
      .subscribe(
        visbocenter => {
          this.visbocenter = visbocenter;
          this.combinedPerm = visbocenter.perm;
          this.log(`VisboCenter initialised ${this.visbocenter._id} Perm ${JSON.stringify(this.combinedPerm)} `);
        },
        error => {
          this.log(`Get VC failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied`);
            const message = this.translate.instant('vcAudit.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(error.error.message);
          }
        }
      );

    this.auditCount = 50;
    this.auditType = this.auditTypeList[0].name;
    this.auditArea = this.auditAreaList[0].name;
    this.today = new Date();
    this.today.setHours(0, 0, 0, 0);

    this.getVisboCenterAudits();
    this.sortTable(undefined);
  }

  getVisboCenterAudits(): void {
    const id = this.route.snapshot.paramMap.get('id');
    let queryAudit: QueryAuditType;
    queryAudit = new QueryAuditType;
    this.log(`Audit getVisboCenterAudits from ${this.auditFrom} to ${this.auditTo} Text ${this.auditText} AuditType ${this.auditType}`);
    // set date values if not set or adopt to end of day in case of to date

    if (this.auditTo) {
      queryAudit.to = new Date(this.auditTo);
    } else {
      queryAudit.to = new Date();
    }
    if (this.auditFrom) {
      queryAudit.from = new Date(this.auditFrom);
    }
    if (this.auditText) {
      queryAudit.text = this.auditText.trim();
    }
    for (let i = 0; i < this.auditTypeList.length; i++) {
      if (this.auditType === this.auditTypeList[i].name) {
        queryAudit.actionType = this.auditTypeList[i].action;
        break;
      }
    }
    for (let i = 0; i < this.auditAreaList.length; i++) {
      if (this.auditArea === this.auditAreaList[i].name) {
        queryAudit.area = this.auditAreaList[i].action;
        break;
      }
    }
    queryAudit.maxcount = this.auditCount;

    this.log(`Audit getVisboCenterAudits VC ${id} recalc Query ${JSON.stringify(queryAudit)}`);
    this.visboauditService.getVisboCenterAudits(id, this.sysadmin, this.deleted, queryAudit)
      .subscribe(
        audit => {
          this.audit = audit;
          this.sortTable(undefined);
          this.log('get Audit success');
        },
        error => {
          this.log(`get Audit failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

  downloadVisboAudit(): void {
    this.log(`sysAudit Download ${this.audit.length} Items`);
    let data: string;
    const separator = '\t';
    data = 'sep=' + separator + '\n';  // to force excel to use the separator
    data = data + 'date' + separator
          + 'time UTC' + separator
          + 'email' + separator
          + 'actiondDescription' + separator
          + 'action' + separator
          + 'url' + separator
          + 'actionInfo' + separator
          + 'responseTime' + separator
          + 'responseStatus' + separator
          + 'vcid' + separator
          + 'vcname' + separator
          + 'vpid' + separator
          + 'vpname' + separator
          + 'vpvid' + separator
          + 'size' + separator
          + 'ip' + separator
          + 'userId' + separator
          + 'userAgent' + separator
          + 'ttl' + separator
          + 'VC Details' + separator
          + 'VP Details' + '\n';
    for (let i = 0; i < this.audit.length; i++) {
      const createdAt = new Date(this.audit[i].createdAt).toISOString();
      const userAgent = (this.audit[i].userAgent || '').replace(/,/g, ';');
      const lineItem = createdAt.substr(0, 10) + separator
                  + createdAt.substr(11, 8) + separator
                  + encodeCSV(this.audit[i].user.email) + separator
                  + encodeCSV(this.audit[i].actionDescription) + separator
                  + this.audit[i].action + separator
                  + this.audit[i].url + separator
                  + this.audit[i].actionInfo + separator
                  + (this.audit[i].result ? this.audit[i].result.time : '') + separator
                  + (this.audit[i].result ? this.audit[i].result.status : '') + separator
                  + (this.audit[i].vc ? this.audit[i].vc.vcid : '') + separator
                  + (this.audit[i].vc ? encodeCSV(this.audit[i].vc.name) : '') + separator
                  + (this.audit[i].vp ? this.audit[i].vp.vpid : '') + separator
                  + (this.audit[i].vp ? encodeCSV(this.audit[i].vp.name) : '') + separator
                  + (this.audit[i].vpv ? this.audit[i].vpv.vpvid : '') + separator
                  + (this.audit[i].result ? this.audit[i].result.size : '0') + separator
                  + this.audit[i].ip + separator
                  + this.audit[i].user.userId + separator
                  + encodeCSV(userAgent) + separator
                  + (this.audit[i].ttl || '') + separator
                  + (this.audit[i].vc ? (encodeCSV(this.audit[i].vc.vcjson) || '') : '') + separator
                  + (this.audit[i].vp ? (encodeCSV(this.audit[i].vp.vpjson) || '') : '') + '\n';
      data = data.concat(lineItem);
    }
    this.log(`VC Audit CSV Len ${data.length} `);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    this.log(`Open URL ${url}`);
    let a: any;
    a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = 'auditlog-VC.csv';
    this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  helperAuditIndex(auditIndex: number): void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.auditIndex = auditIndex;
  }

  helperFormatBytes(a, b = 2): string {
    if (0 === a) {
      return '0 B';
    }
    const c = 1024, d = b || 2;
    const e = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const f = Math.floor(Math.log(a) / Math.log(c));
    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + ' ' + e[f];
  }

  pageAuditIndex(increment: number): void {
    let newAuditIndex = this.auditIndex + increment;
    if (newAuditIndex < 0) {
      newAuditIndex = 0;
    }
    if (newAuditIndex >= this.audit.length) {
      newAuditIndex = this.audit.length - 1;
    }
    this.auditIndex = newAuditIndex;
  }

  helperResponseText(visboaudit: VisboAudit): string {
    const status = visboaudit.result.status;
    switch (status) {
      case '200':
      case '304':
      case '400':
      case '401':
      case '403':
      case '404':
      case '409':
      case '423':
      case '500':
        return this.translate.instant('vcAudit.result.HTTP' + status);
        break;
      default:
        return visboaudit.result.statusText ? visboaudit.result.statusText : status.toString();
    }
  }

  helperShortenText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  goBack(): void {
    // this.log(`VC Details go Back ${JSON.stringify(this.location)}`)
    this.location.back();
  }

  toggleDetail(): void {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  isToday(checkDate: string): boolean {
    // this.log(`Check Date ${checkDate} ${this.today.toISOString()}`);
    return new Date(checkDate) > this.today;
  }

  sortTable(n) {
    if (!this.audit) {
      return;
    }
    // change sort order otherwise sort same column same direction
    if (n !== undefined) {
      // sort a different column
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      } else if (this.sortAscending !== undefined) {
        this.sortAscending = !this.sortAscending;
      }
    } else {
      this.sortColumn = 1;
      this.sortAscending = undefined;
    }
    if (this.sortAscending === undefined) {
      // sort name column ascending, number values desc first
      this.sortAscending = (n === 2 || n === 3 || n === 4) ? true : false;
    }
    if (this.sortColumn === 1) {
      this.audit.sort(function(a, b) { return visboCmpDate(a.createdAt, b.createdAt); });
    } else if (this.sortColumn === 2) {
      this.audit.sort(function(a, b) { return visboCmpString(a.user.email.toLowerCase(), b.user.email.toLowerCase()); });
    } else if (this.sortColumn === 3) {
      this.audit.sort(function(a, b) { return visboCmpString(a.action, b.action); });
    } else if (this.sortColumn === 4) {
      this.audit.sort(function(a, b) { return visboCmpString(a.url, b.url); });
    } else if (this.sortColumn === 5) {
      this.audit.sort(function(a, b) { return visboCmpString(a.result.status, b.result.status); });
    } else if (this.sortColumn === 6) {
      this.audit.sort(function(a, b) { return a.result.time - b.result.time; });
    } else if (this.sortColumn === 7) {
      this.audit.sort(function(a, b) { return (a.result.size || 0) - (b.result.size || 0); });
    }
    if (!this.sortAscending) {
      this.audit.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VC Audit: ' + message);
  }
}
