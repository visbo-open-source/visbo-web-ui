import { Injectable } from '@angular/core';

@Injectable()
export class MessageService {
  messages: string[] = [];

  toggle() {
    var status: string;
    status = sessionStorage.getItem('activateMessages') || '';
    status = status == '' ? 'On' : '';
    sessionStorage.setItem('activateMessages', status);
    // console.log('Messages Toggle to %s', status);
    return status == 'On';
  }

  getstatus() {
    var status: string;
    status = sessionStorage.getItem('activateMessages') || '';
    // console.log('Messages Status return %s', status)
    return status == 'On'
  }

  add(message: string) {
    this.messages.push(message);
    if (this.messages.length > 10) this.messages.shift();
  }

  clear() {
    this.messages = [];
  }
}
