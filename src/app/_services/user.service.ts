import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { MessageService } from './message.service';

import { VisboUser, VisboUserResponse, VisboOTTResponse } from '../_models/visbouser';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};


/* UserService Class Overview:
   The UserService class provides methods for managing user profiles, authentication tokens, 
   and password changes within the VISBO system. 
*/
@Injectable()
export class UserService {

  private userUrl = this.env.restUrl.concat('/user');  // URL to api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  getUserProfile(): Observable<VisboUser> {
  // Fetches the current user profile from the backend.
  // Returns:
  //    An Observable<VisboUser> containing the user profile data.
  // Process:
  //    Constructs the API request URL.
  //    Logs the request.
  //    Maps the response to extract the user object.
  //    Catches and handles errors.
    const url = `${this.userUrl}/profile`;
    this.log(`Calling HTTP Get Request: ${url}`);
    return this.http.get<VisboUserResponse>(url, httpOptions)
      .pipe(
        map(response => response.user),
        tap(user => this.log(`fetched ${user.email} User Profile `)),
        catchError(this.handleError<VisboUser>('getUserProfile'))
      );
  }

  updateUserProfile(user: VisboUser): Observable<VisboUser> {
  // Updates the user profile.
  // Parameters:
  //    user: The VisboUser object containing updated user information.
  // Returns:
  //    An Observable<VisboUser> containing the updated user profile.
  // Process:
  //    Constructs the API request URL.
  //    Logs the request.
  //    Maps the response to extract the updated user.
  //    Catches and handles errors.
    const url = `${this.userUrl}/profile`;
    this.log(`Calling HTTP Put Request: ${url}`);
    return this.http.put<VisboUserResponse>(url, user, httpOptions)
      .pipe(
        map(response => response.user),
        tap(resultUser => this.log(`updated User Profile ${resultUser.email} `)),
        catchError(this.handleError<VisboUser>('updateUserProfile'))
      );
  }

  getUserOTT(): Observable<string> {
  // Fetches a one-time token (OTT) for the user.
  // Returns:
  //    An Observable<string> containing the OTT.
  // Process:
  //    Constructs the API request URL.
  //    Logs the request.
  //    Maps the response to extract the OTT.
  //    Catches and handles errors.
    const url = `${this.userUrl}/ott`;
    this.log(`Calling HTTP Get Request: ${url}`);
    return this.http.get<VisboOTTResponse>(url, httpOptions)
      .pipe(
        map(response => response.ott),
        catchError(this.handleError<string>('getUserOTT'))
      );
  }

  passwordChange(oldpw: string, newpw: string): Observable<VisboUser> {
  // Changes the user's password.
  // Parameters:
  //    oldpw: The current password.
  //    newpw: The new password to be set.
  // Returns:
  //    An Observable<VisboUser> containing the updated user profile.    
    const url = `${this.userUrl}/passwordchange`;
    this.log(`Calling HTTP Put Request: ${url}`);
    const pw = {oldpassword: oldpw, password: newpw};
    return this.http.put<VisboUserResponse>(url, pw, httpOptions)
      .pipe(
        map(response => response.user),
        tap(user => this.log(`Changed User Password ${user.email} `)),
        catchError(this.handleError<VisboUser>('ChangedPassword'))
      );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   * Returns:
   *    An observable that either returns an empty result or throws the error.
   */
  private handleError<T> (operation = 'operation', result?: T) {
    // eslint-disable-next-line
    return (error: any): Observable<T> => {

      this.log(`HTTP Request ${operation} failed: ${error.error.message} status:${error.status}, Result ${JSON.stringify(result)}`);

      // Let the app keep running by returning an empty result.
      return throwError(error);
      // return new ErrorObservable(error);
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboUserService: ' + message);
  }
}
