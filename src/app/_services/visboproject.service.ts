import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboProject, VisboProjectResponse, VisboProjectLockResponse } from '../_models/visboproject';
import { VGPermission, VGGroup, VGUserGroup, VGResponse, VGUserGroupMix } from '../_models/visbogroup';

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
  getVisboProjects(id: string, sysAdmin: boolean = false, deleted: boolean = false): Observable<VisboProject[]> {
    const url = `${this.vpUrl}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (id) params = params.append('vcid', id);
    if (sysAdmin) params = params.append('sysadmin', '1')
    if (deleted) params = params.append('deleted', '1')

    this.log(`VP getVisboProjects Sysadmin ${sysAdmin} Deleted ${deleted}`);

    // this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params })
      .pipe(
        map(response => response.vp),
        tap(visboprojects => this.log(`fetched ${visboprojects.length} VisboProjects `)),
        catchError(this.handleError('getVisboProjects', []))
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
  getVisboProject(id: string, sysAdmin: boolean = false, deleted: boolean = false): Observable<VisboProject> {
    const url = `${this.vpUrl}/${id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (sysAdmin) params = params.append('sysadmin', '1')
    if (deleted) params = params.append('deleted', '1')

    this.log(`Calling HTTP Request for a specific entry: ${url} params ${params}`);
    return this.http.get<VisboProjectResponse>(url, { headers , params })
      .pipe(
        map(response => {
                  // TODO: is there a better way to transfer the perm?
                  response.vp[0].perm = response.perm;
                  return response.vp[0]
                }),
        tap(visboproject => this.log(`fetched vp id=${visboproject._id} ${visboproject.name}`)),
        catchError(this.handleError<VisboProject>(`getVisboProject id=${id}`))
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
  deleteVisboProject (visboproject: VisboProject, deleted: boolean = false): Observable<any> {
    //const id = typeof visboproject === 'number' ? visboproject : visboproject._id;
    const id = visboproject._id;
    const url = `${this.vpUrl}/${id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) params = params.append('deleted', '1')
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboProjectResponse>(url, { headers , params })
      .pipe(
        tap(_ => this.log(`deleted VisboProject id=${id}`)),
        catchError(this.handleError('deleteVisboProject'))
      );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProject (visboproject: VisboProject, deleted: boolean = false): Observable<VisboProject> {
    const url = `${this.vpUrl}/${visboproject._id}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (deleted) params = params.append('deleted', '1')
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboProjectResponse>(url, visboproject, { headers , params })
      .pipe(
        map(response => response.vp[0]),
        tap(_ => this.log(`updated VisboProject id=${visboproject._id} url=${this.vpUrl}`)),
        catchError(this.handleError<any>('updateVisboProject'))
      );
  }

  // GET VisboProject Users for a specified VP from the server
  getVPUsers(vpid: string, sysadmin: boolean = false, deleted: boolean = false): Observable<any> {
    var url = `${this.vpUrl}/${vpid}/group?userlist=1`;
    if (sysadmin) {
      url = url.concat('&sysadmin=1')
    }
    if (deleted) {
      url = url.concat('&deleted=1')
    }
    this.log(`Calling HTTP Request GET: ${url} `);
    return this.http.get<VGResponse>(url, httpOptions)
      .pipe(
        map(response => {
          var userGroupMix = new VGUserGroupMix();
          userGroupMix.users = response.users;
          userGroupMix.groups = response.groups;
          return userGroupMix
        }),
        // tap(users => this.log(`fetched Users & Groups Users `)),
        catchError(this.handleError('getVisboProjectUsers', []))
      );
  }

  /** POST: add a new User to the Visbo Project */
  addVPUser (email: string, groupId: string, message: string, vpid: string, sysadmin: boolean = false): Observable<VGGroup> {
    var url = `${this.vpUrl}/${vpid}/group/${groupId}/user`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    var reqBody: any = {};
    reqBody.email = email;
    reqBody.message = message;
    this.log(`Calling HTTP Request: ${url} for ${email} `);
    return this.http.post<VGResponse>(url, reqBody, httpOptions)
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo User to Group with id=${group._id}`)),
        catchError(this.handleError<any>('addVPUser'))
      );
  }

  /** DELETE: remove a User from the Visbo Project */
  deleteVPUser (user: VGUserGroup, vpid: string, sysadmin: boolean = false): Observable<any> {
    var url = `${this.vpUrl}/${vpid}/group/${user.groupId}/user/${user.userId}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.groupName} `);
    return this.http.delete<VGResponse>(url, httpOptions)
    .pipe(
      tap(users => this.log(`deleted Visbo Project User ${user.email}`)),
      catchError(this.handleError<any>('deleteVisboProjectUser'))
    );
  }

  /** POST: add a new Group to the Visbo Project */
  addVPGroup (newGroup: VGGroup, sysadmin: boolean = false): Observable<VGGroup> {
    var url = `${this.vpUrl}/${newGroup.vpids[0]}/group`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for ${newGroup.name} `);
    return this.http.post<VGResponse>(url, newGroup, httpOptions)
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo Group with id=${group._id}`)),
        catchError(this.handleError<any>('addVPGroup'))
      );
  }

  /** PUT: modify a VP Group in the Visbo Project (Change: Name, Global, Permission)*/
  modifyVPGroup (actGroup: VGGroup, sysadmin: boolean = false): Observable<VGGroup> {
    var url = `${this.vpUrl}/${actGroup.vpids[0]}/group/${actGroup._id}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for ${actGroup.name} Perm: ${JSON.stringify(actGroup.permission)} `);
    return this.http.put<VGResponse>(url, actGroup, httpOptions)
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`modified Visbo Group with id=${JSON.stringify(group)}`)),
        catchError(this.handleError<any>('addVPGroup'))
      );
  }

  /** DELETE: remove a Group from the Visbo Project */
  deleteVPGroup (group: VGGroup, vpid: string, sysadmin: boolean = false): Observable<any> {
    var url = `${this.vpUrl}/${vpid}/group/${group._id}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for Group ${group.name} `);
    return this.http.delete<VGResponse>(url, httpOptions)
    .pipe(
      // map(response => response.vc[0].users),
      tap(groups => this.log(`deleted Visbo Project Group ${group.name}`)),
      catchError(this.handleError<any>('deleteVisboProjectGroup'))
    );
  }

  /** DELETE: unlock Visbo Project Variant */
  unlockVP (variantName: string, vpid: string, sysadmin: boolean = false): Observable<any> {
    var url = `${this.vpUrl}/${vpid}/lock?variantName=${variantName}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for Lock ${variantName} `);
    return this.http.delete<VisboProjectLockResponse>(url, httpOptions)
    .pipe(
      // map(response => response.vc[0].users),
      tap(lock => this.log(`deleted Visbo Project Lock ${variantName}`)),
      catchError(this.handleError<any>('deleteVisboProjectLock'))
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
