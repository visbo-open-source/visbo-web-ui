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
  // The getVCSettings method is responsible for retrieving configuration settings (VCSettings) for a specific Visbo Center (VC). 
  // It supports retrieving settings as a system administrator by including the sysadmin flag.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center for which settings are being requested.
  //    sysadmin: boolean (default: false):  If true, requests settings with system administrator privileges.
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
  // The getVCOrganisations method is responsible for retrieving organization data (VCOrganisations) for a specific Visbo Center (VC). 
  // It supports optional parameters for system administrator access, filtering by a reference date, as hierarchical structure, and/or including  capa information.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center for which organization data is being requested.
  //    sysadmin: boolean (default: false):  If true, requests organization data with system administrator privileges.
  //    refDate: string (optional):          A reference date in ISO string format to filter the organization data.
  //    hierarchy: boolean (default: false): If true, includes hierarchical data in the response.
  //    withCapa: boolean (default: false):  If true, includes capacity-related data in the response.
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
  // The createVCOrganisation method is responsible for creating a new organization (VCOrganisation) within a specific Visbo Center (VC). 
  // It allows for system administrator access and logs the amount of units of the organization being created.
  // Parameters:
  //    vcid: string:                         The ID of the Visbo Center where the new organization is to be created.
  //    sysadmin: boolean (default: false):   If true, the request will be executed with system administrator privileges.
  //    orga: VisboOrganisation:              An object containing the organizational data to be created, including all units and their configurations.
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
  // The updateVCOrganisation method is responsible for updating an existing organization (VCOrganisation) within a specific Visbo Center (VC). 
  // It supports system administrator access and logs the size of the organization being updated.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center where the organization is located.
  //    orgaid: string:                      The ID of the organization to be updated.
  //    sysadmin: boolean (default: false):  If true, the request will be executed with system administrator privileges.
  //    orga: VisboOrganisation:             An object containing the updated organizational data, including all units and their configurations.
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
  // The deleteVCOrganisation method is responsible for deleting an existing organization (VCOrganisation) within a specific Visbo Center (VC). 
  // It supports system administrator access and ensures proper logging of the deletion process.
  // Parameters:
  //    orga: VisboOrganisation:            The organization object to be deleted, containing the _id of the organization.
  //    vcid: string:                       The ID of the Visbo Center where the organization is located.
  //    sysadmin: boolean (default: false): If true, the request will be executed with system administrator privileges.
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
  // The getVCSetting method is responsible for retrieving a specific configuration setting (VCSetting) from a particular Visbo Center (VC). 
  // It supports system administrator access and provides detailed logging of the retrieval process.
  // Parameters:
  //    vcid: string:                       The ID of the Visbo Center where the setting is located.
  //    id: string:                         The ID of the specific setting to retrieve.
  //    sysadmin: boolean (default: false): If true, the request will be executed with system administrator privileges.
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
  // The getVCSettingByName method is responsible for retrieving configuration settings (VCSettings) by name from a specific Visbo Center (VC). 
  // It allows for system administrator access and logs the retrieval process.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center where the settings are located.
  //    name: string:                        The name of the specific setting(s) to retrieve.
  //    sysadmin: boolean (default: false):  If true, the request will be executed with system administrator privileges.
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
  // The getVCSettingByType method is responsible for retrieving configuration settings (VCSettings) by type from a specific Visbo Center (VC). 
  // It allows for system administrator access and logs the retrieval process.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center where the settings are located.
  //    type: string:                        The type of the specific setting(s) to retrieve.
  //    sysadmin: boolean (default: false):  If true, the request will be executed with system administrator privileges.
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
  // The addVCSetting method is responsible for adding a new configuration setting (VCSetting) to a specific Visbo Center (VC). 
  // It supports system administrator access and logs the addition process.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center where the setting is to be added.
  //    visbosetting: VisboSetting:          The setting object containing all necessary configuration data to be added to the Visbo Center.
  //    sysadmin: boolean (default: false):  If true, the request will be executed with system administrator privileges.
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
  // The deleteVCSetting method is responsible for deleting an existing configuration setting (VCSetting) from a specific Visbo Center (VC). 
  // It supports system administrator access and provides detailed logging of the deletion process.
  // Parameters:
  //    visbosetting: VisboSetting:          The setting object to be deleted, containing both the _id of the setting and the vcid of the Visbo Center.
  //    sysadmin: boolean (default: false):  If true, the request will be executed with system administrator privileges.
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
  // The updateVCSetting method is responsible for updating an existing configuration setting (VCSetting) within a specific Visbo Center (VC). 
  // It supports system administrator access and logs the update process.
  // Parameters:
  //    vcid: string:                        The ID of the Visbo Center where the setting is located.
  //    visbosetting: VisboSetting:          The updated setting object containing the setting's _id and the new configuration data.
  //    sysadmin: boolean (default: false):  If true, the request will be executed with system administrator privileges.
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
