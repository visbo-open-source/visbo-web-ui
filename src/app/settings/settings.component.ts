import { Component, OnInit } from '@angular/core';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboCenterService } from '../_services/visbocenter.service';

import { VGPermission } from '../_models/visbogroup';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {

  activateMessage: boolean;
  combinedPerm: VGPermission;

  constructor(
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.activateMessage = this.messageService.getstatus();
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
  }

  toggleMessages(): void {
    this.activateMessage = this.messageService.toggle();
  }

}
