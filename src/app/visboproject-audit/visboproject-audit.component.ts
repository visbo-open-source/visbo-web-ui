import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboAudit, VisboAuditXLS, QueryAuditType } from '../_models/visboaudit';

import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProject } from '../_models/visboproject';
import { VisboAuditService } from '../_services/visboaudit.service';

import { VGPermission } from '../_models/visbogroup';
import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper';

import * as XLSX from 'xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

@Component({
  selector: 'app-visboproject-audit',
  templateUrl: './visboproject-audit.component.html',
  styleUrls: ['./visboproject-audit.component.css']
})
export class VisboprojectAuditComponent implements OnInit {

  visboproject: VisboProject;
  combinedPerm: VGPermission;

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
  auditTypeList = [
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
    private messageService: MessageService,
    private alertService: AlertService,
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  // Initialization (ngOnInit)
  //    - Fetches project details and audit logs.
  //    - Sets up default values like auditCount, auditType, and today.
  //    - Calls getVisboProjectAudits() to load audit logs.
  ngOnInit(): void {
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

  // Fetching Project Details (getVisboProject)
  //    - Retrieves the project based on the id from the route.
  //    - Stores project details in this.visboproject.
  //    - Captures permissions in this.combinedPerm.
  //    - Handles errors gracefully with alertService.error().
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
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Fetching Audit Logs (getVisboProjectAudits)
  //    - Constructs a QueryAuditType object based on filters.
  //    - Calls visboauditService.getVisboProjectAudits() to fetch audit logs.
  //    - Applies filters for:
  //            Date range (auditFrom - auditTo)
  //            Action type (GET, POST, PUT, DELETE)
  //            Search text (auditText)
  //    - Handles API errors with appropriate messages.
  getVisboProjectAudits(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const queryAudit = new QueryAuditType;
    this.log(`Audit getVisboProjectAudits from ${this.auditFrom} to ${this.auditTo} Text ${this.auditText} AuditType ${this.auditType}`);
    this.alertService.clear();
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
          const message = this.translate.instant('vpAudit.msg.auditSuccess');
          this.alertService.success(message, true);
          this.log(`get Audit success ${this.audit.length} for ${this.visboproject.name}`);
        },
        error => {
          this.log(`get Audit failed: error: ${error.status} message: ${JSON.stringify(error)}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Exporting Audit Logs (downloadVisboAudit)
  //    - Converts the audit log data into an Excel file.
  //    - Uses the XLSX library to create and format the spreadsheet.
  //    - Downloads the generated file automatically.
  downloadVisboAudit(): void {
    this.log(`vpAudit Download ${this.audit.length} Items`);
    const audit: VisboAuditXLS[] = []
    this.audit.forEach(element => {
      const auditElement = new VisboAuditXLS();
      auditElement.createdAt = new Date(element.createdAt);
      auditElement.email = element.user?.email;
      auditElement.vcName = element.vc?.name;
      auditElement.vcid = element.vc?.vcid;
      auditElement.vpName = element.vp?.name;
      auditElement.vpid = element.vp?.vpid;
      auditElement.vpvid = element.vpv?.vpvid;
      auditElement.action = element.action;
      auditElement.actionDescription = element.actionDescription;
      auditElement.actionInfo = element.actionInfo;
      auditElement.url = element.url;
      auditElement.action = element.action;
      auditElement.ip = element.ip;
      auditElement.host = element.host;
      if (this.sysadmin) {
        if (element.ttl) { auditElement.ttl = new Date(element.ttl); }
        auditElement.sysAdmin = element.sysAdmin;
      }
      auditElement.userAgent = element.userAgent;
      auditElement.resultTime = element.result?.time;
      auditElement.resultStatus = element.result?.status;
      auditElement.resultStatusText = element.result?.statusText;
      auditElement.resultSize = element.result?.size;
      audit.push(auditElement);
    });

    // export to Excel
    const len = audit.length;
    const width = Object.keys(audit[0]).length;
    const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
    const timestamp = new Date();
    const month = (timestamp.getMonth() + 1).toString();
    const day = timestamp.getDate().toString();
    const strTimestamp = '' + timestamp.getFullYear() + '-' +  month.padStart(2, "0") + '-' +  day.padStart(2, "0");
    const name = 'VisboProjectAudit_' + strTimestamp;

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(audit, {header:['createdAt', 'email', 'vcName', 'vpName', 'actionDescription', 'actionInfo', 'resultTime', 'resultSize', 'resultStatus', 'resultStatusText' ]});
    worksheet['!autofilter'] = { ref: matrix };
    // eslint-disable-next-line
    const sheets: any = {};
    sheets[name] = worksheet;
    const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [name] };
    // eslint-disable-next-line
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = name.concat(EXCEL_EXTENSION);
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

  // Converts bytes to human-readable sizes.
  helperFormatBytes(a: number, b = 2): string {
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

  // Maps status codes to readable messages
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

  // Shortens text for UI display
  helperShortenText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  // Toggles detailed audit log display.
  toggleDetail(): void {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  isToday(checkDate: string): boolean {
    // this.log(`Check Date ${checkDate} ${this.today.toISOString()}`);
    return (new Date(checkDate)) > this.today;
  }

  // Sorting Audit Logs (sortTable)
  //    -Sorts logs based on user interaction.
  //    - Supports sorting by:
  //          - Date (createdAt)
  //          - User email (user.email)
  //          - Action type (actionDescription)
  //          - URL (url)
  //          - Status (result.status)
  //          - Response time (result.time)
  //          - Response size (result.size)
  //    - Uses sortAscending to toggle between ascending and descending orders.
  sortTable(n?: number): void {
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
      this.audit.sort(function(a, b) { return visboCmpDate(a.createdAt, b.createdAt); });
    } else if (this.sortColumn === 2) {
      this.audit.sort(function(a, b) { return visboCmpString(a.user.email.toLowerCase(), b.user.email.toLowerCase()); });
    } else if (this.sortColumn === 3) {
      this.audit.sort(function(a, b) { return visboCmpString(a.actionDescription, b.actionDescription); });
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
    this.messageService.add('Audit: ' + message);
  }
}
