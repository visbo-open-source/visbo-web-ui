import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

import { VisboUser, VisboUsersResponse } from '../_models/login';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class SysUserService {
  //   private serviceUrl = 'vc';  // URL to api on same server
  private serviceUrl = environment.restUrl.concat('/sysuser');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET Audits from the server */
  getSysUsers(userMatch: string): Observable<VisboUser[]> {
    var url = this.serviceUrl
    var queryParams = false

    if (userMatch) {
      url = url.concat(queryParams?'&':'?','email=', userMatch);
      queryParams = true;
    }
    // url = url.concat(queryParams?'&':'?','maxcount=', 6);

    this.log(`Calling HTTP Request: ${url} `);
    return this.http.get<VisboUsersResponse>(url, httpOptions)
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

  /** Log a VisboAuditService message with the MessageService */
  private log(message: string) {
    this.messageService.add('SysUserService: ' + message);
  }
}
