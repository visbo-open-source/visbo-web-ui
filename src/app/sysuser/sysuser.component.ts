import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboUser } from '../_models/login';
import { SysUserService } from '../_services/sysuser.service';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-sysuser',
  templateUrl: './sysuser.component.html',
  styleUrls: ['./sysuser.component.css']
})
export class SysuserComponent implements OnInit {

  user: VisboUser[];
  userIndex: number;
  userMatch: string;
  showMore: boolean;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private sysuserService: SysUserService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.getSysUsers();
    this.sortTable(undefined);
  }

  getSysUsers(): void {
    if (this.userMatch) this.userMatch = this.userMatch.trim();
    this.log(`Get with filter ${this.userMatch}`);
    this.sysuserService.getSysUsers(this.userMatch)
      .subscribe(
        user => {
          this.user = user;
          this.sortTable(undefined);
          this.log('get success');
        },
        error => {
          this.log(`get failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

  helperUserIndex(userIndex: number):void {
    this.userIndex = userIndex
  }

  pageUserIndex(increment: number): void {
    var newuserIndex: number;
    newuserIndex = this.userIndex + increment;
    if (newuserIndex < 0) newuserIndex = 0
    if (newuserIndex >= this.user.length) newuserIndex = this.user.length-1
    this.userIndex = newuserIndex
  }

  helperShortenText(text: string, len: number): string {
    if (!text || !len || len < 5 || text.length <= len) {
      return (text);
    }
    return text.substring(0,20).concat('...', text.substring(text.length-7, text.length));
  }

  toggleDetail() {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  sortTable(n) {
    if (!this.user) return
    this.log(`Sort Table Column ${n}`)
    // change sort order otherwise sort same column same direction
    if (n != undefined) {
      // sort a different column
      if (n != this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      } else if (this.sortAscending != undefined)
        this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = 2
      this.sortAscending = undefined;
    }
    if (this.sortAscending == undefined) {
      // sort name column ascending, number values desc first
      this.sortAscending = (n == 1) ? true : false;
      // console.log("Sort VC Column undefined", this.sortColumn, this.sortAscending)
    }
    // console.log("Sort VC Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn == 1) {
      this.user.sort(function(a, b) {
        var result = 0
        if (a.email.toLowerCase() > b.email.toLowerCase())
          result = 1;
        else if (a.email.toLowerCase() < b.email.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      this.user.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      this.user.sort(function(a, b) {
        var result = 0
        var aLastLoginAt: Date, bLastLoginAt: Date;
        aLastLoginAt = a.status && a.status.lastLoginAt ? new Date(a.status.lastLoginAt) : undefined
        if (!aLastLoginAt) aLastLoginAt = new Date('2001-01-01');
        bLastLoginAt = b.status && b.status.lastLoginAt ? new Date(b.status.lastLoginAt) : undefined
        if (!bLastLoginAt) bLastLoginAt = new Date('2001-01-01');

        return aLastLoginAt.getTime() - bLastLoginAt.getTime()
      })
    } else if (this.sortColumn == 4) {
      this.user.sort(function(a, b) {
        var result = 0
        var alastLoginFailedAt: Date, blastLoginFailedAt: Date;
        alastLoginFailedAt = a.status && a.status.lastLoginFailedAt ? new Date(a.status.lastLoginFailedAt) : undefined
        if (!alastLoginFailedAt) alastLoginFailedAt = new Date('2001-01-01');
        blastLoginFailedAt = b.status && b.status.lastLoginFailedAt ? new Date(b.status.lastLoginFailedAt) : undefined
        if (!blastLoginFailedAt) blastLoginFailedAt = new Date('2001-01-01');

        return alastLoginFailedAt.getTime() - blastLoginFailedAt.getTime()
      })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.user.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys User: ' + message);
  }
}
