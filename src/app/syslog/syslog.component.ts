import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { SysLogService } from '../_services/syslog.service';
import { AuthenticationService } from '../_services/authentication.service';
import { LoginComponent } from '../login/login.component';
import { VisboFile, VisboFilesResponse, VisboDownloadResponse } from '../_models/visbofiles';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VisboSetting, VisboSettingResponse } from '../_models/visbosetting';

@Component({
  selector: 'app-syslog',
  templateUrl: './syslog.component.html'
})
export class SysLogComponent implements OnInit {

  files: VisboFile[];
  fileIndex: number;
  ageDays: number
  logDataShow: boolean;
  logData: string;
  logLevelSetting: VisboSetting;
  systemVC: number;

  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private syslogService: SysLogService,
    private messageService: MessageService,
    private alertService: AlertService,
    private router: Router
  ) { }

  ngOnInit() {
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
          this.alertService.error(error.error.message);
        }
      );
  }

  helperFileIndex(fileIndex: number):void {
    this.fileIndex = fileIndex
  }

  switchView():void {
    this.logDataShow = !this.logDataShow;
  }

  getVisboLogFile(file: VisboFile): void {
    this.log(`syslog getVisboLogFile`);
    this.syslogService.getSysLog(file.folder, file.name)
      .subscribe(
        data => {
          this.log(`get Log Content success Start:${data.substring(0,30)}`);
          this.downloadFile(data, file.name)
        },
        error => {
          this.log(`get Log Content failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

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
          this.alertService.error(error.error.message);
        }
      );
  }

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
          this.alertService.error(error.error.message);
        }
      );
  }

  downloadFile(data: string, fileName: string):void {
    this.log(`download File succeeded Len: ${data.length}`);
    var blob = new Blob([data], { type: 'text/plain' });
    var url= window.URL.createObjectURL(blob);
    this.log(`Open URL ${url}`);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName + '.log';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  formatBytes(size,precision) {
    if(0==size) return"0 Bytes";
    var c=1024, d=precision||2, units=["Bytes","KB","MB","GB"]
    var f=Math.floor(Math.log(size)/Math.log(c));
    return parseFloat((size/Math.pow(c,f)).toFixed(d))+" "+units[f]
  }

  sortTable(n) {
    if (!this.files) return
    this.log(`Sort Table Column ${n}`)
    // change sort order otherwise sort same column same direction
    if (n != undefined || this.sortColumn == undefined) {
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending == undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n == 1 ) ? true : false;
        // console.log("Sort VC Column undefined", this.sortColumn, this.sortAscending)
      }
      else this.sortAscending = !this.sortAscending;
    }
    // console.log("Sort VC Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn == 1) {
      this.files.sort(function(a, b) {
        var result = 0
        if (a.name > b.name)
          result = 1;
        else if (a.name < b.name)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      this.files.sort(function(a, b) {
        var result = 0
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      this.files.sort(function(a, b) {
        return a.size - b.size
      })
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
