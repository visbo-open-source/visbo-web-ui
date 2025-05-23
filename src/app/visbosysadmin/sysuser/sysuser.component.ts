import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { VisboUser } from '../../_models/visbouser';
import { SysUserService } from '../../_services/sysuser.service';

import { getErrorMessage, visboCmpString, visboCmpDate, visboGetShortText } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-sysuser',
  templateUrl: './sysuser.component.html',
  styleUrls: ['./sysuser.component.css']
})
// 🔍 Overview
// The SysuserComponent is part of the VISBO system administration suite. It allows system administrators to:
// -  View and sort the list of registered users
// -  Filter users by email
// -  Navigate through users (pagination)
// -  View login metadata (e.g., last login, failed login attempts)
// -  Toggle detailed views for selected users
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

  // ngOnInit
  // -  Calls getSysUsers() to load the initial user list
  // -  Applies initial sort via sortTable(undefined)
  ngOnInit(): void {
    this.getSysUsers();
    this.sortTable(undefined);
  }

  // -  Calls SysUserService.getSysUsers() with the current userMatch filter (if any)
  // -  Stores result in user
  // -  Applies sorting
  // -  Displays errors if the request fails
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
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Sets the selected userIndex (e.g., for pagination or detail display).
  helperUserIndex(userIndex: number): void {
    this.userIndex = userIndex;
  }

  // Changes the current userIndex by a step (+1 or -1), with clamping to array bounds.
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

  // Utility to shorten long text (e.g., user metadata or descriptions).
  helperShortenText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  // Toggles showMore, a flag to control visibility of extended user details.
  toggleDetail(): void {
    this.log(`Toggle ShowMore`);
    this.showMore = !this.showMore;
  }

  // Sorts the user list based on the selected column index:
  sortTable(n: number): void {
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
    if (!this.sortAscending) {
      this.user.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys User: ' + message);
  }
}
