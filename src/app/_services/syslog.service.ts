import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboFile, VisboFilesResponse, VisboDownloadResponse } from '../_models/visbofiles';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class SysLogService {

  private serviceUrl = environment.restUrl.concat('/syslog');  // URL to ReST api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET List of Logs from the server */
  getSysLogs(): Observable<VisboFile[]> {
    var url = this.serviceUrl

    this.log(`Calling HTTP Request: ${url} `);
    return this.http.get<VisboFilesResponse>(url, httpOptions)
      .pipe(
        map(response => response.files),
        tap(files => this.log(`fetched ${files.length} Log Files `)),
        catchError(this.handleError('getSysLog', []))
      );
  }

  // /** GET Log File by name. Return 403 when name not found */
  getSysLog(name: string): Observable<any> {
    var url = `${this.serviceUrl}/file/${name}`;
    this.log(`Calling HTTP Request for a specific log file: ${url}`);
    var options: any = {};
    options.observe = 'body';
    options.responseType = 'text';
    // options.headers = 'XXX'
    return this.http.get<VisboDownloadResponse>(url, options)
      .pipe(
        tap( data => this.log(`fetched Log File Response `)),
        // map(data => this.log(`fetched Log File Response ${JSON.stringify(data)}`)),
        // tap(stream => this.log(`fetched Log File`)),
        catchError(this.handleError<VisboFile>(`getSysLog name:${name} `))
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
   };
 }

  /** Log a VisboLogsService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboLogsService: ' + message);
  }
}
