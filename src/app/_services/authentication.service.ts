import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { Login, VisboUser, VisboUserResponse, LoginResponse, VisboVersion, VisboVersionResponse, VisboStatusPWPolicy, VisboStatusPWPolicyResponse } from '../_models/visbouser';
import { VisboSetting, VisboSettingListResponse } from '../_models/visbosetting';

import { MessageService } from './message.service';

// import * as JWT from 'jwt-decode';
import jwt_decode from 'jwt-decode';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};


/* CLASS Overview
   The AuthenticationService class manages user authentication and session handling in the VISBO system. 
   It provides login, logout, password recovery, and user registration functionalities while maintaining user session details. 
*/
@Injectable()
export class AuthenticationService {

  isLoggedIn = false;
  logoutTime: Date;
  pwPolicy: string;

  constructor(
      private http: HttpClient,
      private messageService: MessageService,
      private env: EnvService
    ) { }

    private authUrl = this.env.restUrl.concat('/token/user');  // URL to web api

    
    logoutCheck(): Date {
    // Returns the logout time if the user is logged in, otherwise returns undefined.

      if (!this.isLoggedIn) {
        return undefined;
      }
      return this.logoutTime;
    }


   
    login(username: string, password: string): Observable<VisboUser> {
    // - Sends a login request to the backend with user credentials.
    // - Stores user data and JWT token in local storage.
    // - Sets logoutTime based on the token expiration.

      const url = `${this.authUrl}/login`;
      this.log(`Calling HTTP Request: ${url} for: ${username}`);
      const newLogin = new Login();
      newLogin.email = username;
      newLogin.password = password;

      return this.http.post<LoginResponse>(url, newLogin) /* MS Last Option HTTP Headers */
            .pipe(
              map(result => {
                // login successful if there's a jwt token in the response
                if (result && result.token) {
                    this.log(`Login Request Successful:  ${result.user.email}`);
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    localStorage.setItem('currentToken', JSON.stringify(result.token));
                    this.isLoggedIn = true;
                    // eslint-disable-next-line
                    const decoded: any = jwt_decode(result.token);
                    if (decoded && decoded.exp) {
                      // this.log(`Login token expiration:  ${decoded.exp}`);
                      this.logoutTime = new Date(decoded.exp * 1000);
                    }
                    this.log(`Login Request logoutTime:  ${this.logoutTime}`);                   

                    return result.user;
                }
                return null;
              }),
              catchError(this.handleError<VisboUser>('LoginError'))
            );
    }

    loginOTT(ott: string): Observable<VisboUser> {
    // - Authenticates a user using a one-time token (OTT).
    // - Stores session data similarly to login().

      const url = `${this.authUrl}/ott`;
      this.log(`Calling HTTP Request: ${url}`);
      const newOTT = {ott: ott}

      return this.http.post<LoginResponse>(url, newOTT)
            .pipe(
              map(result => {
                // login successful if there's a jwt token in the response
                if (result && result.token) {
                    this.log(`Login Request Successful:  ${result.user.email}`);
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    localStorage.setItem('currentToken', JSON.stringify(result.token));
                    this.isLoggedIn = true;
                    // eslint-disable-next-line
                    const decoded: any = jwt_decode(result.token);
                    if (decoded && decoded.exp) {
                      // this.log(`Login token expiration:  ${decoded.exp}`);
                      this.logoutTime = new Date(decoded.exp * 1000);
                    }
                    this.log(`Login Request logoutTime:  ${this.logoutTime}`);

                    return result.user;
                }
                return null;
              }),
              catchError(this.handleError<VisboUser>('LoginError'))
            );
    }

    loginGoogleUrl(): string {
    // Returns the Google login endpoint URL.

      const url = `${this.authUrl}/logingoogle`;
      return url;
    }

    loginGoogle(): Observable<VisboUser> {
    // Authenticates a user via Google login.

      const url = `${this.authUrl}/logingoogle`;
      this.log(`Calling HTTP Request: ${url}`);

      return this.http.post<LoginResponse>(url, {})
        .pipe(
          map(result => {
            // console.log(`google Login :  ${JSON.stringify(result)}`);
            // login successful if there's a jwt token in the response
            if (result && result.token) {
              this.log(`Login Request Successful:  ${result.user.email}`);
              // store user details and jwt token in local storage to keep user logged in between page refreshes
              localStorage.setItem('currentUser', JSON.stringify(result.user));
              localStorage.setItem('currentToken', JSON.stringify(result.token));
              this.isLoggedIn = true;
              // eslint-disable-next-line
              const decoded: any = jwt_decode(result.token);
              if (decoded && decoded.exp) {
                // this.log(`Login token expiration:  ${decoded.exp}`);
                this.logoutTime = new Date(decoded.exp * 1000);
              }
              this.log(`Login Request logoutTime:  ${this.logoutTime}`);

              return result.user;
            }
            return null;
          }),
          catchError(this.handleError<VisboUser>('LoginError'))
        );
    }

    oauthconfirm(hash: string): void {
    // Stores the OAuth user details and token in local storage.

      // MS TODO: we need to get the full blown real user
      localStorage.setItem('currentUser',
        JSON.stringify({
          "profile":{"company":"Privat","firstName":"Markus (G)","lastName":"Seyfried"},
          "status":{"registeredAt":"2020-11-10T16:20:32.620Z","lastLoginAt":"2020-11-10T18:10:31.694Z","loginRetries":0},
          "_id":"5b60762decb6077f42ba27d2","email":"markus.seyfried@gmail.com",
          "createdAt":"2018-07-31T14:46:05.138Z","updatedAt":"2020-11-10T18:22:39.469Z","__v":3,
          "userAgents":[]
        })
      );
      localStorage.setItem('currentToken', JSON.stringify(hash));
    }

    logout(): void {
      // Clears user session details and logs out the user.

        // remove user from local storage to log user out
        this.isLoggedIn = false;
        localStorage.clear();
    }

    getActiveUser(): VisboUser {
    // Retrieves the currently logged-in user's details from local storage.

      return JSON.parse(localStorage.getItem('currentUser'));
    }

    pwforgotten(user: VisboUser): Observable<LoginResponse> {
    // Sends a password reset request for the given user.

      const url = `${this.authUrl}/pwforgotten`;
      const newUser = new VisboUser();
      newUser.email = user.email;

      this.log(`Calling HTTP Request: ${url} for: ${newUser.email} `);

      return this.http.post<LoginResponse>(url, newUser) /* MS Last Option HTTP */
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`PW Forgotten Request executed`);
                if (result) {
                    this.log(`PW Forgotten Request Successful:  ${JSON.stringify(result)}`);
                }
                return result;
            }),
            catchError(this.handleError<LoginResponse>('pwforgotten'))
          );
    }

    pwreset(user: VisboUser, token: string): Observable<LoginResponse> {
    // Resets the password using a provided token.

      const url = `${this.authUrl}/pwreset`;
      const body = {token: token, password: user.password}
      this.log(`Calling HTTP Request: ${url} with: ${token} `);

      return this.http.post<LoginResponse>(url, body)
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
            catchError(this.handleError<LoginResponse>('pwreset'))
          );
    }

    registerconfirm(userId: string, hash: string): Observable<LoginResponse> {
    // Confirms user registration using an ID and a hash.

      const url = `${this.authUrl}/confirm`;
      const body = {_id: userId, hash: hash};
      this.log(`Calling HTTP Request: ${url} for: ${userId} `);

      return this.http.post<LoginResponse>(url, body) /* MS Last Option HTTP Headers */
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`e-mail confirm Request executed`);
                if (result) {
                    this.log(`e-mail confirm Request Successful:  ${JSON.stringify(result)}`);
                }
                return result;
            }),
            catchError(this.handleError<LoginResponse>('pwreset'))
          );
    }

    getUser(id: string, hash: string): Observable<VisboUser> {
    // Retrieves user information based on ID and hash.

      const url = `${this.authUrl}/signup`;
      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
      let params = new HttpParams();
      if (id) {
        params = params.append('id', id);
      }
      if (hash) {
        params = params.append('hash', hash);
      }
      this.log(`Calling HTTP Request: ${url} for: ${id} hash ${hash}`);
      return this.http.get<VisboUserResponse>(url, { headers , params })
          .pipe(
            map(result => result.user),
            // tap(result => this.log(`registered ${result.user.email} `)),
            catchError(this.handleError<VisboUser>('get registerUser'))
          );
    }

    createUser(user: VisboUser, hash: string): Observable<VisboUser> {
    // Creates a new user account.

      const url = `${this.authUrl}/signup`;      
      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
      let params = new HttpParams();
      if (hash) {
        params = params.append('hash', hash);
      }
      this.log(`Calling HTTP Request: ${url} for: ${user.email || user._id} hash ${hash} Profile: ${JSON.stringify(user.profile)}`);

      // newUser.password = model.password;
      return this.http.post<VisboUserResponse>(url, user, { headers , params })
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`Registration Request executed:  ${JSON.stringify(result)}`);
                if (result.user) {
                    this.log(`Registration Request Successful:  ${result.user.email}`);
                    return result.user;
                }
                return new VisboUser();
            }),
            // tap(result => this.log(`registered ${result.user.email} `)),
            catchError(this.handleError<VisboUser>('registerUser'))
          );
    }

    restVersion(): Observable<VisboVersion> {
    // Fetches the backend REST API version.

      const url = this.env.restUrl.concat('/status');
      this.log(`Calling HTTP Request: ${url}` );
      return this.http.get<VisboVersionResponse>(url, httpOptions)
        .pipe(
          map(response => response.status),
          tap(() => this.log(`fetched Status  `)),
          catchError(this.handleError<VisboVersion>('restVersion'))
        );
    }

    initPWPolicy(): Observable<VisboStatusPWPolicy> {
    // Retrieves and stores the system's password policy.

      const url = this.env.restUrl.concat('/status/pwpolicy');
      this.log(`Calling HTTP Request: ${url}` );
      return this.http.get<VisboStatusPWPolicyResponse>(url, httpOptions)
        .pipe(
          map(response => {
              this.pwPolicy = response.value?.PWPolicy;
              return response.value;
            }),
          tap(value => this.log(`fetched PW Policy ${JSON.stringify(value)}`)),
          catchError(this.handleError<VisboStatusPWPolicy>('initPWPolicy'))
        );
    }

    getSetting(): Observable<VisboSetting[]> {
    // Fetches system settings.

      const url = this.env.restUrl.concat('/status/setting');
      this.log(`Calling HTTP Request: ${url}` );
      return this.http.get<VisboSettingListResponse>(url, httpOptions)
        .pipe(
          map(response => response.vcsetting ),
          tap(value => this.log(`fetched Setting ${JSON.stringify(value)}`)),
          catchError(this.handleError<VisboSetting[]>('initSetting'))
        );
    }

    getPWPolicy(): string {
    // Returns the stored password policy.

      return this.pwPolicy;
    }

    /**
     * Handle Http operation that failed.
     * Let the app continue.
     * @param operation - name of the operation that failed
     * @param result - optional value to return as the observable result
     */
    private handleError<T> (operation = 'operation', result?: T) {
    // Handles errors from HTTP requests and logs error messages.

      // eslint-disable-next-line
      return (error: any): Observable<T> => {

        // OPTIONAL send the error to remote logging infrastructure
        this.log(`${operation} failed: ${JSON.stringify(error)} Status: ${error.status}, StatusText: ${error.statusText}, Message: ${error.message}, Result ${JSON.stringify(result)} `);

        // Let the app keep running by returning an empty result.
        return throwError(error);
        // return of(result as T);
      };
    }

    private log(message: string) {
    // Logs authentication-related messages using MessageService.

      this.messageService.add('AuthenticationService: ' + message);
    }

}
