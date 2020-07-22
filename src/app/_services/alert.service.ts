import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Observable } from 'rxjs-compat/Observable';
import { Subject } from 'rxjs-compat/Subject';

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
                    this.keepAfterNavigationChange = false;
                } else {
                    // clear alert
                    this.subject.next();
                }
            }
        });
    }

    clear(): void {
      this.subject.next();
    }

    success(message: string, keepAfterNavigationChange = false): void {
        this.keepAfterNavigationChange = keepAfterNavigationChange;
        this.subject.next({ type: 'success', text: message });
    }

    error(message: string, keepAfterNavigationChange = false): void {
        if (!message) {
          message = 'Unknown Error reaching the Server';
        }
        this.keepAfterNavigationChange = keepAfterNavigationChange;
        this.subject.next({ type: 'error', text: message });
    }

    // eslint-disable-next-line
    getMessage(): Observable<any> {
        return this.subject.asObservable();
    }
}
