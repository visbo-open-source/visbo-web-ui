import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboCenterService } from '../_services/visbocenter.service';

import { VGPermission, VGPSystem, VGPVC, VGPVP } from '../_models/visbogroup';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {

  activateMessage: boolean;
  combinedPerm: VGPermission = undefined;

  constructor(
    private visbocenterService: VisboCenterService,
    private router: Router,
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.activateMessage = this.messageService.getstatus();
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
    console.log('Sys Admin Role: ', JSON.stringify(this.combinedPerm))
  }

  toggleMessages():void {
    console.log('Toggle Messages')
    this.activateMessage = this.messageService.toggle();
  }

}
