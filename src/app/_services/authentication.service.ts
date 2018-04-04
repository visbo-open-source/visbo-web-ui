import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { Login, VisboUser, LoginResponse } from '../_models/login';
import { MessageService } from './message.service';

@Injectable()
export class AuthenticationService {

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
                    return result.user;
                }
                return null;
              }),
              catchError(this.handleError<any>('LoginError'))
            );
    }

    logout() {
        // remove user from local storage to log user out
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentToken');
    }

    createUser(model: any){
      const url = `${this.authUrl}/signup`;
      var newUser = new VisboUser;
      newUser.email = model.username;
      newUser.password = model.password;
      newUser.profile = { "firstName" : model.firstName};
      // newUser.profile.firstName = model.firstName;
      newUser.profile.lastName = model.lastName;
      newUser.profile.phone = model.phone;
      newUser.profile.company = model.company;

      this.log(`Calling HTTP Request: ${url} for: ${newUser.email}`);

      return this.http.post<LoginResponse>(url, newUser) /* MS Last Option HTTP Headers */
          .pipe(
            map(result => {
                // registration successful if there's a user in the response
                this.log(`Registration Request executed:  ${result}`);
                if (result && result.user) {
                    this.log(`Registratioon Request Successful:  ${result.user.email}`);
                    return result.user;
                }
                return result;
            }),
            // tap(result => this.log(`registered ${result.user.email} `)),
            catchError(this.handleError('registerUser', []))
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
        console.error(error); // log to console instead

        // TODO: better job of transforming error for user consumption
        this.log(`${operation} failed: ${error.message}`);

        // Let the app keep running by returning an empty result.
        return of(result as T);
      };
    }

    /** Log AuthenticationService message with the MessageService */
    private log(message: string) {
      this.messageService.add('AuthenticationService: ' + message);
    }

}
