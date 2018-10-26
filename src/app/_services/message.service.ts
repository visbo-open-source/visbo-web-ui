import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class MessageService {
  messages: string[] = [];
  activateMessages: boolean = false;
  activateMessageToggle = new EventEmitter(true);

  toggle() {
    this.activateMessages = !this.activateMessages
    this.activateMessageToggle.emit(this.activateMessages);
    console.log('Messages Toggle to %s', this.activateMessages);
    return this.activateMessages;
  }

  getstatus() {
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
