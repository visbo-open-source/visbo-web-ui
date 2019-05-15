import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';
import { LoginComponent } from '../login/login.component';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VisboSetting, VisboSettingResponse } from '../_models/visbosetting';

@Component({
  selector: 'app-systasks',
  templateUrl: './systasks.component.html',
  styleUrls: ['./systasks.component.css']
})
export class SystasksComponent implements OnInit {

  systemVC: number;
  vcsetting: VisboSetting[];
  taskIndex: number;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private router: Router
  ) { }

  ngOnInit() {
    this.systemVC = this.visbocenterService.getSysVCId()
    this.getVisboTasks();
  }

  getVisboTasks(): void {
    this.log(`getVisboTasks`);
    this.visbosettingService.getVCSettingByType(this.systemVC, 'Task', true)
      .subscribe(
        vcsetting => {
          this.vcsetting = vcsetting;
          this.sortTable(1);
          this.log('get Settings success ' + vcsetting.length);
        },
        error => {
          this.log(`get Settings failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(error.error.message);
          // redirect to login and come back to current URL
          if (error.status == 401) {
            this.alertService.error("Session expired, please log in again", true);
            this.router.navigate(['login'], { queryParams: { returnUrl: this.router.url }});
          }
        }
      );
  }

  helperTaskIndex(taskIndex: number):void {
    this.taskIndex = taskIndex
  }

  pageTaskIndex(increment: number): void {
    var newtaskIndex: number;
    newtaskIndex = this.taskIndex + increment;
    if (newtaskIndex < 0) newtaskIndex = 0
    if (newtaskIndex >= this.vcsetting.length) newtaskIndex = this.vcsetting.length-1
    this.taskIndex = newtaskIndex
  }

  sortTable(n) {
    if (!this.vcsetting) return
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
      this.vcsetting.sort(function(a, b) {
        var result = 0
        if (a.name > b.name)
          result = 1;
        else if (a.name < b.name)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      this.vcsetting.sort(function(a, b) {
        var result = 0
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      this.vcsetting.sort(function(a, b) {
        return a.size - b.size
      })
    }

    if (!this.sortAscending) {
      this.vcsetting.reverse();
    }
  }


  /** Log message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys Tasks: ' + message);
  }

}
