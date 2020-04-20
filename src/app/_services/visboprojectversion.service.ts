import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

// import { VisboCenter } from '../_models/visbocenter';
import { VisboProjectVersion, VisboProjectVersionResponse, VPVKeyMetrics, VPVKeyMetricsCalc } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VisboPortfolioVersionResponse } from '../_models/visboportfolioversion';

import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboProjectVersionService {

  private vpvUrl = this.env.restUrl.concat('/vpv'); // URL to web api
  private vpfUrl = this.env.restUrl.concat('/vp'); // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET VisboProjectVersions from the server if id is specified get only projects of this vpid*/
  getVisboProjectVersions(id: string, deleted?: boolean, variantName?: string, keyMetrics?: boolean): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (id) {
      params = params.append('vpid', id);
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    if (variantName !== undefined) {
      params = params.append('variantName', variantName);
    }
    if (keyMetrics) {
      params = params.append('keyMetrics', '1');
    }

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(this.vpvUrl, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(visboprojectversions => this.log(`fetched ${visboprojectversions.length} VisboProjectVersions `)),
        catchError(this.handleError('getVisboProjectVersions', []))
      );
  }

  /** GET VisboProjectVersion by id. Will 404 if id not found */
  getVisboProjectVersion(id: string, deleted: boolean = false): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request for a specific entry: ${url} Params ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => {
                  // TODO: is there a better way to transfer the perm?
                  response.vpv[0].perm = response.perm;
                  return response.vpv[0];
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
    let newVPV: VisboProjectVersion;
    newVPV = new VisboProjectVersion();
    newVPV.name = visboprojectversion.name;
    return this.http.post<VisboProjectVersion>(this.vpvUrl, visboprojectversion, httpOptions)
      .pipe(
        map(response => JSON.parse(JSON.stringify(response)).vpv ),
        tap((resultVersion: VisboProjectVersion) => this.log(`added VisboProjectVersion w/ id=${resultVersion._id}`)),
        catchError(this.handleError<VisboProjectVersion>('addVisboProjectVersion'))
      );
  }

  /** DELETE: delete the Visbo Project from the server */
  deleteVisboProjectVersion (visboprojectversion: VisboProjectVersion, deleted: boolean = false): Observable<VisboProjectVersion> {
    const id = visboprojectversion._id;
    const url = `${this.vpvUrl}/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request Delete: ${url} Params ${params}`);

    return this.http.delete<VisboProjectVersion>(url, { headers , params }).pipe(
      tap(_ => this.log(`deleted VisboProjectVersion id=${id}`)),
      catchError(this.handleError<VisboProjectVersion>('deleteVisboProjectVersion'))
    );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProjectVersion (visboprojectversion: VisboProjectVersion, deleted: boolean = false): Observable<any> {
    const url = `${this.vpvUrl}/${visboprojectversion._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request PUT: ${url} Params ${params}`);
    return this.http.put(url, visboprojectversion, { headers , params })
      .pipe(
        tap(_ => this.log(`updated VisboProjectVersion id=${visboprojectversion._id} url=${this.vpvUrl}`)),
        catchError(this.handleError<any>('updateVisboProjectVersion'))
      );
  }

  /** GET getVisboPortfolioVersions from the server if id is specified get only projects of this vpid*/
  getVisboPortfolioVersions(id: string, deleted: boolean = false): Observable<VisboPortfolioVersion[]> {
    const url = `${this.vpfUrl}/${id}/portfolio`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboPortfolioVersionResponse>(url, { headers , params })
      .pipe(
        map(response => {
                  // TODO: is there a better way to transfer the perm?
                  response.vpf[0].perm = response.perm;
                  return response.vpf;
                }),
        tap(visboportfolioversion => this.log(`fetched ${visboportfolioversion.length} VisboPortfolioVersion `)),
        catchError(this.handleError('getVisboPortfolioVersions', []))
      );
  }

  /** GET getVisboPortfolioVersions from the server if id is specified get only projects of this vpid*/
  getVisboPortfolioKeyMetrics(id: string, refDate: Date = new Date(), deleted: boolean = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    params = params.append('vpfid', id);
    params = params.append('refDate', refDate.toISOString());
    params = params.append('keyMetrics', '1');
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(vpv => this.log(`fetched ${vpv.length} VisboPortfolio Project Versions `)),
        catchError(this.handleError('getVisboPortfoliokeyMetrics', []))
      );
  }

  /** GET getVisboCenterProjectVersions for all projects of a specific VC */
  getVisboCenterProjectVersions(id: string, refDate: Date = new Date(), deleted: boolean = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    params = params.append('vcid', id);
    params = params.append('refDate', refDate.toISOString());
    params = params.append('keyMetrics', '1');
    params = params.append('variantName', '');

    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(vpv => this.log(`fetched ${vpv.length} VisboCenter Project Versions `)),
        catchError(this.handleError('getVisboCenterProjectkeyMetrics', []))
      );
  }

  /** GET VisboProjectVersion by id. Will 404 if id not found */
  getVisboPortfolioVersion(id: string, deleted: boolean = false): Observable<VisboPortfolioVersion> {
    const url = `${this.vpfUrl}/${id}/portfolio`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request for a specific entry: ${url} Params ${params}`);
    return this.http.get<VisboPortfolioVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpf[0]),
        tap(visboportfolioversion => this.log(`fetched Specific Portfolio Version `)),
        catchError(this.handleError<VisboPortfolioVersion>(`getVisboPortfolioVersion id=${id}`))
      );
  }

  /** GET CostCalculation from the server for the specified vpv id */
  getCost(id: string): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/cost`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(visboprojectversions => this.log(`fetched CostCalc for ${id}`)),
        catchError(this.handleError('getVisboProjectVersions', []))
      );
  }

  /** GET CostCalculation from the server for the specified vpv id */
  getDelivery(id: string, ref: string): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/delivery`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (ref) {
      params = params.append('ref', ref);
    }
    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(visboprojectversions => this.log(`fetched DeliveryCalc for ${id}`)),
        catchError(this.handleError('getVisboProjectVersions', []))
      );
  }

   /** GET Deadline Calculation from the server for the specified vpv id */
   getDeadline(id: string, ref: string): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/deadline`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (ref) {
      params = params.append('ref', ref);
    }

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(visboprojectversions => this.log(`fetched DeadlineCalc for ${id}`)),
        catchError(this.handleError('getVisboProjectVersions', []))
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
