import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { Login, VisboUser, VisboUserAddress, VisboUserProfile, LoginResponse, VisboStatusResponse, VisboStatusPWPolicyResponse } from '../_models/login';
import { MessageService } from './message.service';

import * as JWT from 'jwt-decode';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class AuthenticationService {

  isLoggedIn = false;
  logoutTime: Date = undefined;
  pwPolicy: any = undefined;

  constructor(
      private http: HttpClient,
      private messageService: MessageService,
      private env: EnvService
    ) { }

    private authUrl = this.env.restUrl.concat('/token/user');  // URL to web api

    logoutCheck() {
      if (!this.isLoggedIn) {
        return undefined;
      }
      return this.logoutTime;
    }


    login(username: string, password: string) {
      const url = `${this.authUrl}/login`;
      this.log(`Calling HTTP Request: ${url} for: ${username}`);
      let newLogin: Login;
      newLogin = new Login;
      newLogin.email = username;
      newLogin.password = password;

      return this.http.post<LoginResponse>(url, newLogin) /* MS Last Option HTTP Headers */
            .pipe(
              map(result => {
                // login successful if there's a jwt token in the response
                if (result && result.token) {
                    this.log(`Login Request Successful:  ${result.user.email}`);
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                    sessionStorage.setItem('currentToken', JSON.stringify(result.token));
                    this.isLoggedIn = true;
                    let decoded: any;
                    decoded = JWT(result.token);
                    // this.log(`Login token expiration:  ${decoded.exp}`);
                    this.logoutTime = new Date(decoded.exp * 1000);
                    this.log(`Login Request logoutTime:  ${this.logoutTime}`);

                    return result.user;
                }
                return null;
              }),
              catchError(this.handleError<any>('LoginError'))
            );
    }

    logout() {
        // remove user from local storage to log user out
        this.isLoggedIn = false;

        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentToken');

    }

    getActiveUser() {
      return JSON.parse(sessionStorage.getItem('currentUser'));
    }

    pwforgotten(model: any) {
      const url = `${this.authUrl}/pwforgotten`;
      let newUser: VisboUser;
      newUser = new VisboUser;
      newUser.email = model.username;

      this.log(`Calling HTTP Request: ${url} for: ${model.username} `);

      return this.http.post<LoginResponse>(url, newUser) /* MS Last Option HTTP Headers */
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`PW Forgotten Request executed`);
                if (result) {
                    this.log(`PW Forgotten Request Successful:  ${JSON.stringify(result)}`);
                }
                return result;
            }),
            catchError(this.handleError<any>('pwforgotten'))
          );
    }

    pwreset(model: any) {
      const url = `${this.authUrl}/pwreset`;

      this.log(`Calling HTTP Request: ${url} with: ${model.token} `);

      return this.http.post<LoginResponse>(url, model)
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`PW Reset Request executed`);
                if (result) {
                  this.log(`PW Reset Request Successful:  ${JSON.stringify(result)}`);
                } else {
                  this.log(`PW Reset Request Unsuccessful:  ${JSON.stringify(result)}`);
                }
                return result;
            }),
            catchError(this.handleError<any>('pwreset'))
          );
    }

    registerconfirm(model: any) {
      const url = `${this.authUrl}/confirm`;

      this.log(`Calling HTTP Request: ${url} for: ${model._id} `);

      return this.http.post<LoginResponse>(url, model) /* MS Last Option HTTP Headers */
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`e-mail confirm Request executed`);
                if (result) {
                    this.log(`e-mail confirm Request Successful:  ${JSON.stringify(result)}`);
                }
                return result;
            }),
            catchError(this.handleError<any>('pwreset'))
          );
    }

    createUser(model: any, hash: string) {
      const url = `${this.authUrl}/signup`;
      let newUser: VisboUser, newUserProfile: VisboUserProfile;
      newUser = new VisboUser;
      newUserProfile = new VisboUserProfile;
      if (model.username) { newUser.email = model.username; }
      if (model._id) { newUser._id = model._id; }
      // do not set password before the log statement
      newUserProfile.firstName = model.firstName;
      newUserProfile.lastName = model.lastName;
      newUserProfile.phone = model.phone;
      newUserProfile.company = model.company;
      newUser.profile = newUserProfile;

      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
      let params = new HttpParams();
      if (hash) {
        params = params.append('hash', hash);
      }
      this.log(`Calling HTTP Request: ${url} for: ${newUser.email || newUser._id} hash ${hash} Profile: ${JSON.stringify(newUser)}`);

      newUser.password = model.password;
      return this.http.post<LoginResponse>(url, newUser, { headers , params })
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`Registration Request executed:  ${JSON.stringify(result)}`);
                if (result.user) {
                    this.log(`Registration Request Successful:  ${result.user.email}`);
                    return result.user;
                }
                return {};
            }),
            // tap(result => this.log(`registered ${result.user.email} `)),
            catchError(this.handleError<any>('registerUser'))
          );
    }

    restVersion(): Observable<any> {
      const url = this.env.restUrl.concat('/status');
      this.log(`Calling HTTP Request: ${url}` );
      return this.http.get<VisboStatusResponse>(url, httpOptions)
        .pipe(
          map(response => response.status),
          tap(status => this.log(`fetched Status  `)),
          catchError(this.handleError('getStatus', []))
        );
    }

    initPWPolicy(): Observable<any> {
      const url = this.env.restUrl.concat('/status/pwpolicy');
      this.log(`Calling HTTP Request: ${url}` );
      return this.http.get<VisboStatusPWPolicyResponse>(url, httpOptions)
        .pipe(
          map(response => {
              this.pwPolicy = response.value;
              return response.value;
            }),
          tap(value => this.log(`fetched PW Policy ${JSON.stringify(value)}`)),
          catchError(this.handleError('initPWPolicy', []))
        );
    }

    getPWPolicy() {
      return this.pwPolicy;
    }

    /**
     * Handle Http operation that failed.
     * Let the app continue.
     * @param operation - name of the operation that failed
     * @param result - optional value to return as the observable result
     */
    private handleError<T> (operation = 'operation', result?: T) {
      return (error: any): Observable<T> => {

        // OPTIONAL send the error to remote logging infrastructure
        this.log(`${operation} failed: ${JSON.stringify(error)} Status: ${error.status}, StatusText: ${error.statusText}, Message: ${error.message}`);

        // Let the app keep running by returning an empty result.
        return throwError(error);
        // return new ErrorObservable(error);
        // return of(result as T);
      };
    }

    /** Log a message with the MessageService */
    private log(message: string) {
      this.messageService.add('AuthenticationService: ' + message);
    }

}
