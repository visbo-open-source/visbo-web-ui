import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboAudit, VisboAuditResponse } from '../_models/visboaudit';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboAuditService {
  //   private serviceUrl = 'vc';  // URL to api on same server
  private serviceUrl = environment.restUrl.concat('/audit');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET Audits from the server */
  getVisboAudits(sysadmin: boolean = false, from: Date = undefined, to: Date = undefined): Observable<VisboAudit[]> {
    var url = this.serviceUrl
    var queryParams = false
    if (sysadmin) {
      url = url.concat(queryParams?'&':'?','sysadmin=1');
      queryParams = true;
    }
    if (from) {
      url = url.concat(queryParams?'&':'?','from=', from.toISOString());
      queryParams = true;
    }
    if (to) {
      url = url.concat(queryParams?'&':'?','to=', to.toISOString());
      queryParams = true;
    }

    this.log(`Calling HTTP Request: ${url} ${sysadmin ? "as sysadmin" : ""}`);
    return this.http.get<VisboAuditResponse>(url, httpOptions)
      .pipe(
        map(response => response.audit),
        tap(audit => this.log(`fetched ${audit.length} Audits `)),
        catchError(this.handleError('getVisboAudit', []))
      );
  }

  // /** GET Audit by id. Return `undefined` when id not found */
  // /** MS Todo Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
  // getVisboAuditNo404<Data>(id: string): Observable<VisboAudit> {
  //   const url = `${this.serviceUrl}/?id=${id}`;
  //   this.log(`Calling HTTP Request: ${this.serviceUrl}`);
  //   return this.http.get<VisboAudit[]>(url)
  //     .pipe(
  //       map(audit => audit[0]), // returns a {0|1} element array
  //       tap(h => {
  //         var outcome = h ? `fetched` : `did not find`;
  //         this.log(`${outcome} VisboAudit ${id}`);
  //       }),
  //       catchError(this.handleError<VisboAudit>(`getVisboAudit id: ${id}`))
  //     );
  // }

  // /** GET Audit by id. Will 404 if id not found */
  // getVisboAudit(id: string, sysadmin: boolean = false): Observable<VisboAudit> {
  //   var url = `${this.serviceUrl}/${id}`;
  //   this.log(`Calling HTTP Request for a specific entry: ${url}`);
  //   return this.http.get<VisboAuditResponse>(url).pipe(
  //     map(response => response.audit[0]),
  //     tap(audit => this.log(`fetched Audit ${audit._id}`)),
  //     catchError(this.handleError<VisboAudit>(`getVisboAudit id:${id}`))
  //   );
  // }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      this.log(`HTTP Request failed: ${error.error.message} status:${error.status}`);

      // user no longer authenticated, remove it from the session
      if (error.status == 401) {
        this.log(`${operation} failed: ${error.message}`);
        sessionStorage.removeItem('currentUser');
      }
      // Let the app keep running by returning an empty result.
      return throwError(error);
      // return new ErrorObservable(error);
    };
  }

  /** Log a VisboAuditService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboAuditService: ' + message);
  }
}
