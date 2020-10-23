import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboProject, VisboProjectResponse, VPLock, VisboProjectLockResponse, VPRestrict, VisboRestrictResponse } from '../_models/visboproject';
import { VGGroup, VGUserGroup, VGResponse, VGUserGroupMix } from '../_models/visbogroup';

import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

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
  getVisboProjects(id: string, sysadmin = false, deleted = false): Observable<VisboProject[]> {
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
    this.log(`VP getVisboProjects Sysadmin ${sysadmin} Deleted ${deleted}`);

    // this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params })
      .pipe(
        map(response => response.vp),
        tap(visboprojects => this.log(`fetched ${visboprojects.length} VisboProjects `)),
        catchError(this.handleError<VisboProject[]>('getVisboProjects'))
      );
  }

  /** GET VisboProject by id. Return `undefined` when id not found */
  /** Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
  getVisboProjectNo404<Data>(id: string): Observable<VisboProject> {
    const url = `${this.vpUrl}`;
    this.log(`Calling HTTP Request: ${this.vpUrl}`);
    return this.http.get<VisboProject[]>(url)
      .pipe(
        map(visboprojects => visboprojects[0]), // returns a {0|1} element array
        tap(h => {
          const outcome = h ? `fetched` : `did not find`;
          this.log(`getVisboProject404 ${outcome} VisboProject id=${id}`);
        }),
        catchError(this.handleError<VisboProject>(`getVisboProject id=${id}`))
      );
  }

  /** GET VisboProject by id. Will 404 if id not found */
  getVisboProject(id: string, sysadmin = false, deleted = false): Observable<VisboProject> {
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
  getCapacity(vpid: string, vpfid: string, refDate: Date, roleID: string, hierarchy = false, pfv = false, sysadmin = false, deleted = false): Observable<VisboProject> {
    const url = `${this.vpUrl}/${vpid}/portfolio/${vpfid}/capacity`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (hierarchy) {
      params = params.append('hierarchy', '1');
    }
    if (pfv) {
      params = params.append('pfv', '1');
    }
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    if (roleID) {
      this.log(`Calling RoleID: ${roleID}`);
      params = params.append('roleID', roleID);
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

  /* GET VisboProjects whose name contains search term */
  // searchVisboProjects(term: string): Observable<VisboProject[]> {
  //   if (!term.trim()) {
  //     // if not search term, return empty visboproject array.
  //     return of([]);
  //   }
  //   return this.http.get<VisboProject[]>(`api/visboprojects?name=${term}`).pipe(
  //     tap(_ => this.log(`found VisboProjects matching "${term}"`)),
  //     catchError(this.handleError<VisboProject[]>('searchVisboProjects', []))
  //   );
  // }

  //////// Save methods //////////

  /** POST: add a new Visbo Project to the server */
  addVisboProject (visboproject: VisboProject): Observable<VisboProject> {
    return this.http.post<VisboProjectResponse>(this.vpUrl, visboproject, httpOptions)
      .pipe(
        map(response => response.vp[0] ),
        tap(vp => this.log(`added VisboProject with id=${vp._id}`)),
        catchError(this.handleError<VisboProject>('addVisboProject'))
      );
  }

  /** DELETE: delete the Visbo Project from the server */
  deleteVisboProject (visboproject: VisboProject, deleted = false): Observable<VisboProjectResponse> {
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
  getVPUsers(vpid: string, sysadmin = false, deleted = false): Observable<VGUserGroupMix> {
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
