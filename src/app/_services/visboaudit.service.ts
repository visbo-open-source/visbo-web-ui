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
  private serviceBaseUrl = environment.restUrl;  // URL to api on same server

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET Audits from the server */
  getVisboAudits(sysadmin: boolean = false, from: Date = undefined, to: Date = undefined, text: string = undefined, maxcount: number= undefined, actionType: string=undefined): Observable<VisboAudit[]> {
    var url = this.serviceBaseUrl.concat('/audit');
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
    if (text) {
      url = url.concat(queryParams?'&':'?','text=', text);
      queryParams = true;
    }
    if (maxcount) {
      url = url.concat(queryParams?'&':'?','maxcount=', maxcount.toString());
      queryParams = true;
    }
    if (actionType) {
      url = url.concat(queryParams?'&':'?','action=', actionType);
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

  /** GET Audits from the server */
  getVisboCenterAudits(sysadmin: boolean = false, vcid: string, from: Date = undefined, to: Date = undefined, text: string = undefined, maxcount: number= undefined, actionType: string=undefined): Observable<VisboAudit[]> {
    var url = this.serviceBaseUrl.concat('/vc/', vcid,'/audit');
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
    if (text) {
      url = url.concat(queryParams?'&':'?','text=', text);
      queryParams = true;
    }
    if (maxcount) {
      url = url.concat(queryParams?'&':'?','maxcount=', maxcount.toString());
      queryParams = true;
    }
    if (actionType) {
      url = url.concat(queryParams?'&':'?','action=', actionType);
      queryParams = true;
    }

    this.log(`Calling HTTP Request: ${url} for VC ${vcid}`);
    return this.http.get<VisboAuditResponse>(url, httpOptions)
      .pipe(
        map(response => response.audit),
        tap(audit => this.log(`fetched ${audit.length} Audits `)),
        catchError(this.handleError('getVisboAudit', []))
      );
  }

  /** GET Audits from the server */
  getVisboProjectAudits(sysadmin: boolean = false, vpid: string, from: Date = undefined, to: Date = undefined, text: string = undefined, maxcount: number= undefined, actionType: string=undefined): Observable<VisboAudit[]> {
    var url = this.serviceBaseUrl.concat('/vp/', vpid,'/audit');
    this.log(`Calling HTTP Request Prepare URL: ${url} for VP ${vpid}`);
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
    if (text) {
      url = url.concat(queryParams?'&':'?','text=', text);
      queryParams = true;
    }
    if (maxcount) {
      url = url.concat(queryParams?'&':'?','maxcount=', maxcount.toString());
      queryParams = true;
    }
    if (actionType) {
      url = url.concat(queryParams?'&':'?','action=', actionType);
      queryParams = true;
    }

    this.log(`Calling HTTP Request: ${url} for VP ${vpid}`);
    return this.http.get<VisboAuditResponse>(url, httpOptions)
      .pipe(
        map(response => response.audit),
        tap(audit => this.log(`fetched ${audit.length} Audits `)),
        catchError(this.handleError('getVisboAudit', []))
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
    this.messageService.add('VisboAuditService: ' + message);
  }
}
