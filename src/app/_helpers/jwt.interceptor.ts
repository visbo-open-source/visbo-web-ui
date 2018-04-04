import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        let currentToken = JSON.parse(sessionStorage.getItem('currentToken'));
        if (currentToken) {
            request = request.clone({
                setHeaders: {
                    'access-key': `${currentToken}`
                }
            });
        }

        return next.handle(request);
    }

   //  intercept(observable: Observable<Response>): Observable<Response> {
   //     return observable.catch((err, source) => {
   //       //if (err.status  == 401 && !_.endsWith(err.url, 'api/auth/login')) {
   //       if (err.status  == 401 ) { /* MS TOdo: do not redirect on login page */
   //             this._router.navigate(['/login']);
   //             return Observable.empty();
   //         } else {
   //             return Observable.throw(err);
   //        }
   //     });
   // }
}
