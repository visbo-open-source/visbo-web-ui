import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { AuthenticationService } from './authentication.service'

import { environment } from '../../environments/environment';

// import { VisboCenter } from '../_models/visbocenter';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectVersionResponse } from '../_models/visboprojectversion';

import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboProjectVersionService {

  //   private vpvUrl = 'projects';  // URL to web api on same server
  private vpvUrl = environment.restUrl.concat('/vpv'); // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private authenticationService: AuthenticationService ) { }


  /** GET VisboProjectVersions from the server if id is specified get only projects of this vpid*/
  getVisboProjectVersions(id: string, deleted: boolean = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (id) params = params.append('vpid', id);
    if (deleted) params = params.append('deleted', '1');

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(this.vpvUrl, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(visboprojectversions => this.log(`fetched ${visboprojectversions.length} VisboProjectVersions `)),
        catchError(this.handleError('getVisboProjectVersions', []))
      );
  }

  /** GET VisboProjectVersion by id. Return `undefined` when id not found */
  /** Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
  // getVisboProjectVersionNo404<Data>(id: string): Observable<VisboProjectVersion> {
  //   const url = `${this.vpvUrl}/?id=${id}`;
  //   this.log(`Calling HTTP Request: ${this.vpvUrl}`);
  //   return this.http.get<VisboProjectVersion[]>(url)
  //     .pipe(
  //       map(visboprojects => visboprojects[0]), // returns a {0|1} element array
  //       tap(h => {
  //         const outcome = h ? `fetched` : `did not find`;
  //         this.log(`${outcome} VisboProjectVersion id=${id}`);
  //       }),
  //       catchError(this.handleError<VisboProjectVersion>(`getVisboProjectVersion id=${id}`))
  //     );
  // }

  /** GET VisboProjectVersion by id. Will 404 if id not found */
  getVisboProjectVersion(id: string, deleted: boolean = false): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${id}`; 
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) params = params.append('deleted', '1');
    this.log(`Calling HTTP Request for a specific entry: ${url} Params ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => {
                  // TODO: is there a better way to transfer the perm?
                  response.vpv[0].perm = response.perm;
                  return response.vpv[0]
                }),
        tap(visboprojectversion => this.log(`fetched Specific Version `)),
        catchError(this.handleError<VisboProjectVersion>(`getVisboProjectVersion id=${id}`))
      );
  }

  /* GET VisboProjectVersions whose name contains search term */
  // searchVisboProjectVersions(term: string): Observable<VisboProjectVersion[]> {
  //   if (!term.trim()) {
  //     // if not search term, return empty visboprojectversion array.
  //     return of([]);
  //   }
  //   return this.http.get<VisboProjectVersion[]>(`api/visboprojects?name=${term}`).pipe(
  //     tap(_ => this.log(`found VisboProjectVersions matching "${term}"`)),
  //     catchError(this.handleError<VisboProjectVersion[]>('searchVisboProjectVersions', []))
  //   );
  // }

  //////// Save methods //////////

  /** POST: add a new Visbo Project to the server */
  addVisboProjectVersion (visboprojectversion: VisboProjectVersion): Observable<VisboProjectVersion> {
    var newVPV = new VisboProjectVersion();
    newVPV.name = visboprojectversion.name;
    return this.http.post<VisboProjectVersion>(this.vpvUrl, visboprojectversion, httpOptions)
      .pipe(
        map(response => { return JSON.parse(JSON.stringify(response)).vpv }),
        tap((visboprojectversion: VisboProjectVersion) => this.log(`added VisboProjectVersion w/ id=${visboprojectversion._id}`)),
        catchError(this.handleError<VisboProjectVersion>('addVisboProjectVersion'))
      );
  }

  /** DELETE: delete the Visbo Project from the server */
  deleteVisboProjectVersion (visboprojectversion: VisboProjectVersion, deleted: boolean = false): Observable<VisboProjectVersion> {
    //const id = typeof visboprojectversion === 'number' ? visboprojectversion : visboprojectversion._id;
    const id = visboprojectversion._id;
    const url = `${this.vpvUrl}/${id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) params = params.append('deleted', '1');
    this.log(`Calling HTTP Request Delete: ${url} Params ${params}`);

    return this.http.delete<VisboProjectVersion>(url, { headers , params }).pipe(
      tap(_ => this.log(`deleted VisboProjectVersion id=${id}`)),
      catchError(this.handleError<VisboProjectVersion>('deleteVisboProjectVersion'))
    );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProjectVersion (visboprojectversion: VisboProjectVersion, deleted: boolean = false): Observable<any> {
    const url = `${this.vpvUrl}/${visboprojectversion._id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) params = params.append('deleted', '1');
    this.log(`Calling HTTP Request PUT: ${url} Params ${params}`);
    return this.http.put(url, visboprojectversion, { headers , params })
      .pipe(
        tap(_ => this.log(`updated VisboProjectVersion id=${visboprojectversion._id} url=${this.vpvUrl}`)),
        catchError(this.handleError<any>('updateVisboProjectVersion'))
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

      // send the error to remote logging infrastructure
      this.log(`HTTP Request ${operation} failed: ${error.message} ${error.status}`);

      // better job of transforming error for user consumption

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectVersionService: ' + message);
  }
}
