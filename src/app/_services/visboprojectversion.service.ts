import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

// import { VisboCenter } from '../_models/visbocenter';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectVersion, VisboProjectVersionResponse } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VisboPortfolioVersionResponse } from '../_models/visboportfolio';

import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboProjectVersionService {

  private vpvUrl = this.env.restUrl.concat('/vpv'); // URL to web api
  private vpfUrl = this.env.restUrl.concat('/vp');  // URL to web api
  private openProjURL = this.env.openProjUrl;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET VisboProjectVersions from the server if id is specified get only projects of this vpid*/
  // The getVisboProjectVersions method is responsible for retrieving a list of project versions associated with a specific Visbo project (VP). 
  // It supports optional filters such as deleted versions, specific variants, key metrics, and extended data (longList).
  // Parameters:
  //    id: string:                         The ID of the Visbo project for which project versions are being requested.
  //    deleted: boolean (optional):        If true, includes project versions that are marked as deleted.
  //    variantID: string (optional):       Filters project versions by a specific variant ID.
  //    keyMetrics: number (optional):      Retrieves specific key metrics associated with the project versions.
  //    longList: boolean (default: false): If true, requests a more detailed list of project versions.
  getVisboProjectVersions(id: string, deleted?: boolean, variantID?: string, keyMetrics?: number, longList: boolean = false): Observable<VisboProjectVersion[]> {
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
    if (longList) {
      params = params.append('longList', '1');
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
// The getVisboProjectVersion method is responsible for retrieving a specific project version by its ID from a Visbo project (VP). 
// It also supports the option to include deleted project versions.
// Parameters:
//    id: string:                        The ID of the project version to retrieve.
//    deleted: boolean (default: false): If true, includes project versions that are marked as deleted in the request.
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
  // The addVisboProjectVersion method is responsible for creating a new version within a Visbo project (VP). 
  // It sends a POST request to the server with the project version data and returns the created version as an observable.
  // Parameters:
  //    visboprojectversion: VisboProjectVersion: The VisboProjectVersion object containing the details of the project version to be created.
  //        - The object should include properties such as name, description, and any specific configuration required.
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
  // The deleteVisboProjectVersion method is responsible for deleting a specific project version from a Visbo project (VP). 
  // It supports the option to include deleted project versions and ensures secure deletion with detailed logging.
  // Parameters:
  //    visboprojectversion: VisboProjectVersion:  The VisboProjectVersion object representing the project version to be deleted.
  //                                               - Should include the _id property to identify the version to be removed.
  //    deleted: boolean (default: false):         If true, the request will handle the project version as a deleted (archived) item.
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
  // The updateVisboProjectVersion method is responsible for updating an existing project version within a Visbo project (VP). 
  // It supports optional handling of deleted (archived) project versions and ensures detailed logging of the update operation.
  // Parameters:
  //    visboprojectversion: VisboProjectVersion: The VisboProjectVersion object containing the updated project version details.
  //                                              - Must include the _id property to identify the project version being updated.
  //    deleted: boolean (default: false):        If true, the request will handle the project version as a deleted (archived) item.
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
  // The getVisboPortfolioVersions method is responsible for retrieving a list of portfolio versions associated with a specific Visbo portfolio (VPF). 
  // It supports optional inclusion of deleted (archived) portfolio versions.
  // Parameters:
  //    id: string:                        The ID of the Visbo portfolio for which versions are being requested.
  //    deleted: boolean (default: false): If true, includes portfolio versions that are marked as deleted.
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
  // The addVisboPortfolioVersion method is responsible for creating a new portfolio version within a specified Visbo project (VP). 
  // It sends a POST request to the server with the portfolio version data and returns the created version as an observable.
  // Parameters:
  //    vp: VisboProject:           The VisboProject object representing the project to which the portfolio version will be added.
  //                                  - Must include the _id property to identify the parent project.
  //    vpf: VisboPortfolioVersion: The VisboPortfolioVersion object containing the details of the portfolio version to be created.
  //                                  - Should include relevant properties such as name, description, and specific configuration settings.
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
  // The updateVisboPortfolioVersion method is responsible for updating an existing portfolio version within a specified Visbo project (VP). 
  // It sends a PUT request to the server with the updated portfolio version data and returns the modified version as an observable.
  // Parameters:
  //    vp: VisboProject:            The VisboProject object representing the project containing the portfolio version to update.
  //                                 - Must include the _id property to identify the parent project.
  //    vpf: VisboPortfolioVersion:  The VisboPortfolioVersion object containing the updated details of the portfolio version.
  //                                 - Must include the _id property to identify the specific portfolio version to update.
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
  // The deleteVisboPortfolioVersion method is responsible for deleting a specific portfolio version from a Visbo project (VP). 
  // It supports optional handling of deleted (archived) portfolio versions and ensures detailed logging of the deletion operation.
  // Parameters:
  //    vpf: VisboPortfolioVersion:        The VisboPortfolioVersion object representing the portfolio version to be deleted.
  //                                         - Must include the _id and vpid properties to identify the specific portfolio version and its parent project.
  //    deleted: boolean (default: false): If true, the request will handle the portfolio version as a deleted (archived) item.
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
  // The getVisboPortfolioKeyMetrics method is responsible for retrieving key metrics of project versions associated with a specific Visbo portfolio (VPF). 
  // It offers flexibility to include deleted items, perform predictive calculations, and retrieve extended data (longList).
  // Parameters:
  //    id: string:                            The ID of the Visbo portfolio for which key metrics are being requested.
  //    refDate: Date (default: new Date()):   The reference date for key metric calculations.
  //    deleted: boolean (default: false):     If true, includes project versions that are marked as deleted.
  //    calcPredict: boolean (default: false): If true, enables predictive calculations for key metrics.
  //    vcid: string (optional):               The ID of the Visbo center (VC) to use for predictive calculations if calcPredict is true.
  getVisboPortfolioKeyMetrics(id: string, refDate: Date = new Date(), deleted = false, calcPredict = false, vcid:string = undefined): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    params = params.append('vpfid', id);
    params = params.append('refDate', refDate.toISOString());
    if (calcPredict && vcid) {
      params = params.append('vcid', vcid);
      params = params.append('keyMetrics', '2');
    } else {
      params = params.append('keyMetrics', '1');
      // Ute added
      params = params.append('longList', '1');
    }
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
  // The getVisboCenterProjectVersions method is responsible for retrieving project versions associated with a specific Visbo center (VC). 
  // It supports optional inclusion of deleted items and extended data (longList).
  // Parameters:
  //    id: string:                          The ID of the Visbo center for which project versions are being requested.
  //    refDate: Date (default: new Date()): The reference date for filtering project versions.
  //    deleted: boolean (default: false):   If true, includes project versions that are marked as deleted.
  //    longList: boolean (default: false):  If true, requests a more detailed list of project versions.
  getVisboCenterProjectVersions(id: string, refDate: Date = new Date(), deleted = false, longList = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    params = params.append('vcid', id);
    params = params.append('refDate', refDate.toISOString());
    params = params.append('keyMetrics', '1');
    params = params.append('variantID', '');    
    if (longList) {
      params = params.append('longList', '1');
    }
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
  // The getVisboPortfolioVersion method is responsible for retrieving a specific portfolio version by its ID from a Visbo project (VP). 
  // It also supports the option to include deleted (archived) portfolio versions.
  // Parameters:
  //    id: string:                         The ID of the portfolio version to retrieve.
  //    deleted: boolean (default: false):  If true, includes portfolio versions that are marked as deleted in the request.
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
  // The getCapacity method is responsible for calculating and retrieving capacity data (resource needs) for specific project versions within a Visbo project (VP). 
  // It supports hierarchical data retrieval, project financial view (pfv), and filtering by roles and parent IDs within a specified date range.
  // Parameters:
  //    id: string:                            The ID of the Visbo project version for which capacity data is being requested.
  //    roleID: string:                        The ID of the role to filter the capacity data (optional).
  //    parentID: string:                      The ID of the parent entity to filter the capacity data as member of a team or of the organical structure (optional).
  //    startDate: Date:                       The start date for the capacity calculation range.
  //    endDate: Date:                         The end date for the capacity calculation range.
  //    hierarchy: boolean (default: false):   If true, retrieves capacity data in a hierarchical structure.
  //    pfv: boolean (default: false):         If true, enables baseline calculation.
  getCapacity(id: string, roleID: string, parentID: string, startDate: Date, endDate: Date,  hierarchy = false, pfv = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/capacity`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (pfv) {
      params = params.append('pfv', '1');
    }
    if (startDate) {
      this.log(`Calling From: ${startDate.toISOString()}`);
      params = params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      this.log(`Calling To: ${endDate.toISOString()}`);
      params = params.append('endDate', endDate.toISOString());
    }
    if (roleID) {
      this.log(`Calling RoleID: ${roleID}`);
      params = params.append('roleID', roleID);
    }
    if (parentID) {
      this.log(`Calling ParentID: ${parentID}`);
      params = params.append('parentID', parentID);
    }

    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(() => this.log(`fetched Capacity Calculation for ${id}`)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
      );
  }

  
  /** GET CostTypes Calculation from the server for the specified vpv id , costID*/
  // The getCosttype method is responsible for retrieving cost type data associated with a specific project version within a Visbo project (VP). 
  // It supports hierarchical data retrieval, baseline, and filtering by cost type within a specified date range.
  // Parameters:
  // id: string:                            The ID of the Visbo project version for which cost type data is being requested.
  // costID: string:                        The ID of the cost type to filter the data (optional).
  // startDate: Date:                       The start date for the cost type calculation range.
  // endDate: Date:                         The end date for the cost type calculation range.
  // hierarchy: boolean (default: false):   If true, retrieves cost type data in a hierarchical structure.
  // pfv: boolean (default: false):         If true, enables baseline calculation.
  getCosttype(id: string, costID: string, startDate: Date, endDate: Date,  hierarchy = false, pfv = false): Observable<VisboProjectVersion[]> {
    const url = `${this.vpvUrl}/${id}/costtypes`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (pfv) {
      params = params.append('pfv', '1');
    }
    if (startDate) {
      this.log(`Calling From: ${startDate.toISOString()}`);
      params = params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      this.log(`Calling To: ${endDate.toISOString()}`);
      params = params.append('endDate', endDate.toISOString());
    }
    if (costID) {
      this.log(`Calling costID: ${costID}`);
      params = params.append('costID', costID);
    }
    
    this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectVersionResponse>(url, { headers , params })
      .pipe(
        map(response => response.vpv),
        tap(() => this.log(`fetched Costtypes Calculation for ${id}`)),
        catchError(this.handleError<VisboProjectVersion[]>('getVisboProjectVersions'))
      );
  }

  /** GET Cost Calculation from the server for the specified vpv id */
  // The getCost method is responsible for retrieving cost data (resource needs + cost types) associated with a specific project version within a Visbo project (VP). 
  // It sends a GET request to the server to fetch detailed cost calculations for the project version.
  // Parameters:
  //    id: string:      The ID of the Visbo project version for which cost data is being requested.
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
  // The getDelivery method is responsible for retrieving delivery data associated with a specific project version within a Visbo project (VP). 
  // It supports optional filtering by a reference string (ref).
  // Parameters:
  //    id: string:    The ID of the Visbo project version for which delivery data is being requested.
  //    ref: string:   An optional reference string (normally this is 'pfv' to filter the delivery data.
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
   // The getDeadline method is responsible for retrieving deadline data associated with a specific project version within a Visbo project (VP). 
   // It supports optional filtering by a reference string (ref).
   // Parameters:
   //     id: string:     The ID of the Visbo project version for which deadline data is being requested.
   //     ref: string:    An optional reference string to filter (normally 'pfv') the deadline data.
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
  // The changeVisboProjectVersion method is responsible for modifying an existing Visbo project version (VPV) by changing its start and end dates, 
  // scaling its timeline, and optionally marking it as committed. 
  // It uses the /copy endpoint to effectively create a modified version of the existing project version.
  changeVisboProjectVersion(vpvid: string, startDate?: Date, endDate?: Date, scaleFactor = 1, scaleStart?: Date, isCommited: Boolean = false): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${vpvid}/copy`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (scaleFactor != 1) {
      params = params.append('scaleFactor', scaleFactor.toString());
    }

    const newVPV = new VisboProjectVersion();
    newVPV.startDate = startDate;
    newVPV.endDate = endDate;
    newVPV.actualDataUntil = scaleStart;
    newVPV.isCommited = isCommited;

    return this.http.post<VisboProjectVersionResponse>(url, newVPV, { headers , params })
      .pipe(
        map(response => response.vpv[0]),
        tap(vpv => this.log(`moved & scaled VisboProjectVersion w/ id=${vpv._id}`)),
        catchError(this.handleError<VisboProjectVersion>('changeVisboProjectVersion'))
      );
  }

  /** POST: copy a Visbo Project Version */
  // The copyVisboProjectVersion method creates a copy of an existing Visbo project version (VPV).
  // It supports assigning a new variant name, specifying a hierarchy level for baseline (pfv), and marking the copied version as committed.
  // Parameters:
  //    vpvid: string:                         The ID of the Visbo project version to copy.
  //    variantName: string:                   The name of the new variant for the copied project version.
  //    level: number (optional):              Specifies the hierarchy level for pfv variant copies. 
  //                                           Only applied if variantName is 'pfv' and level is greater than 0.
  //    isCommited: Boolean (default: false):  If true, the copied project version will be marked as committed. 
  copyVisboProjectVersion(vpvid: string, variantName: string, level: number = undefined, isCommited: Boolean = false): Observable<VisboProjectVersion> {
    const url = `${this.vpvUrl}/${vpvid}/copy`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (variantName == 'pfv' && level > 0) {
      params = params.append('level', level.toString());
    }

    const newVPV = new VisboProjectVersion();
    newVPV.variantName = variantName;
    newVPV.isCommited = isCommited;
    
    return this.http.post<VisboProjectVersionResponse>(url, newVPV, { headers , params })
      .pipe(
        map(response => response.vpv[0]),
        tap(vpv => this.log(`copied VisboProjectVersion w/ id=${vpv._id}`)),
        catchError(this.handleError<VisboProjectVersion>('copyVisboProjectVersion'))
      );
  }

/** POST: export a Visbo Project Version to openproject*/
// The exportVPVToOpenProj method is responsible for exporting a Visbo project version (VPV) to the Open Project format using the Open Project Bridge API. 
// It supports exporting specific project variants, including pfv (Baseline) variants, with an optional hierarchy level.
exportVPVToOpenProj(vpid: string, variantName: string, level: number = undefined, isCommited: Boolean = false): Observable<any> {
  const url = `${this.openProjURL}/bridge/export-to-open-project/${vpid}`; 
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  let params = new HttpParams();
  if (variantName == 'pfv' && level > 0) {
    params = params.append('level', level.toString());
  }  
  return this.http.post<any>(url, { headers , params }).pipe( 
      map(response => {
        return response; 
      }), 
      tap(() => this.log(`exported VisboProjectVersion w/ id=${vpid}`)),
      catchError(this.handleError<VisboProjectVersion>('exportVisboProjectVersion'))
    );
}

/** POST: import a  Visbo Project Version from openproject*/
// The importVPVFromOpenProj method is responsible for importing an Open Project Project into Visbo project version (VPV)  using the Open Project Bridge API. 
// It allows importing a specific project variant.
importVPVFromOpenProj(vpid: string, variantName: string): Observable<any> {
  const url = `${this.openProjURL}/bridge/import-from-open-project/${vpid}`; 
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  let params = new HttpParams();
 
  return this.http.post<any>(url, { headers , params }).pipe( 
      map(response => {
        return response; 
      }), 
      tap(() => this.log(`imported VisboProjectVersion w/ id=${vpid}`)),
      catchError(this.handleError<VisboProjectVersion>('importVisboProjectVersion'))
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
