import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { Login, VisboUser, VisboUserAddress, VisboUserProfile, LoginResponse } from '../_models/login';
import { MessageService } from './message.service';

@Injectable()
export class AuthenticationService {

  isLoggedIn: boolean = false;
  constructor(
      private http: HttpClient,
      private messageService: MessageService
    ) { }

    private authUrl = environment.restUrl.concat('/token/user');  // URL to web api

    login(username: string, password: string) {
      const url = `${this.authUrl}/login`;
      this.log(`Calling HTTP Request: ${url} for: ${username}`);
      var newLogin = new Login;
      newLogin.email = username;
      newLogin.password = password;

      return this.http.post<LoginResponse>(url, newLogin) /* MS Last Option HTTP Headers */
            .pipe(
              map(result => {
                // login successful if there's a jwt token in the response
                this.log(`Login Request Successful:  ${result.user.email}`);
                if (result && result.token) {
                    this.log(`Login Request Successful:  ${result.user.email}`);
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                    sessionStorage.setItem('currentToken', JSON.stringify(result.token));
                    this.isLoggedIn = true;
                    return result.user;
                };
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
        sessionStorage.removeItem('isSysAdmin');

    }

    getActiveUser(){
      var currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      return currentUser;
    }

    createUser(model: any){
      const url = `${this.authUrl}/signup`;
      var newUser = new VisboUser;
      var newUserProfile = new VisboUserProfile;
      newUser.email = model.username;
      // do not set password before the log statement
      newUserProfile.firstName = model.firstName;
      newUserProfile.lastName = model.lastName;
      newUserProfile.phone = model.phone;
      newUserProfile.company = model.company;
      newUser.profile = newUserProfile;

      // newUser.profile = {firstName: firstName, lastName: lastName, phone: phone, company: company};

      this.log(`Calling HTTP Request: ${url} for: ${newUser.email} Profile: ${JSON.stringify(newUser)}`);

      newUser.password = model.password;
      return this.http.post<LoginResponse>(url, newUser) /* MS Last Option HTTP Headers */
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`Registration Request executed:  ${JSON.stringify(result)}`);
                if (result && result.user) {
                    this.log(`Registratioon Request Successful:  ${result.user.email}`);
                    return result.user;
                }
                return result;
            }),
            // tap(result => this.log(`registered ${result.user.email} `)),
            catchError(this.handleError<any>('registerUser'))
          );
    }

    /**
     * Handle Http operation that failed.
     * Let the app continue.
     * @param operation - name of the operation that failed
     * @param result - optional value to return as the observable result
     */
    private handleError<T> (operation = 'operation', result?: T) {
      return (error: any): Observable<T> => {

        this.log(`HTTP Request failed: ${error.message} ${error.status}`);
        // TODO: send the error to remote logging infrastructure
        console.error(error.message, ' ', error.status); // log to console instead

        // TODO: better job of transforming error for user consumption
        this.log(`${operation} failed: ${error.message}`);

        // Let the app keep running by returning an empty result.
        return new ErrorObservable(error);
        //return of(result as T);
      };
    }

    /** Log AuthenticationService message with the MessageService */
    private log(message: string) {
      this.messageService.add('AuthenticationService: ' + message);
    }

}
