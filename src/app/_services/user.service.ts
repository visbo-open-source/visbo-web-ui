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

@Injectable()
export class UserService {

  private userUrl = this.env.restUrl.concat('/user');  // URL to api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }

  // MS TODO Check correct Observable Type VisboUser instead of any
  getUserProfile(): Observable<VisboUser> {
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
    const url = `${this.userUrl}/ott`;
    this.log(`Calling HTTP Get Request: ${url}`);
    return this.http.get<VisboOTTResponse>(url, httpOptions)
      .pipe(
        map(response => response.ott),
        catchError(this.handleError<string>('getUserOTT'))
      );
  }

  passwordChange(oldpw: string, newpw: string): Observable<VisboUser> {
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
