import { Injectable } from '@angular/core';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(
      private route: ActivatedRoute,
      private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (localStorage.getItem('currentUser')) {
            // logged in so return true
            return true;
        }
        let ott: string;
        const strParams = state.url.split('?')[1];
        if (strParams) {
          const params = strParams.split('&');
          if (params.length > 0) {
            ott = params.find(param => param.indexOf('ott=') == 0);
            if (ott) {
              // console.log("ott found, get a session");
              // not logged in so redirect to login page with the return url
              this.router.navigate(['login'], { queryParams: { ott: '1', returnUrl: state.url }});
              return false;
            }
          }
        }

        // not logged in so redirect to login page with the return url
        this.router.navigate(['login'], { queryParams: { returnUrl: state.url }});
        return false;
    }
}
