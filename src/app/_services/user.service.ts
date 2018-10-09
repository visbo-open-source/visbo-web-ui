import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboUser, VisboUserResponse } from '../_models/login';

import { MessageService } from './message.service';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class UserService {

  private profileUrl = environment.restUrl.concat('/user/profile');  // URL to api
  private pwchangeUrl = environment.restUrl.concat('/user/passwordchange');  // URL to api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }

// MS TODO Check correct Observable Type VisboUser instead of any
  getUserProfile(): Observable<any> {
    this.log(`Calling HTTP Get Request: ${this.profileUrl}`);
    return this.http.get<VisboUserResponse>(this.profileUrl, httpOptions)
      .pipe(
        map(response => response.user),
        tap(user => this.log(`fetched ${user.email} User Profile `)),
        catchError(this.handleError('getUserProfile', []))
      );
  }

  updateUserProfile(user: VisboUser): Observable<VisboUser> {
    this.log(`Calling HTTP Put Request: ${this.profileUrl}`);
    return this.http.put<VisboUserResponse>(this.profileUrl, user, httpOptions)
      .pipe(
        map(response => response.user),
        tap(user => this.log(`updated User Profile ${user.email} `)),
        catchError(this.handleError<any>('updateUserProfile'))
      );
  }


  passwordChange(model: any): Observable<VisboUser> {
    this.log(`Calling HTTP Put Request: ${this.pwchangeUrl} Body: ${JSON.stringify(model)}`);
    return this.http.put<VisboUserResponse>(this.pwchangeUrl, model, httpOptions)
      .pipe(
        map(response => response.user),
        tap(user => this.log(`Changed User Password ${user.email} `)),
        catchError(this.handleError<any>('ChangedPassword'))
      );
  }

  // getAll() {
  //     return this.http.get<VisboUser[]>('/api/users');
  // }
  //
  // getById(id: number) {
  //     return this.http.get('/api/users/' + id);
  // }
  //
  // create(user: VisboUser) {
  //     return this.http.post('/api/users', user);
  // }
  // delete(id: number) {
  //     return this.http.delete('/api/users/' + id);
  // }
  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      this.log(`HTTP Request ${operation} failed: ${error.error.message} status:${error.status}`);

      // Let the app keep running by returning an empty result.
      return throwError(error);
      // return new ErrorObservable(error);
    };
  }

  /** Log a VisboUserService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboUserService: ' + message);
  }
}
