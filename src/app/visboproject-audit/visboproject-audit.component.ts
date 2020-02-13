import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { VisboAudit, QueryAuditType } from '../_models/visboaudit';

import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProject } from '../_models/visboproject';
import { VisboAuditService } from '../_services/visboaudit.service';
import { LoginComponent } from '../login/login.component';

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
  selector: 'app-visboproject-audit',
  templateUrl: './visboproject-audit.component.html',
  styleUrls: ['./visboproject-audit.component.css']
})
export class VisboprojectAuditComponent implements OnInit {

  visboproject: VisboProject;
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
  sysadmin: boolean;
  deleted = false;

  constructor(
    private visboauditService: VisboAuditService,
    private visboprojectService: VisboProjectService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private alertService: AlertService,
    private location: Location,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.sysadmin = this.route.snapshot.queryParams['sysadmin'];
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.getVisboProject();
    this.auditCount = 50;
    this.auditType = this.auditTypeList[0].name;
    this.today = new Date();
    this.today.setHours(0, 0, 0, 0);

    this.getVisboProjectAudits();
    this.sortTable(undefined);
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProject Detail of: ' + id);
    this.visboprojectService.getVisboProject(id, this.sysadmin, this.deleted)
      .subscribe(
        visboproject => {
          this.visboproject = visboproject;
          this.combinedPerm = visboproject.perm;
          this.log(`Get VisboProject ${id} ${this.visboproject.name} Perm ${JSON.stringify(this.combinedPerm)}`);
        },
        error => {
          this.log(`get VPs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

  getVisboProjectAudits(): void {
    const id = this.route.snapshot.paramMap.get('id');
    let queryAudit: QueryAuditType;
    queryAudit = new QueryAuditType;
    this.log(`Audit getVisboProjectAudits from ${this.auditFrom} to ${this.auditTo} Text ${this.auditText} AuditType ${this.auditType}`);
    // set date values if not set or adopt to end of day in case of to date
    if (this.auditTo) {
      queryAudit.to = new Date(this.auditTo);
    } else {
      queryAudit.to = new Date();
    }
    if (this.auditFrom) {
      queryAudit.from = new Date(this.auditFrom);
    } else {
      // queryAudit.from = new Date(queryAudit.to);
      // queryAudit.from.setDate(queryAudit.from.getDate()-7);
      // queryAudit.from.setHours(0, 0, 0, 0);
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
    queryAudit.maxcount = this.auditCount;

    this.log(`Audit getVisboProjectAudits VP ${id} recalc Query ${JSON.stringify(queryAudit)}`);
    this.visboauditService.getVisboProjectAudits(id, this.sysadmin, this.deleted, queryAudit)
      .subscribe(
        audit => {
          this.audit = audit;
          this.sortTable(undefined);
          this.log(`get Audit success ${this.audit.length} for ${this.visboproject.name}`);
        },
        error => {
          this.log(`get Audit failed: error: ${error.status} message: ${JSON.stringify(error)}`);
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
    this.log(`sysAudit CSV Len ${data.length} `);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    this.log(`Open URL ${url}`);
    let a: any;
    a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = 'auditlog-VP.csv';
    this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.location.back();
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
    let newAuditIndex: number;
    newAuditIndex = this.auditIndex + increment;
    if (newAuditIndex < 0) {
      newAuditIndex = 0;
    }
    if (newAuditIndex >= this.audit.length) {
      newAuditIndex = this.audit.length - 1;
    }
    this.auditIndex = newAuditIndex;
  }

  helperResponseText(visboaudit: VisboAudit): string {
    if (visboaudit.result.statusText) {
      return visboaudit.result.statusText;
    }
    const status = visboaudit.result.status;
    if (status === '200') { return 'Success'; }
    if (status === '304') { return 'Success'; }
    if (status === '400') { return 'Bad Request'; }
    if (status === '401') { return 'Not Authenticated'; }
    if (status === '403') { return 'Permission Denied'; }
    if (status === '404') { return 'URL not found'; }
    if (status === '409') { return 'Conflict'; }
    if (status === '423') { return 'Locked'; }
    if (status === '500') { return 'Server Error'; }
    return status.toString();
  }

  helperShortenText(text: string, len: number): string {
    if (!text || !len || len < 5 || text.length <= len) {
      return (text);
    }
    return text.substring(0, 20).concat('...', text.substring(text.length - 7, text.length));
  }

  toggleDetail() {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  isToday(checkDate: string): Boolean {
    // this.log(`Check Date ${checkDate} ${this.today.toISOString()}`);
    return (new Date(checkDate)) > this.today;
  }

  sortTable(n?: number) {
    if (!this.audit) {
      return;
    }
    this.log(`Sort Table Column ${n}`);
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
      this.audit.sort(function(a, b) {
        let result = 0;
        if (a.createdAt > b.createdAt) {
          result = 1;
        } else if (a.createdAt < b.createdAt) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 2) {
      this.audit.sort(function(a, b) {
        let result = 0;
        if (a.user.email.toLowerCase() > b.user.email.toLowerCase()) {
          result = 1;
        } else if (a.user.email.toLowerCase() < b.user.email.toLowerCase()) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 3) {
      this.audit.sort(function(a, b) {
        let result = 0;
        if (a.action > b.action) {
          result = 1;
        } else if (a.action < b.action) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 4) {
      this.audit.sort(function(a, b) {
        let result = 0;
        if (a.url > b.url) {
          result = 1;
        } else if (a.url < b.url) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 5) {
      // sort Result
      this.audit.sort(function(a, b) {
        let result = 0;
        if (a.result.status > b.result.status) {
          result = 1;
        } else if (a.result.status < b.result.status) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 6) {
      this.audit.sort(function(a, b) {
        return a.result.time - b.result.time;
      });
    } else if (this.sortColumn === 7) {
      this.audit.sort(function(a, b) {
        return (a.result.size || 0) - (b.result.size || 0);
      });
    }
    if (!this.sortAscending) {
      this.audit.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Audit: ' + message);
  }
}
