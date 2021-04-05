import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

// import { VisboCenter } from '../_models/visbocenter';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion, VisboProjectVersionResponse } from '../_models/visboprojectversion';
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
  getVisboProjectVersions(id: string, deleted?: boolean, variantID?: string, keyMetrics?: number): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (id) {
      params = params.append('vpid', id);
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    if (variantID !== undefined) {
      params = params.append('variantID', variantID);
    }
    if (keyMetrics) {
      params = params.append('keyMetrics', keyMetrics.toString());
    }

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(this.vpvUrl, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(visboprojectversions => this.log(`fetched ${visboprojectversions.length} VisboProjectVersions `)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
      );
  }

  /** GET VisboProjectVersion by id. Will 404 if id not found */
  getVisboProjectVersion(id: string, deleted = false): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request for a specific entry: ${url} Params ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(
          response => {
            // TODO: is there a better way to transfer the perm?
            response.vpv[0].perm = response.perm;
            return response.vpv[0];
          }),
        tap(
          () => this.log(`fetched Specific Version `)
        ),
        catchError(this.handleError<VisboProjectVersion>(`getVisboProjectVersion id=${id}`))
      );
  }

  /** POST: add a new Visbo Project to the server */
  addVisboProjectVersion (visboprojectversion: VisboProjectVersion): Observable<VisboProjectVersion> {
    const newVPV = new VisboProjectVersion();
    newVPV.name = visboprojectversion.name;
    return this.http.post<VisboProjectVersion>(this.vpvUrl, visboprojectversion, httpOptions)
      .pipe(
        map(response => JSON.parse(JSON.stringify(response)).vpv ),
        tap((resultVersion: VisboProjectVersion) => this.log(`added VisboProjectVersion w/ id=${resultVersion._id}`)),
        catchError(this.handleError<VisboProjectVersion>('addVisboProjectVersion'))
      );
  }

  /** DELETE: delete the Visbo Project from the server */
  deleteVisboProjectVersion (visboprojectversion: VisboProjectVersion, deleted = false): Observable<VisboProjectVersion> {
    const id = visboprojectversion._id;
    const url = `${this.vpvUrl}/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request Delete: ${url} Params ${params}`);

    return this.http.delete<VisboProjectVersion>(url, { headers , params }).pipe(
      tap(() => this.log(`deleted VisboProjectVersion id=${id}`)),
      catchError(this.handleError<VisboProjectVersion>('deleteVisboProjectVersion'))
    );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProjectVersion (visboprojectversion: VisboProjectVersion, deleted = false): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${visboprojectversion._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request PUT: ${url} Params ${params}`);
    return this.http.put<VisboProjectVersionResponse>(url, visboprojectversion, { headers , params })
      .pipe(
        map(result => result.vpv[0]),
        tap(() => this.log(`updated VisboProjectVersion id=${visboprojectversion._id} url=${this.vpvUrl}`)),
        catchError(this.handleError<VisboProjectVersion>('updateVisboProjectVersion'))
      );
  }

  /** GET getVisboPortfolioVersions from the server if id is specified get only projects of this vpid*/
  getVisboPortfolioVersions(id: string, deleted = false): Observable<VisboPortfolioVersion[]> {
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
                  if (response.vpf && response.vpf.length > 0) {
                    response.vpf[0].perm = response.perm;
                  }
                  return response.vpf;
                }),
        tap(visboportfolioversion => this.log(`fetched ${visboportfolioversion.length} VisboPortfolioVersion `)),
        catchError(this.handleError<VisboPortfolioVersion[]>('getVisboPortfolioVersions'))
      );
  }

  /** POST: add a new Visbo Portfolio Version to the server */
  addVisboPortfolioVersion(vp: VisboProject, vpf: VisboPortfolioVersion): Observable<VisboPortfolioVersion> {
    const url = `${this.vpfUrl}/${vp._id}/portfolio`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();
    return this.http.post<VisboPortfolioVersionResponse>(url, vpf, { headers , params })
      .pipe(
        map(response => response.vpf[0]),
        tap(vpf => this.log(`added VisboPortfolioVersion w/ id=${vpf._id}`)),
        catchError(this.handleError<VisboPortfolioVersion>('addVisboPortfolioVersion'))
      );
  }

  /** PUT: update a Visbo Portfolio Version to the server */
  updateVisboPortfolioVersion(vp: VisboProject, vpf: VisboPortfolioVersion): Observable<VisboPortfolioVersion> {
    const url = `${this.vpfUrl}/${vp._id}/portfolio/${vpf._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();
    return this.http.put<VisboPortfolioVersionResponse>(url, vpf, { headers , params })
      .pipe(
        map(response => response.vpf[0]),
        tap(vpf => this.log(`updated VisboPortfolioVersion w/ id=${vpf._id}`)),
        catchError(this.handleError<VisboPortfolioVersion>('updateVisboPortfolioVersion'))
      );
  }

  /** DELETE: delete VISBO Portfolio Version from the server */
  deleteVisboPortfolioVersion (vpf: VisboPortfolioVersion, deleted = false): Observable<VisboPortfolioVersion> {
    const id = vpf._id;
    const vpid = vpf.vpid;
    const url = `${this.vpfUrl}/${vpid}/portfolio/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request Delete: ${url} Params ${params}`);

    return this.http.delete<VisboPortfolioVersion>(url, { headers , params }).pipe(
      tap(() => this.log(`deleted VisboPortfolioVersion id=${id}`)),
      catchError(this.handleError<VisboPortfolioVersion>('deleteVisboPortfolioVersion'))
    );
  }

  /** GET getVisboPortfolioVersions from the server if id is specified get only projects of this vpid*/
  getVisboPortfolioKeyMetrics(id: string, refDate: Date = new Date(), deleted = false): Observable<VisboProjectVersion[]> {
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
        catchError(this.handleError<VisboProjectVersion[]>('getVisboPortfoliokeyMetrics'))
      );
  }

  /** GET getVisboCenterProjectVersions for all projects of a specific VC */
  getVisboCenterProjectVersions(id: string, refDate: Date = new Date(), deleted = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    params = params.append('vcid', id);
    params = params.append('refDate', refDate.toISOString());
    params = params.append('keyMetrics', '1');
    params = params.append('variantID', '');

    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(vpv => this.log(`fetched ${vpv.length} VisboCenter Project Versions `)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboCenterProjectkeyMetrics'))
      );
  }

  /** GET VisboProjectVersion by id. Will 404 if id not found */
  getVisboPortfolioVersion(id: string, deleted = false): Observable<VisboPortfolioVersion> {
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
        tap(() => this.log(`fetched Specific Portfolio Version `)),
        catchError(this.handleError<VisboPortfolioVersion>(`getVisboPortfolioVersion id=${id}`))
      );
  }

  /** GET Capacity Calculation from the server for the specified vpv id */
  getCapacity(id: string, roleID: string, hierarchy = false, pfv = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/capacity`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (pfv) {
      params = params.append('pfv', '1');
    }
    if (roleID) {
      this.log(`Calling RoleID: ${roleID}`);
      params = params.append('roleID', roleID);
    }

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(() => this.log(`fetched Capacity Calculation for ${id}`)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
      );
  }

  /** GET Cost Calculation from the server for the specified vpv id */
  getCost(id: string): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/cost`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(() => this.log(`fetched Cost Calc for ${id}`)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
      );
  }

  /** GET Delivery Calculation from the server for the specified vpv id */
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
        tap(() => this.log(`fetched Delivery Calc for ${id}`)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
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
        tap(() => this.log(`fetched Deadline Calc for ${id}`)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
      );
  }

  /** POST: move & scale a Visbo Project Version with copy */
  changeVisboProjectVersion(vpvid: string, startDate?: Date, endDate?: Date, scaleFactor = 1, scaleStart?: Date): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${vpvid}/copy`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (scaleFactor != 1) {
      params = params.append('scaleFactor', scaleFactor.toString());
    }

    const newVPV = new VisboProjectVersion();
    newVPV.startDate = startDate;
    newVPV.endDate = endDate;
    newVPV.actualDataUntil = scaleStart

    return this.http.post<VisboProjectVersionResponse>(url, newVPV, { headers , params })
      .pipe(
        map(response => response.vpv[0]),
        tap(vpv => this.log(`moved & scaled VisboProjectVersion w/ id=${vpv._id}`)),
        catchError(this.handleError<VisboProjectVersion>('changeVisboProjectVersion'))
      );
  }

  /** POST: copy a Visbo Project Version */
  copyVisboProjectVersion(vpvid: string, variantName: string): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${vpvid}/copy`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();

    const newVPV = new VisboProjectVersion();
    newVPV.variantName = variantName;
    return this.http.post<VisboProjectVersionResponse>(url, newVPV, { headers , params })
      .pipe(
        map(response => response.vpv[0]),
        tap(vpv => this.log(`copied VisboProjectVersion w/ id=${vpv._id}`)),
        catchError(this.handleError<VisboProjectVersion>('copyVisboProjectVersion'))
      );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation') {
    // eslint-disable-next-line
    return (error: any): Observable<T> => {

      // send the error to remote logging infrastructure
      console.log(`HTTP Request ${operation} failed: ${error.message} ${error.status}`);

      // better job of transforming error for user consumption

      return throwError(error)
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectVersionService: ' + message);
  }
}
