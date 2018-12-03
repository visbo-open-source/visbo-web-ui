import { Component, OnInit, EventEmitter } from '@angular/core';
import { MessageService } from '../_services/message.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit {

  activateMessage: boolean;

  constructor(public messageService: MessageService) {}

  ngOnInit() {
    this.activateMessage = this.messageService.getstatus();
    this.messageService.activateMessageToggle.subscribe(
      (status) => {
        this.activateMessage = this.messageService.getstatus();
      }
    );
  }

}
