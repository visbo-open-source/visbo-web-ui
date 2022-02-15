import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboSetting, VisboSettingResponse, VisboSettingListResponse, VisboOrganisation,
        VisboOrgaResponse } from '../_models/visbosetting';

import { MessageService } from './message.service';

@Injectable()
export class VisboSettingService  {

  private vcUrl = this.env.restUrl.concat('/vc');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET VCSettings from the server */
  getVCSettings(vcid: string, sysadmin = false): Observable<VisboSetting[]> {
    const url = `${this.vcUrl}/${vcid}/setting`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} `);
    return this.http.get<VisboSettingListResponse>(url, { headers , params })
      .pipe(
        map(response => response.vcsetting),
        tap(visbosettings => this.log(`fetched ${visbosettings.length} VCSettings `)),
        catchError(this.handleError('getVCSettings', []))
      );
  }

   /** GET VCOrganisatios from the server */
   getVCOrganisations(vcid: string, sysadmin = false, refDate: string = undefined, hierarchy = false, withCapa = false): Observable<VisboOrganisation[]> {
    const url = `${this.vcUrl}/${vcid}/organisation`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (refDate != undefined) {
      params = params.append('refDate', refDate);
    }
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (withCapa) {
      params = params.append('withCapa', '1');
    }
    this.log(`Calling HTTP Request: ${url} ${withCapa}`);
    return this.http.get<VisboOrgaResponse>(url, { headers , params })
      .pipe(
        map(response => response.organisation),
        tap(organisation => this.log(`fetched ${organisation.length} VCOrganisations `)),
        catchError(this.handleError('getVCOrganisations', []))
      );
  }

  /** Create VCOrganisation */
  createVCOrganisation(vcid: string, sysadmin = false, orga: VisboOrganisation): Observable<VisboOrganisation> {
    const url = `${this.vcUrl}/${vcid}/organisation`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
     params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} ${orga.allUnits?.length}`);
    return this.http.post<VisboOrgaResponse>(url, orga, { headers , params })
      .pipe(
        map(response => response.organisation[0]),
        tap(organisation => this.log(`created VCOrganisation with ${organisation.allUnits?.length} items`)),
        catchError(this.handleError<VisboOrganisation>('createVCOrganisation'))
      );
  }

  /** Update VCOrganisation */
  updateVCOrganisation(vcid: string, orgaid: string, sysadmin = false, orga: VisboOrganisation): Observable<VisboOrganisation> {
    const url = `${this.vcUrl}/${vcid}/organisation/${orgaid}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
     params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} ${orga.allUnits?.length}`);
    return this.http.put<VisboOrgaResponse>(url, orga, { headers , params })
      .pipe(
        map(response => response.organisation[0]),
        tap(organisation => this.log(`updated VCOrganisation with ${organisation.allUnits?.length} items`)),
        catchError(this.handleError<VisboOrganisation>('updateVCOrganisation'))
      );
  }

  /** DELETE: delete a Visbo Center Organisation from the server */
  deleteVCOrganisation (orga: VisboOrganisation, vcid: string, sysadmin = false): Observable<VisboOrganisation> {
    const id = orga._id;
    const url = `${this.vcUrl}/${vcid}/setting/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboOrganisation>(url, { headers , params })
      .pipe(
        tap(() => this.log(`deleted VCVisboOrganisation id=${id}`)),
        catchError(this.handleError<VisboOrganisation>('deleteVCVisboOrganisation'))
      );
  }

  /** GET VCSetting by id. Will 404 if id not found */
  getVCSetting(vcid: string, id: string, sysadmin = false): Observable<VisboSetting> {
    const url = `${this.vcUrl}/${vcid}/setting/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboSettingResponse>(url, { headers , params })
      .pipe(
        map(response => response.vcsetting[0]),
        tap(visbosetting => this.log(`fetched VC Setting ${visbosetting.name} id:${id} `)),
        catchError(this.handleError<VisboSetting>(`getVCSetting id:${id}`))
      );
  }

  /** GET VCSetting by type */
  getVCSettingByName(vcid: string, name: string, sysadmin = false): Observable<VisboSetting[]> {
    const url = `${this.vcUrl}/${vcid}/setting?name=${name}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboSettingListResponse>(url, { headers , params })
      .pipe(
        map(response => response.vcsetting),
        tap(visbosettings => this.log(`fetched ${visbosettings.length} VCSettings `)),
        catchError(this.handleError('getVCSettings by Name', []))
      );
  }

  /** GET VCSetting by type */
  getVCSettingByType(vcid: string, type: string, sysadmin = false): Observable<VisboSetting[]> {
    const url = `${this.vcUrl}/${vcid}/setting?type=${type}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
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
  addVCSetting (vcid: string, visbosetting: VisboSetting, sysadmin = false): Observable<VisboSetting> {
    const url = `${this.vcUrl}/${vcid}/setting`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} ${JSON.stringify(visbosetting)}`);

    return this.http.post<VisboSettingResponse>(url, visbosetting, { headers , params })
      .pipe(
        map(response => response.vcsetting[0] ),
        tap(vcsetting => this.log(`added VCSetting ${vcsetting.name} with id=${vcsetting._id}`)),
        catchError(this.handleError<VisboSetting>('addVCSetting'))
      );
  }


  /** DELETE: delete the Visbo Center Setting from the server */
  deleteVCSetting (visbosetting: VisboSetting, sysadmin = false): Observable<VisboSetting> {
    const id = visbosetting._id;
    const url = `${this.vcUrl}/${visbosetting.vcid}/setting/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboSetting>(url, { headers , params })
      .pipe(
        tap(() => this.log(`deleted VCSetting id=${id}`)),
        catchError(this.handleError<VisboSetting>('deleteVCSetting'))
      );
  }

  /** PUT: update the Visbo Center Setting on the server */
  updateVCSetting (vcid: string, visbosetting: VisboSetting, sysadmin = false): Observable<VisboSetting> {
    const id = visbosetting._id;
    const url = `${this.vcUrl}/${vcid}/setting/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboSettingResponse>(url, visbosetting, { headers , params })
      .pipe(
        map(response => response.vcsetting[0] ),
        tap(vcsetting => this.log(`updated VCSetting ${vcsetting.name} with id=${vcsetting._id}`)),
        catchError(this.handleError<VisboSetting>('updateVCSetting'))
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
      // return new ErrorObservable(error);
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboSettingService: ' + message);
  }
}
