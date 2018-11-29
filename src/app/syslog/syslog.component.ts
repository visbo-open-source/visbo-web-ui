import { Component, OnInit } from '@angular/core';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { SysLogService } from '../_services/syslog.service';
import { AuthenticationService } from '../_services/authentication.service';
import { LoginComponent } from '../login/login.component';
import { VisboFile, VisboFilesResponse, VisboDownloadResponse } from '../_models/visbofiles';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboLogLevel, VisboLogLevelResponse } from '../_models/syslog';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-syslog',
  templateUrl: './syslog.component.html'
})
export class SysLogComponent implements OnInit {

  files: VisboFile[];
  fileIndex: number;
  logDataShow: boolean;
  logData: string;
  combinedPerm: VGPermission = undefined;
  logLevelConfig: VisboLogLevel;


  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private syslogService: SysLogService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.combinedPerm = this.visbocenterService.getSysAdminRole()
    this.getVisboLogs();
    this.sortTable(1);
  }

  // onSelect(visboaudit: VisboAudit): void {
  //   this.getVisboAudits();
  // }

  getVisboLogs(): void {
    this.log(`syslog getVisboLogs`);
    this.syslogService.getSysLogs()
      .subscribe(
        files => {
          this.files = files;
          this.sortTable(2);
          this.log('get Logs success');
        },
        error => {
          this.log(`get Logs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
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
    this.syslogService.getSysLog(file.name)
      .subscribe(
        data => {
          this.log(`get Log Content success Start:${data.substring(0,30)}`);
          this.downloadFile(data)
        },
        error => {
          this.log(`get Log Content failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  getLogLevel(): void {
    this.log(`syslog getLogLevel`);
    this.syslogService.getSysLogLevel()
      .subscribe(
        data => {
          this.log(`get Log Level success ${JSON.stringify(data)}`);
          this.logLevelConfig = data;
        },
        error => {
          this.log(`get Log Level failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  setLogLevel(newLogLevel: VisboLogLevel): void {
    this.log(`syslog setLogLevel`);
    this.syslogService.setSysLogLevel(newLogLevel)
      .subscribe(
        data => {
          this.log(`set Log Level success ${JSON.stringify(data)}`);
          this.logLevelConfig = data;
        },
        error => {
          this.log(`set Log Level failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  downloadFile(data: string):void {
    this.log(`download File succeeded Len: ${data.length}`);
    var blob = new Blob([data], { type: 'text/plain' });
    var url= window.URL.createObjectURL(blob);
    this.log(`Open URL ${url}`);
    window.open(url);
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
