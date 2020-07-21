import { Component, OnInit } from '@angular/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VisboSetting } from '../_models/visbosetting';

import { getErrorMessage, visboCmpString } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-systasks',
  templateUrl: './systasks.component.html',
  styleUrls: ['./systasks.component.css']
})
export class SystasksComponent implements OnInit {

  systemVC: string;
  vcsetting: VisboSetting[];
  taskIndex: number;
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.systemVC = this.visbocenterService.getSysVCId();
    this.getVisboTasks();
  }

  getVisboTasks(): void {
    this.log(`getVisboTasks`);
    this.visbosettingService.getVCSettingByType(this.systemVC, 'Task', true)
      .subscribe(
        vcsetting => {
          this.vcsetting = vcsetting;
          this.sortTable(undefined);
          this.log('get Settings success ' + vcsetting.length);
          this.alertService.clear();
        },
        error => {
          this.log(`get Settings failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  helperTaskIndex(taskIndex: number): void {
    this.taskIndex = taskIndex;
  }

  pageTaskIndex(increment: number): void {
    let newtaskIndex: number;
    newtaskIndex = this.taskIndex + increment;
    if (newtaskIndex < 0) {
      newtaskIndex = 0;
    }
    if (newtaskIndex >= this.vcsetting.length) {
      newtaskIndex = this.vcsetting.length - 1;
    }
    this.taskIndex = newtaskIndex;
  }

  executeTask(): void {
    this.log(`execute Task Immediately: ${this.vcsetting[this.taskIndex].name} `);
    this.vcsetting[this.taskIndex].value.nextRun = new Date();
    this.visbosettingService.updateVCSetting(this.systemVC, this.vcsetting[this.taskIndex], true)
      .subscribe(
        data => {
          this.log(`execute Task success ${JSON.stringify(data)}`);
          this.alertService.success('Successfully set Task to execute', false);
          this.vcsetting[this.taskIndex] = data;
        },
        error => {
          this.log(`execute Task failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  sortTable(n: number): void {
    if (!this.vcsetting) { return; }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortColumn === undefined) {
      if (this.sortColumn === undefined) {
        this.sortColumn = 1;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = ( n === 0 ) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      this.vcsetting.sort(function(a, b) { return visboCmpString(a.name, b.name); });
    } else if (this.sortColumn === 2) {
      this.vcsetting.sort(function(a, b) {
        let result = 0;
        if (a.value.lastRun > b.value.lastRun) {
          result = 1;
        } else if (a.value.lastRun < b.value.lastRun) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 3) {
      this.vcsetting.sort(function(a, b) {
        let result = 0;
        if (a.value.nextRun > b.value.nextRun) {
          result = 1;
        } else if (a.value.nextRun < b.value.nextRun) {
          result = -1;
        }
        return result;
      });
    } else if (this.sortColumn === 4) {
      this.vcsetting.sort(function(a, b) {
        let val1 = 0, val2 = 0;
        if (a.value.taskSpecific && a.value.taskSpecific.result ) {
          val1 = a.value.taskSpecific.result;
        }
        if (b.value.taskSpecific && b.value.taskSpecific.result ) {
          val2 = b.value.taskSpecific.result;
        }
        return val1 - val2;
      });
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
