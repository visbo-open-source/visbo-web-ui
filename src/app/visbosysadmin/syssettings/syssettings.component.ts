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
export class SyssettingsComponent implements OnInit {

      systemVC: string;
      combinedPerm: VGPermission = undefined;
      permSystem = VGPSYSTEM;
      vcsetting: VisboSetting[];
      editIndex: number;
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
      this.getVisboSettings();
      this.combinedPerm = this.visbocenterService.getSysAdminRole();
    }

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

    getMainInfo(entry: VisboSetting): string {
      // this.log('get Main Value ' + entry.name);
      let result = '';
      if (entry.value) {
          result = entry.value.systemEnabled;
      }
      if (result == undefined) { result = '';}
      return result;
    }

    helperConfigName(config: string): number {
      for (let i = 0; i < this.vcsetting.length; i++) {
        if (this.vcsetting[i].name === config) {
          return i;
        }
      }
      return undefined;
    }

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

    hasSystemPerm(perm: number): boolean {
      return (this.combinedPerm.system & perm) > 0;
    }

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
