import { Injectable, EventEmitter } from '@angular/core';


/* MessageService Class Overview:
   The MessageService class is responsible for managing message logging and toggling message activation status within an Angular application. 
*/
@Injectable()
export class MessageService {
  messages: string[] = [];
  activateMessages: boolean = undefined;
  activateMessageToggle = new EventEmitter(true);

  initstatus(): void {
  // Initializes the activateMessages status from local storage if not already set.
    if (this.activateMessages === undefined) {
      this.activateMessages = localStorage.getItem('activateMessages') === 'On';
    }
  }

  toggle(): boolean {
  // - Toggles the activateMessages flag and updates local storage.
  // - Logs the toggle status to the console.
  // - Returns the updated toggle state.

    this.initstatus();
    this.activateMessages = !this.activateMessages;
    localStorage.setItem('activateMessages', this.activateMessages ? 'On' : 'Off');
    // this.activateMessageToggle.emit(this.activateMessages);
    console.log('Messages Toggle to %s', this.activateMessages);
    return this.activateMessages;
  }

  getstatus(): boolean {
  // Returns the current status of activateMessages.

    this.initstatus();
    return this.activateMessages;
  }

  add(message: string): void {
  // - Adds a message to the log if activateMessages is enabled.
  // - Logs the message to the console.

    this.initstatus();
    if (this.activateMessages) {
      console.log(message);
    }
    // this.messages.push(message);
    // if (this.messages.length > 20) {
    //   this.messages.shift();
    // }
  }

  clear(): void {
  // Clears all stored messages.
    this.messages = [];
  }
}
