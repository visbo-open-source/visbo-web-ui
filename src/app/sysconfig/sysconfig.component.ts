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
  selector: 'app-sysconfig',
  templateUrl: './sysconfig.component.html',
  styleUrls: ['./sysconfig.component.css']
})
export class SysconfigComponent implements OnInit {

    systemVC: number;
    vcsetting: VisboSetting[];
    currenSettingValue: {name: string, value: string, type: string}[];
    configIndex: number;
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
    this.getVisboConfig();
  }

  getVisboConfig(): void {
    this.log(`getVisboConfig`);
    this.visbosettingService.getVCSettingByType(this.systemVC, 'SysConfig', true)
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

  getMainInfo(entry: VisboSetting): string {
    // this.log('get Main Value ' + entry.name);
    var result = "";
    if (entry.value) {
      switch (entry.name) {
        case 'UI URL':
          result = entry.value.UIUrl;
          break;
        case 'SMTP':
          result = entry.value.auth && entry.value.auth.user;
          break;
        case 'PW Policy':
          result = (entry.value.Description || "").substring(0,60).concat("...");
          break;
        case 'DEBUG':
          result = JSON.stringify(entry.value).substring(0,60).concat("...");
          break;
      }
    }
    return result || "";
  }

  convertToConfigList(obj: any, child: boolean = false): void {
    if (!child) this.currenSettingValue = [];
    for (var prop in obj) {
        // skip loop if the property is from prototype
        this.log(`Convert Setting ${prop} value ${obj[prop]} type ${typeof obj[prop]}`)
        if (typeof obj[prop] == "object") {
          this.convertToConfigList(obj[prop], true)
        } else {
          var propObject = {name: prop, value: obj[prop], type: typeof obj[prop]}
          this.currenSettingValue.push(propObject);
        }
    }

  }

  helperConfigIndex(configIndex: number):void {
    this.configIndex = configIndex;
    // this.log(`Convert Setting ${configIndex}`)
    this.convertToConfigList(this.vcsetting[configIndex].value, false);
    this.log(`Convert Setting Done ${this.currenSettingValue.length}`)
  }

  pageConfigIndex(increment: number): void {
    var newconfigIndex: number;
    newconfigIndex = this.configIndex + increment;
    if (newconfigIndex < 0) newconfigIndex = 0
    if (newconfigIndex >= this.vcsetting.length) newconfigIndex = this.vcsetting.length-1
    this.configIndex = newconfigIndex
    this.helperConfigIndex(newconfigIndex  )
  }

  sortTable(n) {
    if (!this.vcsetting) return
    this.log(`Sort Table Column ${n} old ${this.sortColumn}`)
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
    // this.log(`Sort VC Column ${this.sortColumn} Asc ${this.sortAscending} `)
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
      return 0; // No Sorting
    } else if (this.sortColumn == 3) {
      this.vcsetting.sort(function(a, b) {
        var result = 0
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result;
      })
    }

    if (!this.sortAscending) {
      this.log(`Sort VC Column Reverse `)
      this.vcsetting.reverse();
    }
  }


  /** Log message with the MessageService */
  private log(message: string) {
    this.messageService.add('Sys Config: ' + message);
  }



}
