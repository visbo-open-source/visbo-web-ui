import { Component, OnInit } from '@angular/core';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { SysLogsService } from '../_services/syslogs.service';
import { AuthenticationService } from '../_services/authentication.service';
import { LoginComponent } from '../login/login.component';
import { VisboFile, VisboFilesResponse, VisboDownloadResponse } from '../_models/visbofiles';

@Component({
  selector: 'app-syslogs',
  templateUrl: './syslogs.component.html'
})
export class SysLogsComponent implements OnInit {

  files: VisboFile[];

  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private syslogsService: SysLogsService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboLogs();
    this.sortTable(1);
  }

  // onSelect(visboaudit: VisboAudit): void {
  //   this.getVisboAudits();
  // }

  getVisboLogs(): void {
    this.log(`SysLogs getVisboLogs`);
    this.syslogsService.getSysLogs()
      .subscribe(
        files => {
          this.files = files
          this.log('get Logs success');
        },
        error => {
          this.log(`get Logs failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  getVisboLogFile(file: VisboFile): void {
    this.log(`SysLogs getVisboLogFile`);
    this.syslogsService.getSysLog(file.name)
      .subscribe(
        data => {
          this.downloadFile(data)
          this.log('get Log Content success');
        },
        error => {
          this.log(`get Log Content failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  downloadFile(data: any):void {
    this.log(`download File succeeded`);
    var blob = new Blob([data], { type: 'text/csv' });
    var url= window.URL.createObjectURL(blob);
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
        this.sortAscending = (n == 2 || n == 3 || n == 4) ? true : false;
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
