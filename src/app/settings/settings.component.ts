import { Component, OnInit } from '@angular/core';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboCenterService } from '../_services/visbocenter.service';

import { VGPermission } from '../_models/visbogroup';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})

// The SettingsComponent is an Angular component responsible for managing application settings. 
// It primarily handles message activation and displays settings based on user permissions.

export class SettingsComponent implements OnInit {

  activateMessage: boolean;     // Indicates whether the messaging feature is currently activated. Retrieved and managed through MessageService.
  combinedPerm: VGPermission;   // Holds the combined permissions of the currently logged-in user.
                                // Used to manage access to certain settings based on administrative roles.

  constructor(
    private visbocenterService: VisboCenterService,
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  // Initializes the component by setting up the initial state of the settings.
  ngOnInit(): void {
    this.activateMessage = this.messageService.getstatus();
    this.combinedPerm = this.visbocenterService.getSysAdminRole();
  }

  // Toggles the state of the activateMessage property.
  toggleMessages(): void {
    this.activateMessage = this.messageService.toggle();
  }

}
