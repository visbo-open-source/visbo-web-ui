import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class AlertService {
  // eslint-disable-next-line
    private subject = new Subject<any>();
    private keepAfterNavigationChange = false;

    constructor(private router: Router) {
        // clear alert message on route change
        router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                if (this.keepAfterNavigationChange) {
                    // only keep for a single location change
                    console.log("alert only single event");
                    this.keepAfterNavigationChange = false;
                } else {
                    // clear alert
                    // console.log("alert clear");
                    this.subject.next();
                }
            }
        });
    }

    clear(): void {
      console.log("alert clear");
      this.subject.next();
    }

    success(message: string, keepAfterNavigationChange = false): void {
        this.keepAfterNavigationChange = keepAfterNavigationChange;
        this.subject.next({ type: 'success', text: message });
        console.log("alert success", keepAfterNavigationChange);
    }

    error(message: string, keepAfterNavigationChange = false): void {
        if (!message) {
          message = 'Unknown Error reaching the Server';
        }
        this.keepAfterNavigationChange = keepAfterNavigationChange;
        this.subject.next({ type: 'error', text: message });
        console.log("alert error", keepAfterNavigationChange);
    }

    // eslint-disable-next-line
    getMessage(): Observable<any> {
        return this.subject.asObservable();
    }
}
