import { Component, OnInit } from '@angular/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { VisboCenterService } from '../../_services/visbocenter.service';
import { VisboSettingService } from '../../_services/visbosetting.service';

import { VisboSetting } from '../../_models/visbosetting';

import { VGPermission, VGPSYSTEM } from '../../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-sysconfig',
  templateUrl: './sysconfig.component.html',
  styleUrls: ['./sysconfig.component.css']
})

// 🔍 Overview
// The SysconfigComponent is an Angular component for managing system-wide configuration
// settings in VISBO. It enables system administrators to:
// -  Retrieve, display, and sort system configuration entries (VisboSetting)
// -  Edit and update specific configurations like UI URLs, SMTP, Redis, etc.
// -  Enforce permission checks before allowing modifications
export class SysconfigComponent implements OnInit {

    systemVC: string;                       // ID of the system-wide Visbo Center
    combinedPerm: VGPermission = undefined; // Combined system permission object for the user
    permSystem = VGPSYSTEM;                 // Constant containing permission flags
    vcsetting: VisboSetting[];              // Array of configuration entries retrieved from the backend
    editIndex: number;                      // Index of the currently edited configuration entry
    sortAscending: boolean;                 // Sort order flag
    sortColumn: number;                     // Active column used for sorting   

  constructor(
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  // ngOnInit
  // -  Retrieves the system-wide Visbo Center ID (systemVC)
  // -  Loads configuration data by calling getVisboConfig()
  // -  Loads system-level permissions from VisboCenterService
  ngOnInit(): void {
    this.systemVC = this.visbocenterService.getSysVCId();
    this.getVisboConfig();
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    // this.log(`getVisboConfig Perm ${JSON.stringify(this.combinedPerm)}`);
  }

  // Fetches system configuration settings of type SysConfig for the current system VC.
  // -  On success, stores settings in vcsetting and triggers sorting
  // -  On failure, logs and displays error messages
  getVisboConfig(): void {
    this.log(`get VisboConfig Values`);
    this.visbosettingService.getVCSettingByType(this.systemVC, 'SysConfig', true)
      .subscribe(
        vcsetting => {
          this.vcsetting = vcsetting;
          this.sortTable(1);
          this.log('get Settings success ' + vcsetting.length);
        },
        error => {
          this.log(`get Settings failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getMainInfo(entry: VisboSetting): string {
    // this.log('get Main Value ' + entry.name);
    let result = '';
    if (entry.value) {
      switch (entry.name) {
        case 'UI URL':
          result = entry.value.UIUrl;
          break;
        case 'SMTP':
          result = entry.value.auth && entry.value.auth.user;
          break;
        case 'PW Policy':
          result = (entry.value.Description || '').substring(0, 60).concat('...');
          break;
        case 'DEBUG':
          result = JSON.stringify(entry.value).substring(0, 60).concat('...');
          break;
        case 'Log Age':
          result = entry.value.duration;
          break;
        case 'Predict':
          result = entry.value.BAC;
          break;
        case 'REDIS':
          result = entry.value.host;
          break;
      }
    }
    if (result == undefined) { result = '';}
    return result;
  }

  // Returns the index of a config setting by name, for easier access and replacement.
  helperConfigName(config: string): number {
    for (let i = 0; i < this.vcsetting.length; i++) {
      if (this.vcsetting[i].name === config) {
        return i;
      }
    }
    return undefined;
  }

  // Finds and sets the index of the config item being edited based on its name.
  editConfigName(config: string): number {
    this.log(`Edit Config  ${config}`);
    for (let i = 0; i < this.vcsetting.length; i++) {
      if (this.vcsetting[i].name === config) {
        this.editIndex = i;
        return i;
      }
    }
    return undefined;
  }

  // Saves the updated config setting using the backend service and displays a success or error alert.
  updateConfig(setting: VisboSetting): void {
    // if (!setting) return;
    this.log(`Update Config  ${JSON.stringify(setting)}`);
    this.visbosettingService.updateVCSetting(this.systemVC, setting, true)
      .subscribe(
        data => {
          this.log(`set System Config success ${JSON.stringify(data)}`);
          this.alertService.success('Successfully changed System Configuration', true);
          this.vcsetting[this.helperConfigName(setting.name)] = data;
        },
        error => {
          this.log(`set System Config failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // Checks whether the current user has the specified system-level permission using a bitmask check
  hasSystemPerm(perm: number): boolean {
    return (this.combinedPerm.system & perm) > 0;
  }

  // Sorts the configuration list by a selected column:
  // -  Column 1: Sort by setting name
  // -  Column 3: Sort by last update date
  // Toggles sort direction unless the column changes.
  sortTable(n?:number): void {
    if (!this.vcsetting) { return; }
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
      this.vcsetting.sort(function(a, b) { return visboCmpString(a.name, b.name); });
    } else if (this.sortColumn === 3) {
      this.vcsetting.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    }

    if (!this.sortAscending) {
      this.vcsetting.reverse();
    }
  }


  /** Log message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys Config: ' + message);
  }
}
