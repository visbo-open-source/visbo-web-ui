import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboSetting, VisboSettingResponse, VisboSettingListResponse } from '../_models/visbosetting';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboSettingService  {
  private vcUrl = environment.restUrl.concat('/vc');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET VCSettings from the server */
  getVCSettings(vcid: number, sysadmin: boolean = false): Observable<VisboSetting[]> {
    var url = `${this.vcUrl}/${vcid}/setting`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');

    this.log(`Calling HTTP Request: ${url} `);
    return this.http.get<VisboSettingListResponse>(url, { headers , params })
      .pipe(
        map(response => response.vcsetting),
        tap(visbosettings => this.log(`fetched ${visbosettings.length} VCSettings `)),
        catchError(this.handleError('getVCSettings', []))
      );
  }

  /** GET VCSetting by id. Will 404 if id not found */
  getVCSetting(vcid: number, id: string, sysadmin: boolean = false): Observable<VisboSetting> {
    var url = `${this.vcUrl}/${vcid}/setting/${id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboSettingResponse>(url, { headers , params })
      .pipe(
        map(response => {
                  return response.vcsetting[0]
                }),
        tap(visbosetting => this.log(`fetched VC Setting ${visbosetting.name} id:${id} `)),
        catchError(this.handleError<VisboSetting>(`getVCSetting id:${id}`))
      );
  }

  /** GET VCSetting by type */
  getVCSettingByName(vcid: number, name: string, sysadmin: boolean = false): Observable<VisboSetting[]> {
    var url = `${this.vcUrl}/${vcid}/setting?name=${name}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboSettingListResponse>(url, { headers , params })
      .pipe(
        map(response => response.vcsetting),
        tap(visbosettings => this.log(`fetched ${visbosettings.length} VCSettings `)),
        catchError(this.handleError('getVCSettings by Name', []))
      );
  }

  /** GET VCSetting by type */
  getVCSettingByType(vcid: number, type: string, sysadmin: boolean = false): Observable<VisboSetting[]> {
    var url = `${this.vcUrl}/${vcid}/setting?type=${type}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboSettingListResponse>(url, { headers , params })
      .pipe(
        map(response => response.vcsetting),
        tap(visbosettings => this.log(`fetched ${visbosettings.length} VCSettings `)),
        catchError(this.handleError('getVCSettings by Type', []))
      );
  }

  //////// Save methods //////////

  /** POST: a new Visbo Center Setting to the server */
  addVCSetting (vcid: number, visbosetting: VisboSetting, sysadmin: boolean = false): Observable<VisboSetting> {
    var url = `${this.vcUrl}/${vcid}/setting`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');

    this.log(`Calling HTTP Request: ${url} ${JSON.stringify(visbosetting)}`);
    var url = this.vcUrl + '?sysadmin=1'

    return this.http.post<VisboSettingResponse>(url, visbosetting, { headers , params })
      .pipe(
        map(response => response.vcsetting[0] ),
        tap(vcsetting => this.log(`added VCSetting ${vcsetting.name} with id=${vcsetting._id}`)),
        catchError(this.handleError<VisboSetting>('addVCSetting'))
      );
  }


  /** DELETE: delete the Visbo Center Setting from the server */
  deleteVCSetting (vcid: number, visbosetting: VisboSetting, sysadmin: boolean = false): Observable<any> {
    //const id = typeof visbosetting === 'number' ? visbosetting : visbosetting._id;
    const id = visbosetting._id;
    var url = `${this.vcUrl}/${vcid}/setting/${id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');

    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboSetting>(url, { headers , params })
      .pipe(
        tap(response => this.log(`deleted VCSetting id=${id}`)),
        catchError(this.handleError<VisboSetting>('deleteVCSetting'))
      );
  }

  /** PUT: update the Visbo Center Setting on the server */
  updateVCSetting (vcid: number, visbosetting: VisboSetting, sysadmin: boolean = false): Observable<VisboSetting> {
    const id = visbosetting._id;
    var url = `${this.vcUrl}/${vcid}/setting/${id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) params = params.append('sysadmin', '1');
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboSettingResponse>(url, visbosetting, { headers , params })
      .pipe(
        map(response => response.vcsetting[0] ),
        tap(vcsetting => this.log(`updated VCSetting ${vcsetting.name} with id=${vcsetting._id}`)),
        catchError(this.handleError<any>('updateVCSetting'))
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
    this.messageService.add('VisboSettingService: ' + message);
  }
}
