import { Component, OnInit } from '@angular/core';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { VisboAudit } from '../_models/visboaudit';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboAuditService } from '../_services/visboaudit.service';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-sysaudit',
  templateUrl: './sysaudit.component.html'
})
export class SysAuditComponent implements OnInit {

  audit: VisboAudit[];
  auditIndex: number;
  showMore: boolean;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visboauditService: VisboAuditService,
    private visbocenterService: VisboCenterService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboAudits();
  }

  onSelect(visboaudit: VisboAudit): void {
    this.getVisboAudits();
  }

  getVisboAudits(): void {
    this.log(`Audit getVisboAudits`);
    this.visboauditService.getVisboAudits(true)
      .subscribe(
        audit => {
          this.audit = audit;
          this.sortTable(1);
          this.log('get Audit success');
        },
        error => {
          this.log(`get Audit failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  gotoDetail(visboaudit: VisboAudit):void {
    this.log(`navigate to Audit Detail ${visboaudit._id}`);
    this.router.navigate(['sysaudit/'+visboaudit._id]);
  }

  helperAuditIndex(auditIndex: number):void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.auditIndex = auditIndex
  }

  toggleDetail() {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  sortTable(n) {
    if (!this.audit) return
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
      this.audit.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.createdAt > b.createdAt)
          result = 1;
        else if (a.createdAt < b.createdAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      this.audit.sort(function(a, b) {
        var result = 0
        if (a.user.email.toLowerCase() > b.user.email.toLowerCase())
          result = 1;
        else if (a.user.email.toLowerCase() < b.user.email.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      this.audit.sort(function(a, b) {
        var result = 0
        if (a.action > b.action)
          result = 1;
        else if (a.action < b.action)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      this.audit.sort(function(a, b) {
        var result = 0
        if (a.url > b.url)
          result = 1;
        else if (a.url < b.url)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort Result
      this.audit.sort(function(a, b) { return a.result.status.valueOf() - b.result.status.valueOf() })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.audit.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys Audit: ' + message);
  }
}
