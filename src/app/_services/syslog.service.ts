import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboFile, VisboFilesResponse, VisboDownloadResponse } from '../_models/visbofiles';

import { MessageService } from './message.service';

@Injectable()
export class SysLogService {

  private serviceUrl = this.env.restUrl.concat('/syslog');  // URL to ReST api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET List of Logs from the server */
  getSysLogs(ageDays: number): Observable<VisboFile[]> {
    const url = this.serviceUrl;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    params = params.append('ageDays', ageDays.toString());

    this.log(`Calling HTTP Request: ${url}`);
    return this.http.get<VisboFilesResponse>(url, { headers , params })
      .pipe(
        map(response => response.files),
        tap(files => this.log(`fetched ${files.length} Log Files `)),
        catchError(this.handleError<VisboFile[]>('getSysLog'))
      );
  }

  // /** GET Log File by name. Return 403 when name not found */
  // eslint-disable-next-line
  getSysLog(folder: string, name: string): Observable<any> {
    const url = `${this.serviceUrl}/file/${folder}/${name}`;

    this.log(`Calling HTTP Request for a specific log file: ${url}`);
    // const options = {
    //   observe: 'body',
    //   responseType: 'text'
    // };
    // eslint-disable-next-line
    let options: any = undefined;
    options = {};
    options.observe = 'body';
    options.responseType = 'text';
    // options.headers = 'XXX'
    return this.http.get<VisboDownloadResponse>(url, options)
      .pipe(
        tap(
          () => this.log(`fetched Log File Response `)
        ),
        // eslint-disable-next-line
        catchError(this.handleError<any>(`getSysLog name:${name} `))
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
   };
 }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboLogsService: ' + message);
  }
}
