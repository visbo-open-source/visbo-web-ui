import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboUser } from '../_models/login';
import { SysUserService } from '../_services/sysuser.service';

import { visboCmpString, visboCmpDate, visboGetShortText } from '../_helpers/visbo.helper'

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
    if (this.userMatch) {
      this.userMatch = this.userMatch.trim();
    }
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

  helperUserIndex(userIndex: number): void {
    this.userIndex = userIndex;
  }

  pageUserIndex(increment: number): void {
    let newuserIndex = this.userIndex + increment;
    if (newuserIndex < 0) {
      newuserIndex = 0;
    }
    if (newuserIndex >= this.user.length) {
      newuserIndex = this.user.length - 1;
    }
    this.userIndex = newuserIndex;
  }

  helperShortenText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  toggleDetail() {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  sortTable(n) {
    if (!this.user) {
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
      this.sortColumn = 2;
      this.sortAscending = undefined;
    }
    if (this.sortAscending === undefined) {
      // sort name column ascending, number values desc first
      this.sortAscending = (n === 1) ? true : false;
    }
    if (this.sortColumn === 1) {
      this.user.sort(function(a, b) { return visboCmpString(a.email, b.email); });
    } else if (this.sortColumn === 2) {
      this.user.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.user.sort(function(a, b) {
        const aLastLoginAt = a.status && a.status.lastLoginAt ? new Date(a.status.lastLoginAt) : new Date('2001-01-01');
        const bLastLoginAt = b.status && b.status.lastLoginAt ? new Date(b.status.lastLoginAt) : new Date('2001-01-01');
        return visboCmpDate(aLastLoginAt, bLastLoginAt);
      });
    } else if (this.sortColumn === 4) {
      this.user.sort(function(a, b) {
        const aLastLoginFailedAt = a.status && a.status.lastLoginFailedAt ? new Date(a.status.lastLoginFailedAt) : new Date('2001-01-01');
        const bLastLoginFailedAt = b.status && b.status.lastLoginFailedAt ? new Date(b.status.lastLoginFailedAt) : new Date('2001-01-01');
        return visboCmpDate(aLastLoginFailedAt, bLastLoginFailedAt);
      });
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
