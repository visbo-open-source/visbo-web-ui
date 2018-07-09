import { Component, OnInit } from '@angular/core';
import { MessageService } from '../_services/message.service';
import { MessagesComponent } from './messages/messages.component';

@Component({
  selector: 'app-showmessages',
  templateUrl: './showmessages.component.html'
})
export class ShowMessagesComponent implements OnInit {

  constructor(private messageService: MessageService) {}

  ngOnInit() {
  }

}
