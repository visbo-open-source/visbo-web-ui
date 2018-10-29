import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class MessageService {
  messages: string[] = [];
  activateMessages: boolean = undefined;
  activateMessageToggle = new EventEmitter(true);

  initstatus() {
    if (this.activateMessages == undefined) {
      this.activateMessages = sessionStorage.getItem('activateMessages') == 'On';
    }
  }

  toggle() {
    this.initstatus();
    this.activateMessages = !this.activateMessages
    sessionStorage.setItem('activateMessages', this.activateMessages? 'On':'Off');
    this.activateMessageToggle.emit(this.activateMessages);
    console.log('Messages Toggle to %s', this.activateMessages);
    return this.activateMessages;
  }

  getstatus() {
    this.initstatus();
    return this.activateMessages
  }

  add(message: string) {
    this.messages.push(message);
    if (this.messages.length > 10) this.messages.shift();
  }

  clear() {
    this.messages = [];
  }
}
