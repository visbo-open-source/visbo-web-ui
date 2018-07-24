import { Injectable } from '@angular/core';

@Injectable()
export class MessageService {
  messages: string[] = [];

  add(message: string) {
    this.messages.push(message);
    if (this.messages.length > 10) this.messages.shift();
  }

  clear() {
    this.messages = [];
  }
}
