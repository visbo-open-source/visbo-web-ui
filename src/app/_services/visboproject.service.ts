import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboProject, CreateProjectProperty, VisboProjectResponse, VPLock, VisboProjectLockResponse, VPRestrict, VisboRestrictResponse, VPVariant, VPVariantResponse } from '../_models/visboproject';
import { VGGroup, VGUserGroup, VGResponse, VGUserGroupMix } from '../_models/visbogroup';
import { VisboUser, VisboUsersResponse } from '../_models/visbouser';

import { MessageService } from './message.service';

@Injectable()
export class VisboProjectService {

  //   private vpUrl = 'projects';  // URL to web api on same server
  private vpUrl = this.env.restUrl.concat('/vp'); // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET VisboProjects from the server if id is specified get only projects of this vcid*/
  getVisboProjects(id: string, sysadmin = false, deleted = false, vpType = false): Observable<VisboProject[]> {
  // The getVisboProjects method retrieves a list of Visbo projects from the server. 
  // It allows filtering by Visbo Center ID, administrative access, deletion status, and project type.
    const url = `${this.vpUrl}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (id) {
      params = params.append('vcid', id);
    }
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    // if vpType is true only the project (no Templates, no portfolios ) will be searched
    if (vpType) {
      params = params.append('vpType', 0);
    }
    this.log(`VP getVisboProjects Sysadmin ${sysadmin} Deleted ${deleted}`);

    // this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params })
      .pipe(
        map(response => response.vp),
        tap(visboprojects => this.log(`fetched ${visboprojects.length} VisboProjects `)),
        catchError(this.handleError<VisboProject[]>('getVisboProjects'))
      );
  }
  
  /** GET VisboProject by id. Will 404 if id not found */
  getVisboProject(id: string, sysadmin = false, deleted = false): Observable<VisboProject> {
  // The getVisboProject method retrieves a specific Visbo project by its ID. 
  // It supports optional filters for system administrator access and inclusion of deleted projects.
    const url = `${this.vpUrl}/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }

    this.log(`Calling HTTP Request for a specific entry: ${url} params ${params}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params })
      .pipe(
        map(response => {
                  // TODO: is there a better way to transfer the perm?
                  response.vp[0].perm = response.perm;
                  return response.vp[0];
                }),
        tap(visboproject => this.log(`fetched vp id=${visboproject._id} ${visboproject.name}`)),
        catchError(this.handleError<VisboProject>(`getVisboProject id=${id}`))
      );
  }

  /** GET Capacity of VisboPortfolio Version by id. Will 404 if id not found */
  getCapacity(vpid: string, vpfid: string, refDate: Date, roleID: string, parentID: string, startDate: Date, endDate: Date, hierarchy = false, pfv = false, sysadmin = false, deleted = false, perProject = false): Observable<VisboProject> {
  // The getCapacity method retrieves capacity(resource needs) data for a specific project portfolio within a Visbo project. 
  // It allows extensive filtering options based on dates, roles, parent IDs, and administrative access.
    const url = `${this.vpUrl}/${vpid}/portfolio/${vpfid}/capacity`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (pfv) {
      params = params.append('pfv', '1');
    }
    if (perProject) {
      params = params.append('perProject', '1');
    }
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
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
    if (refDate) {
      params = params.append('refDate', refDate.toISOString());
    }
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params }).pipe(
      map(response => {
        return response.vp[0];
      }),
      tap(vp => this.log(`fetched Capacity for VP/VPF ${vpid}/ ${vpfid} Len: ${vp.capacity.length}`)),
      catchError(this.handleError<VisboProject>(`getVisboPortfolio Capacity id:${vpfid}`))
    );
  }

  /** GET CostTypes of VisboPortfolio Version by id. Will 404 if id not found */
   getCosttypes(vpid: string, vpfid: string, refDate: Date, costID: string, startDate: Date, endDate: Date, hierarchy = false, pfv = false, sysadmin = false, deleted = false, perProject = false): Observable<VisboProject> {
   // The getCosttypes method retrieves cost type data for a specific VisboPortfolio Version within a Visbo Portfolio. 
   // It offers a wide range of filtering options, including hierarchy, portfolio-specific values, administrative access, and date ranges. 
    const url = `${this.vpUrl}/${vpid}/portfolio/${vpfid}/costtypes`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (pfv) {
      params = params.append('pfv', '1');
    }
    if (perProject) {
      params = params.append('perProject', '1');
    }
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
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
      this.log(`Calling RoleID: ${costID}`);
      params = params.append('costID', costID);
    }
    if (refDate) {
      params = params.append('refDate', refDate.toISOString());
    }
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params }).pipe(
      map(response => {
        return response.vp[0];
      }),
      tap(vp => this.log(`fetched Cost Information for VP/VPF ${vpid}/ ${vpfid} Len: ${vp.costtypes.length}`)),
      catchError(this.handleError<VisboProject>(`getVisboPortfolio Cost Information id:${vpfid}`))
    );
  }

  

  //////// Save methods //////////

  /** POST: add a new Visbo Project to the server */
  addVisboProject (newVP: CreateProjectProperty): Observable<VisboProject> {
  // The addVisboProject method is used to create a new Visbo project within the system. 
  // It supports creating projects from scratch or using a template ID when the project type (vpType) is not specified or is set to 0.
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (!newVP.vpType || newVP.vpType == 0) {
      if (newVP.templateID) {
        params = params.append('vpid', newVP.templateID);
      }
    }
    return this.http.post<VisboProjectResponse>(this.vpUrl, newVP, { headers , params })
      .pipe(
        map(response => response.vp[0] ),
        tap(vp => this.log(`added VisboProject with id=${vp._id}`)),
        catchError(this.handleError<VisboProject>('addVisboProject'))
      );
  }

  /** DELETE: delete the Visbo Project from the server */
  deleteVisboProject (visboproject: VisboProject, deleted = false): Observable<VisboProjectResponse> {
  // The deleteVisboProject method is responsible for deleting a specified Visbo project from the system. 
  // It supports optional deletion of archived (deleted) projects.
    const id = visboproject._id;
    const url = `${this.vpUrl}/${id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboProjectResponse>(url, { headers , params })
      .pipe(
        tap(() => this.log(`deleted VisboProject id=${id}`)),
        catchError(this.handleError<VisboProjectResponse>('deleteVisboProject'))
      );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProject (visboproject: VisboProject, deleted = false): Observable<VisboProject> {
  // The updateVisboProject method is responsible for updating an existing Visbo project on the server. 
  // It supports updating both active and deleted (archived) projects.
    const url = `${this.vpUrl}/${visboproject._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboProjectResponse>(url, visboproject, { headers , params })
      .pipe(
        map(response => response.vp[0]),
        tap(() => this.log(`updated VisboProject id=${visboproject._id} url=${this.vpUrl}`)),
        catchError(this.handleError<VisboProject>('updateVisboProject'))
      );
  }

  // GET VisboProject Users for a specified VP from the server
  getVPUser(vpid: string, sysadmin = false, deleted = false): Observable<VisboUser[]> {
  // The getVPUser method retrieves a list of users associated with a specific Visbo project (VP). 
  // It supports optional filters for administrative access and inclusion of deleted users.
    const url = `${this.vpUrl}/${vpid}/user`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request GET: ${url} `);
    return this.http.get<VisboUsersResponse>(url, { headers , params })
      .pipe(
        map(response => {
          return response.user;
        }),
        // tap(users => this.log(`fetched Users & Groups Users `)),
        catchError(this.handleError<VisboUser[]>('getVPUsers'))
      );
  }

  // GET VisboProject Group / Users Permission for a specified VP from the server
  getVPUserGroupPerm(vpid: string, sysadmin = false, deleted = false): Observable<VGUserGroupMix> {
  // The getVPUserGroupPerm method retrieves the permissions of user groups associated with a specific Visbo project (VP). 
  // It returns a mix of users and groups along with their permissions, supporting optional administrative access and inclusion of deleted groups.
    const url = `${this.vpUrl}/${vpid}/group?userlist=1`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request GET: ${url} `);
    return this.http.get<VGResponse>(url, { headers , params })
      .pipe(
        map(response => {
          const userGroupMix = new VGUserGroupMix();
          userGroupMix.users = response.users;
          userGroupMix.groups = response.groups;
          return userGroupMix;
        }),
        // tap(users => this.log(`fetched Users & Groups Users `)),
        catchError(this.handleError<VGUserGroupMix>('getVisboProjectUsers'))
      );
  }

  /** POST: add a new User to the Visbo Project */
  addVPUser (email: string, groupId: string, message: string, vpid: string, sysadmin = false): Observable<VGGroup> {
  // The addVPUser method is responsible for adding a new user to a specific group within a Visbo project (VP). 
  // It supports optional system administrator access to perform the operation with elevated privileges.
    const url = `${this.vpUrl}/${vpid}/group/${groupId}/user`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    const reqBody = {
      email: email,
      message: message
    };
    this.log(`Calling HTTP Request: ${url} for ${email} `);
    return this.http.post<VGResponse>(url, reqBody, { headers , params })
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo User to Group with id=${group._id}`)),
        catchError(this.handleError<VGGroup>('addVPUser'))
      );
  }

  /** DELETE: remove a User from the Visbo Project */
  deleteVPUser (user: VGUserGroup, vpid: string, sysadmin = false): Observable<VGGroup> {
  // The deleteVPUser method is responsible for removing a user from a specific group within a Visbo project (VP). 
  // It supports optional system administrator access to perform the operation with elevated privileges.
    const url = `${this.vpUrl}/${vpid}/group/${user.groupId}/user/${user.userId}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.groupName} `);
    return this.http.delete<VGResponse>(url, { headers , params })
    .pipe(
      map(result => result.groups[0]),
      tap(() => this.log(`deleted Visbo Project User ${user.email}`)),
      catchError(this.handleError<VGGroup>('deleteVisboProjectUser'))
    );
  }

  /** POST: add a new Group to the Visbo Project */
  addVPGroup (newGroup: VGGroup, sysadmin = false): Observable<VGGroup> {
  // The addVPGroup method is responsible for creating a new group within a specific Visbo project (VP). 
  // It supports optional system administrator access to perform the operation with elevated privileges.
    const url = `${this.vpUrl}/${newGroup.vpids[0]}/group`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${newGroup.name} `);
    return this.http.post<VGResponse>(url, newGroup, { headers , params })
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo Group with id=${group._id}`)),
        catchError(this.handleError<VGGroup>('addVPGroup'))
      );
  }

  /** PUT: modify a VP Group in the Visbo Project (Change: Name, Global, Permission)*/
  modifyVPGroup (actGroup: VGGroup, sysadmin = false): Observable<VGGroup> {
  // The modifyVPGroup method is responsible for updating an existing group within a specific Visbo project (VP). 
  // It supports optional system administrator access to perform the operation with elevated privileges.
    const url = `${this.vpUrl}/${actGroup.vpids[0]}/group/${actGroup._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${actGroup.name} `);
    return this.http.put<VGResponse>(url, actGroup, { headers , params })
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`modified Visbo Group with id=${JSON.stringify(group)}`)),
        catchError(this.handleError<VGGroup>('addVPGroup'))
      );
  }

  /** DELETE: remove a Group from the Visbo Project */
  deleteVPGroup (group: VGGroup, vpid: string, sysadmin = false): Observable<VGResponse> {
  // The deleteVPGroup method is responsible for deleting a specific group from a Visbo project (VP). 
  // It supports optional system administrator access to perform the operation with elevated privileges.
    const url = `${this.vpUrl}/${vpid}/group/${group._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for Group ${group.name} `);
    return this.http.delete<VGResponse>(url, { headers , params })
    .pipe(
      // map(response => response.vc[0].users),
      tap(() => this.log(`deleted Visbo Project Group ${group.name}`)),
      catchError(this.handleError<VGResponse>('deleteVisboProjectGroup'))
    );
  }

  /** DELETE: unlock Visbo Project Variant */
  unlockVP (variantid: string, vpid: string, sysadmin = false): Observable<VPLock[]> {
  // The unlockVP method is responsible for unlocking a specific variant within a Visbo project (VP). 
  // It supports optional system administrator access to perform the operation with elevated privileges.
    const url = `${this.vpUrl}/${vpid}/lock`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (variantid) {
      params = params.append('variantID', variantid);
    }
    this.log(`Calling HTTP Request: ${url} Params ${params} `);
    return this.http.delete<VisboProjectLockResponse>(url, { headers , params })
    .pipe(
      map(response => response.lock),
      tap(() => this.log(`deleted Visbo Project Lock for Variant ${variantid}`)),
      catchError(this.handleError<VPLock[]>('deleteVisboProjectLock'))
    );
  }

  /** DELETE: delete Visbo Project Restriction */
  deleteRestriction (vpid: string, restrictid: string): Observable<VisboProject> {
  // The deleteRestriction method is responsible for removing a specific restriction from a Visbo project (VP). 
  // It executes a DELETE request to the server, targeting a particular restriction by its ID.
    const url = `${this.vpUrl}/${vpid}/restrict/${restrictid}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();
    this.log(`Calling HTTP Request: ${url} Params ${params} `);
    return this.http.delete<VisboProjectResponse>(url, { headers , params })
    .pipe(
      map(response => response.vp[0]),
      tap(vp => this.log(`deleted Visbo Project Restriction in VP ${vp.name}`)),
      catchError(this.handleError<VisboProject>('deleteVisboProjectRestriction'))
    );
  }

  /** Add: add Visbo Project Restriction */
  addRestriction (vpid: string, restrict: VPRestrict): Observable<VPRestrict> {
  // The addRestriction method is responsible for adding a new restriction to a Visbo project (VP). 
  // It sends a POST request to the server with the restriction data.
    const url = `${this.vpUrl}/${vpid}/restrict`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();
    this.log(`Calling HTTP Request: ${url} Params ${params} `);
    return this.http.post<VisboRestrictResponse>(url, restrict, { headers , params })
    .pipe(
      map(response => response.restrict[0]),
      tap(restrict => this.log(`added Visbo Project Restriction ${JSON.stringify(restrict)}`)),
      catchError(this.handleError<VPRestrict>('addVisboProjectRestriction'))
    );
  }

  /** POST: add a new Variant to the Visbo Project */
  createVariant (variant: VPVariant, vpid: string, sysadmin = false): Observable<VPVariant> {
  // The createVariant method is responsible for creating a new variant within a Visbo project (VP). 
  // It sends a POST request to the server with the variant data and supports optional system administrator access.
    const url = `${this.vpUrl}/${vpid}/variant`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${name} `);
    return this.http.post<VPVariantResponse>(url, variant, { headers , params })
      .pipe(
        map(response => response.variant[0]),
        tap(variant => this.log(`added VP Variant with id=${variant._id}`)),
        catchError(this.handleError<VPVariant>('createVariant'))
      );
  }

  /** PUT: update a Variant to the Visbo Project */
  updateVariant (variant: VPVariant, vpid: string, sysadmin = false): Observable<VPVariant> {
  // The updateVariant method is responsible for updating an existing variant within a Visbo project (VP). 
  // It sends a PUT request to the server with the updated variant data and supports optional system administrator access.
    const url = `${this.vpUrl}/${vpid}/variant/${variant._id}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${name} `);
    return this.http.put<VPVariantResponse>(url, variant, { headers , params })
      .pipe(
        map(response => response.variant[0]),
        tap(variant => this.log(`updated VP Variant with id=${variant._id}`)),
        catchError(this.handleError<VPVariant>('updateVariant'))
      );
  }

  /** DELETE: delete Visbo Project Variant */
  deleteVariant (variantID: string, vpid: string): Observable<VisboProject> {
  // The deleteVariant method is responsible for deleting a specific variant from a Visbo project (VP). 
  // It executes a DELETE request to the server, targeting a particular variant by its ID.
    const url = `${this.vpUrl}/${vpid}/variant/${variantID}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams();
    this.log(`Calling HTTP Request: ${url} Params ${params} `);
    return this.http.delete<VisboProjectResponse>(url, { headers , params })
    .pipe(
      map(response => response.vp[0]),
      tap(vp => this.log(`deleted Visbo Project Variant in VP ${vp.name}`)),
      catchError(this.handleError<VisboProject>('deleteVisboProjectVariant'))
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

      this.log(`HTTP Request failed: ${error.error.message} ${error.status}`);
      // send the error to remote logging infrastructure
      this.log(`${operation} failed: ${error.error.message}`);
      // Let the app keep running by returning an empty result.
      return throwError(error);
      // return new ErrorObservable(error);
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectService: ' + message);
  }
}
