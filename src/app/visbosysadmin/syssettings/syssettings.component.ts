import { Component, OnInit } from '@angular/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { VisboCenterService } from '../../_services/visbocenter.service';
import { VisboSettingService } from '../../_services/visbosetting.service';

import { VisboSetting } from '../../_models/visbosetting';

import { VGPermission, VGPSYSTEM } from '../../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';

@Component({
  selector: 'app-syssettings',
  templateUrl: './syssettings.component.html',
  styleUrls: ['./syssettings.component.css']
})

// 🔍 Overview
// The SyssettingsComponent is an Angular system administration module within VISBO 
// that allows authorized users to view, sort, edit, and update VC configuration settings of 
// type _VCConfig.
// It is part of the system-level configuration UI, distinct from project-specific settings.

// 🧱 Responsibilities
// -  Load configuration entries of type _VCConfig from the system-wide Visbo Center
// -  Allow editing and updating of settings via the UI
// -  Sort settings by different attributes like name, flags, or update timestamp
// -  Enforce permission-based access to editing functionality
export class SyssettingsComponent implements OnInit {

      systemVC: string;                       // ID of the global/system-level Visbo Center
      combinedPerm: VGPermission = undefined; // Combined permissions object for current user
      permSystem = VGPSYSTEM;                 // System permission constants
      vcsetting: VisboSetting[];              // Array of VC config entries loaded from backend
      editIndex: number;                      // Index of the currently edited setting
      sortAscending: boolean;                 // Current sorting direction
      sortColumn: number;

    constructor(
      private visbocenterService: VisboCenterService,
      private visbosettingService: VisboSettingService,
      private messageService: MessageService,
      private alertService: AlertService
    ) { }

    // ngOnInit
    // -  Gets the system VC ID (systemVC)
    // -  Loads all _VCConfig settings by calling getVisboSettings()
    // -  Loads current user's combined permissions via getSysAdminRole()
    ngOnInit(): void {
      this.systemVC = this.visbocenterService.getSysVCId();
      this.getVisboSettings();
      this.combinedPerm = this.visbocenterService.getSysAdminRole();
    }

    // -  Loads all settings of type _VCConfig using VisboSettingService
    // -  Triggers sorting of results
    // -  Displays error on failure
    getVisboSettings(): void {
      this.log(`get getVisboSettings Values`);
      this.visbosettingService.getVCSettingByType(this.systemVC, '_VCConfig', true)
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

    // Extracts the systemEnabled flag from a setting to display as a simplified summary
    getMainInfo(entry: VisboSetting): string {
      // this.log('get Main Value ' + entry.name);
      let result = '';
      if (entry.value) {
          result = entry.value.systemEnabled;
      }
      if (result == undefined) { result = '';}
      return result;
    }

    // Finds the index of a setting by its name — used for updating the local array after saving
    helperConfigName(config: string): number {
      for (let i = 0; i < this.vcsetting.length; i++) {
        if (this.vcsetting[i].name === config) {
          return i;
        }
      }
      return undefined;
    }

    // Prepares a setting for editing by setting editIndex to its index
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

    // -  Saves an updated config object via VisboSettingService
    // -  Updates the local array with the returned data
    // -  Displays a success message or handles errors appropriately
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
    // Returns true if the current user has the specified permission using a bitmask check
    hasSystemPerm(perm: number): boolean {
      return (this.combinedPerm.system & perm) > 0;
    }
    // Sorts vcsetting by one of the following columns:
    //  1	- Setting name
    //  2	- systemEnabled flag
    //  3	- systemLimit flag
    //  4	- Fallback sort between systemLimit and sysVCEnabled
    //  5	- Fallback sort between systemLimit and sysVCLimit
    //  10	- Last updated date (updatedAt)
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
      } else if (this.sortColumn === 2) {
        this.vcsetting.sort(function(a, b) { return (a.value.systemEnabled ? 1 : 0) - (b.value.systemEnabled ? 1 : 0); });
      } else if (this.sortColumn === 3) {
        this.vcsetting.sort(function(a, b) { return (a.value.systemLimit ? 1 : 0) - (b.value.systemLimit ? 1 : 0); });
      } else if (this.sortColumn === 4) {
        this.vcsetting.sort(function(a, b) { return (a.value.systemLimit ? 1 : (a.value.sysVCEnabled ? 1 : 0)) - (b.value.systemLimit ? 1 : (b.value.sysVCEnabled ? 1 : 0)); });
      } else if (this.sortColumn === 5) {
        this.vcsetting.sort(function(a, b) { return (a.value.systemLimit ? 1 : (a.value.sysVCLimit ? 1 : 0)) - (b.value.systemLimit ? 1 : (b.value.sysVCLimit ? 1 : 0)); });
      } else if (this.sortColumn === 10) {
        this.vcsetting.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
      }

      if (!this.sortAscending) {
        this.vcsetting.reverse();
      }
    }


    /** Log message with the MessageService */
    private log(message: string) {
      this.messageService.add('Sys Setting: ' + message);
    }
  }
