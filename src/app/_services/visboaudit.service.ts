import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboAudit, VisboAuditResponse, QueryAuditType } from '../_models/visboaudit';

import { MessageService } from './message.service';

const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable()
export class VisboAuditService {
  private serviceBaseUrl = this.env.restUrl;  // URL to api on same server

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET Audits from the server */
  getVisboAudits(sysadmin?: boolean, queryAudit?: QueryAuditType): Observable<VisboAudit[]> {
    const url = this.serviceBaseUrl.concat('/audit');
    let params = new HttpParams();

    if (sysadmin) { params = params.append('sysadmin', '1'); }
    if (queryAudit) {
      if (queryAudit.from) { params = params.append('from', queryAudit.from.toISOString()); }
      if (queryAudit.to) { params = params.append('to', queryAudit.to.toISOString()); }
      if (queryAudit.text) { params = params.append('text', queryAudit.text); }
      if (queryAudit.maxcount) { params = params.append('maxcount', queryAudit.maxcount.toString()); }
      if (queryAudit.actionType) { params = params.append('action', queryAudit.actionType); }
      if (queryAudit.area) { params = params.append('area', queryAudit.area); }
    }

    this.log(`Calling HTTP Request: ${url} ${sysadmin ? 'as sysadmin' : ''}`);
    return this.http.get<VisboAuditResponse>(url, { headers , params })
      .pipe(
        map(response => response.audit),
        tap(audit => this.log(`fetched ${audit.length} Audits `)),
        catchError(this.handleError('getVisboAudit', []))
      );
  }

  /** GET VC Audits from the server */
  getVisboCenterAudits(vcid: string, sysadmin?: boolean, deleted?: boolean, queryAudit?: QueryAuditType): Observable<VisboAudit[]> {
    const url = this.serviceBaseUrl.concat('/vc/', vcid, '/audit');
    let params = new HttpParams();

    if (sysadmin) { params = params.append('sysadmin', '1'); }
    if (deleted) { params = params.append('deleted', '1'); }
    if (queryAudit) {
      if (queryAudit.from) { params = params.append('from', queryAudit.from.toISOString()); }
      if (queryAudit.to) { params = params.append('to', queryAudit.to.toISOString()); }
      if (queryAudit.text) { params = params.append('text', queryAudit.text); }
      if (queryAudit.maxcount) { params = params.append('maxcount', queryAudit.maxcount.toString()); }
      if (queryAudit.actionType) { params = params.append('action', queryAudit.actionType); }
      if (queryAudit.area) { params = params.append('area', queryAudit.area); }
    }

    this.log(`Calling HTTP Request: ${url} for VC ${vcid}`);
    return this.http.get<VisboAuditResponse>(url, { headers , params })
      .pipe(
        map(response => response.audit),
        tap(audit => this.log(`fetched ${audit.length} Audits `)),
        catchError(this.handleError('getVisboAudit', []))
      );
  }

  /** GET VP Audits from the server */
  getVisboProjectAudits(vpid: string, sysadmin?: boolean, deleted?: boolean, queryAudit?: QueryAuditType): Observable<VisboAudit[]> {
    const url = this.serviceBaseUrl.concat('/vp/', vpid, '/audit');
    let params = new HttpParams();

    if (sysadmin) { params = params.append('sysadmin', '1'); }
    if (deleted) { params = params.append('deleted', '1'); }
    if (queryAudit) {
      if (queryAudit.from) { params = params.append('from', queryAudit.from.toISOString()); }
      if (queryAudit.to) { params = params.append('to', queryAudit.to.toISOString()); }
      if (queryAudit.text) { params = params.append('text', queryAudit.text); }
      if (queryAudit.maxcount) { params = params.append('maxcount', queryAudit.maxcount.toString()); }
      if (queryAudit.actionType) { params = params.append('action', queryAudit.actionType); }
      if (queryAudit.area) { params = params.append('area', queryAudit.area); }
  }

    this.log(`Calling HTTP Request: ${url} for VP ${vpid}`);
    return this.http.get<VisboAuditResponse>(url, { headers , params })
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

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboAuditService: ' + message);
  }
}
