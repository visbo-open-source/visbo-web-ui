import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboAudit, VisboAuditResponse, QueryAuditType } from '../_models/visboaudit';

import { MessageService } from './message.service';

const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

/* VisboAuditService Class Overview:
   The VisboAuditService class provides methods for retrieving audit records from the VISBO system. 
   It supports fetching general audits, version control (VC) audits, and project (VP) audits 
   while allowing filtering based on parameters such as date range, action type, and search text.
 */
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
  // Fetches audit records from the system.
  // Parameters:
  //    sysadmin:   A boolean indicating whether to fetch admin-related audits.
  //    queryAudit: A QueryAuditType object containing filters (date range, action type, text, etc.).
  // Returns:
  //    An Observable<VisboAudit[]> containing the retrieved audit records.
  // Process:
  //    Constructs the API request with query parameters.
  //    Logs the request.
  //    Maps the response to extract audit records.
  //    Catches and handles errors.
    const url = this.serviceBaseUrl.concat('/audit');
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (queryAudit) {
      if (queryAudit.from) {
        params = params.append('from', queryAudit.from.toISOString());
      }
      if (queryAudit.to) {
        params = params.append('to', queryAudit.to.toISOString());
      }
      if (queryAudit.text) {
        params = params.append('text', queryAudit.text);
      }
      if (queryAudit.maxcount) {
        params = params.append('maxcount', queryAudit.maxcount.toString());
      }
      if (queryAudit.actionType) {
        params = params.append('action', queryAudit.actionType);
      }
      if (queryAudit.area) {
        params = params.append('area', queryAudit.area);
      }
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
  // Fetches Visbo Center (VC) audits.
  // Parameters:
  //    vcid:       The ID of the Visbo Center system.
  //    sysadmin:   A boolean indicating admin access.
  //    deleted:    A boolean indicating whether to fetch deleted records.
  //    queryAudit: A QueryAuditType object containing filters.
  // Returns:
  //    An Observable<VisboAudit[]> containing the retrieved audit records.
  // Process:
  //    Constructs the API request URL dynamically.
  //    Logs the request.
  //    Maps the response to extract audits.
  //    Catches and handles errors.
    const url = this.serviceBaseUrl.concat('/vc/', vcid, '/audit');
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    if (queryAudit) {
      if (queryAudit.from) {
        params = params.append('from', queryAudit.from.toISOString());
      }
      if (queryAudit.to) {
        params = params.append('to', queryAudit.to.toISOString());
      }
      if (queryAudit.text) {
        params = params.append('text', queryAudit.text);
      }
      if (queryAudit.maxcount) {
        params = params.append('maxcount', queryAudit.maxcount.toString());
      }
      if (queryAudit.actionType) {
        params = params.append('action', queryAudit.actionType);
      }
      if (queryAudit.area) {
        params = params.append('area', queryAudit.area);
      }
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
  // Fetches project (VP) audits.
  // Parameters:
  //    vpid:       The project ID.
  //    sysadmin:   A boolean indicating admin access.
  //    deleted:    A boolean indicating whether to fetch deleted records.
  //    queryAudit: A QueryAuditType object containing filters.
  // Returns:
  //    An Observable<VisboAudit[]> containing the retrieved audit records.
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
   * Returns:
   *    An observable that either returns an empty result or throws the error.
   */
  private handleError<T> (operation = 'operation', result?: T) {
    // eslint-disable-next-line
    return (error: any): Observable<T> => {

      this.log(`HTTP Request ${operation} failed: ${error.error.message} status:${error.status} result: ${JSON.stringify(result)}`);

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
