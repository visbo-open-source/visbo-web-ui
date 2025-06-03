import { Component, OnInit } from '@angular/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { SysLogService } from '../../_services/syslog.service';
import { VisboFile } from '../../_models/visbofiles';
import { VisboCenterService } from '../../_services/visbocenter.service';
import { VisboSettingService } from '../../_services/visbosetting.service';

import { VisboSetting } from '../../_models/visbosetting';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-syslog',
  templateUrl: './syslog.component.html'
})

// 🔍 Overview
// The SysLogComponent is an Angular component that provides a user interface for browsing, 
// downloading, and managing system log files in the VISBO platform. 
// It supports:
// -  Listing system log files for the last n days
// -  Viewing log metadata (name, size, date)
// -  Downloading individual logs as .log files
// -  Viewing and modifying the current log level setting (DEBUG, etc.)
// -  Sorting logs by name, date, or size
export class SysLogComponent implements OnInit {

  files: VisboFile[];                 // List of available log files
  fileIndex: number;                  // Currently selected file index
  ageDays: number;                    // Number of days to look back for logs
  logDataShow: boolean;               // Whether to show inline log content
  logData: string;                    // Content of selected log file
  logLevelSetting: VisboSetting;      // Current system log level setting (DEBUG etc.)
  systemVC: string;                   // ID of the system-wide Visbo Center

  sortAscending: boolean;              // Current sort direction
  sortColumn: number;                  // Current column used for sorting

  constructor(
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private syslogService: SysLogService,
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  // ngOnInit
  // -  Sets system VC ID and default age filter (3 days)
  // -  Retrieves log files via getVisboLogs()
  // -  Applies initial sorting on column 1 (name)
  ngOnInit(): void {
    this.systemVC = this.visbocenterService.getSysVCId();
    this.ageDays = 3;
    this.sortColumn = 2;

    this.getVisboLogs();
    this.sortTable(1);
    this.log(`syslog init VC ID ${this.systemVC}`);
  }

  // onSelect(visboaudit: VisboAudit): void {
  //   this.getVisboAudits();
  // }

  // Retrieves log file metadata from the backend:
  // -  Uses ageDays to filter logs by recency
  // -  Sorts the list after fetching
  // -  Displays success or error messages
  getVisboLogs(): void {
    this.log(`syslog getVisboLogs`);
    this.sortAscending = !this.sortAscending;
    this.syslogService.getSysLogs(this.ageDays)
      .subscribe(
        files => {
          this.files = files;
          this.sortTable(this.sortColumn);
          this.log('get Logs success');
        },
        error => {
          this.log(`get Logs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Sets the index of the selected log file (used by the UI).
  helperFileIndex(fileIndex: number): void {
    this.fileIndex = fileIndex;
  }

  // Toggles between displaying and hiding inline log content.
  switchView(): void {
    this.logDataShow = !this.logDataShow;
  }

  // Fetches the content of a selected log file and triggers a file download.
  getVisboLogFile(file: VisboFile): void {
    this.log(`syslog getVisboLogFile`);
    this.syslogService.getSysLog(file.folder, file.name)
      .subscribe(
        data => {
          this.log(`get Log Content success Start: ${data.substring(0, 30)}`);
          this.downloadFile(data, file.name);
        },
        error => {
          this.log(`get Log Content failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Retrieves the current system DEBUG setting from the backend.
  getLogLevel(): void {
    this.log(`syslog getLogLevel`);
    this.visbosettingService.getVCSettingByName(this.systemVC, 'DEBUG', true)
      .subscribe(
        vcsetting => {
          this.logLevelSetting = vcsetting[0];
          this.log(`get Log Level success ${JSON.stringify(this.logLevelSetting)}`);
        },
        error => {
          this.log(`get Log Level failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Updates the log level (DEBUG configuration) for the system VC.
  setLogLevel(): void {
    this.log(`syslog setLogLevel`);
    this.visbosettingService.updateVCSetting(this.systemVC, this.logLevelSetting, true)
      .subscribe(
        data => {
          this.log(`set Log Level success ${JSON.stringify(data)}`);
          this.alertService.success('Successfully changed Log Level', true);
          this.logLevelSetting = data;
        },
        error => {
          this.log(`set Log Level failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Creates a downloadable file in .log format from raw log string data using browser APIs.
  downloadFile(data: string, fileName: string): void {
    this.log(`download File succeeded Len: ${data.length}`);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    this.log(`Open URL ${url}`);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName + '.log';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Converts a byte value into a human-readable format:
  // Example: 1024 → "1.00 KB"
  formatBytes(size: number, precision = 2): string {
    if (0 === size) {
      return '0 Bytes';
    }
    const c = 1024, d = precision || 2, units = ['Bytes', 'KB', 'MB', 'GB'];
    const f = Math.floor(Math.log(size) / Math.log(c));
    return parseFloat((size / Math.pow(c, f)).toFixed(d)) + ' ' + units[f];
  }

  // Sorts the log file list based on column:
  // -  1: Filename
  // -  2: Last updated date
  // -  3: File size
  // Toggles sorting direction on repeated clicks.
  sortTable(n: number): void {
    if (!this.files) { return; }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortColumn === undefined) {
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n === 1 ) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      this.files.sort(function(a, b) { return visboCmpString(a.name, b.name); });
    } else if (this.sortColumn === 2) {
      this.files.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.files.sort(function(a, b) { return a.size - b.size; });
    }

    if (!this.sortAscending) {
      this.files.reverse();
    }
  }

  /** Log message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys Logs: ' + message);
  }
}
