import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { AlertService } from '../_services/alert.service';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthenticationService } from '../_services/authentication.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

    constructor(
      private authenticationService: AuthenticationService,
      private alertService: AlertService
    ) { }

    // eslint-disable-next-line
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        const currentToken = JSON.parse(localStorage.getItem('currentToken'));
        if (currentToken) {
            request = request.clone({
                setHeaders: {
                    'access-key': `${currentToken}`
                }
            });
        }

        return next.handle(request)
        .pipe(
            catchError((error: HttpErrorResponse) => {
                  // 401 UNAUTHORIZED - SECTION 2
                  if (error && error.status === 401) {
                      console.log('Interceptor: Session Expired, redirect to login');
                      this.authenticationService.logout();
                      this.alertService.error("Session expired", true);
                      location.reload();
                  }
                  // console.log('Interceptor: error:', JSON.stringify(error));
                  // const err = error.error.message || error.statusText;
                  return throwError(error);
             })
          );
    }
}
