import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

import { VisboUser, VisboUsersResponse } from '../_models/login';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class SysUserService {
  //   private serviceUrl = 'vc';  // URL to api on same server
  private serviceUrl = this.env.restUrl.concat('/sysuser');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET Users from the server */
  getSysUsers(userMatch: string): Observable<VisboUser[]> {
    var url = this.serviceUrl
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (userMatch) params = params.append('email', userMatch);
    params = params.append('maxcount', '100');

    this.log(`Calling HTTP Request: ${url} `);
    return this.http.get<VisboUsersResponse>(url, { headers , params })
      .pipe(
        map(response => response.user),
        tap(user => this.log(`fetched ${user.length} Users `)),
        catchError(this.handleError('getSysUsers', []))
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

      this.log(`HTTP Request ${operation} failed: ${error.error.message} status:${error.status}`);

      // Let the app keep running by returning an empty result.
      return throwError(error);
      // return new ErrorObservable(error);
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('SysUserService: ' + message);
  }
}
