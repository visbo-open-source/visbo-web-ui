import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {

  activateMessage: boolean;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.activateMessage = this.messageService.getstatus();
  }

  toggleMessages():void {
    console.log('Toggle Messages')
    this.activateMessage = this.messageService.toggle();
  }

}
