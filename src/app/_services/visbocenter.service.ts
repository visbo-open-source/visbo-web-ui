import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboCenter, VisboCenterResponse } from '../_models/visbocenter';
import { VCUser, VCUserResponse } from '../_models/visbocenter';
import { VGUser, VGPermission, VGGroup, VGUserGroup, VGGroupResponse, VGUserResponse, VGUserGroupMix } from '../_models/visbogroup';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboCenterService {
  //   private vcUrl = 'vc';  // URL to api on same server
  private vcUrl = environment.restUrl.concat('/vc');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET VisboCenters from the server */
  getVisboCenters(sysadmin: boolean = false): Observable<VisboCenter[]> {
    var url = this.vcUrl
    if (sysadmin) url = url.concat('?sysadmin=1');

    this.log(`Calling HTTP Request: ${url} ${sysadmin ? "as sysadmin" : ""}`);
    return this.http.get<VisboCenterResponse>(url, httpOptions)
      .pipe(
        map(response => response.vc),
        tap(visbocenters => this.log(`fetched ${visbocenters.length} VisboCenters `)),
        catchError(this.handleError('getVisboCenters', []))
      );
  }

  /** GET VisboCenters from the server */
  getSysVisboCenter(): Observable<VisboCenter> {
    var url = this.vcUrl + '?systemvc=true&sysadmin=1';
    var sysVCRole = undefined;
    var currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    this.log(`Calling HTTP Request for SysVC: ${url} for user ${currentUser.email}`);

    return this.http.get<VisboCenterResponse>(url, httpOptions).pipe(
      map(response => {
                // TODO: is there a better way to transfer the perm?
                response.vc[0].perm = response.perm;
                sessionStorage.setItem('isSysAdmin', sysVCRole);
                return response.vc[0]
              }),
        tap(visbocenter => {
          this.log(`fetched System VisboCenter user Role is ${visbocenter.perm.system || 'None'}`)
        }),
        catchError(this.handleError('getVisboCenters', []))
      );
  }

  /* Role of User in sysAdmin */
  getSysAdminRole() {
    var result = sessionStorage.getItem('isSysAdmin') || undefined;
    // this.log(`SysAdmin Role: ${result}`);

    return result;
  }

  /** GET VisboCenter by id. Return `undefined` when id not found */
  /** MS Todo Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
  getVisboCenterNo404<Data>(id: string): Observable<VisboCenter> {
    const url = `${this.vcUrl}/?id=${id}`;
    this.log(`Calling HTTP Request: ${this.vcUrl}`);
    return this.http.get<VisboCenter[]>(url)
      .pipe(
        map(visbocenters => visbocenters[0]), // returns a {0|1} element array
        tap(h => {
          var outcome = h ? `fetched` : `did not find`;
          this.log(`${outcome} VisboCenter ${id}`);
        }),
        catchError(this.handleError<VisboCenter>(`getVisboCenter id: ${id}`))
      );
  }

  /** GET VisboCenter by id. Will 404 if id not found */
  getVisboCenter(id: string, sysadmin: boolean = false): Observable<VisboCenter> {
    var url = `${this.vcUrl}/${id}`;
    if (sysadmin) url = url.concat('?sysadmin=1');
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboCenterResponse>(url).pipe(
      map(response => {
                // TODO: is there a better way to transfer the perm?
                response.vc[0].perm = response.perm;
                return response.vc[0]
              }),
      tap(visbocenter => this.log(`fetched VC ${visbocenter.name} id:${id}`)),
      catchError(this.handleError<VisboCenter>(`getVisboCenter id:${id}`))
    );
  }

  /* GET VisboCenters whose name contains search term */
  // searchVisboCenters(term: string): Observable<VisboCenter[]> {
  //   if (!term.trim()) {
  //     // if not search term, return empty visbocenter array.
  //     return of([]);
  //   }
  //   return this.http.get<VisboCenter[]>(`api/visbocenters?name=${term}`).pipe(
  //     tap(_ => this.log(`found VisboCenters matching "${term}"`)),
  //     catchError(this.handleError<VisboCenter[]>('searchVisboCenters', []))
  //   );
  // }

  //////// Save methods //////////

  /** POST: a new Visbo Center to the server */
  addVisboCenter (visbocenter: VisboCenter): Observable<VisboCenter> {
    this.log(`Calling HTTP Request: ${this.vcUrl} ${JSON.stringify(visbocenter)}`);

    return this.http.post<VisboCenterResponse>(this.vcUrl, visbocenter, httpOptions).pipe(
      map(response => response.vc[0] ),
      tap(vc => this.log(`added VisboCenter ${vc.name} with id=${vc._id}`)),
      catchError(this.handleError<VisboCenter>('addVisboCenter'))
    );
  }


  /** DELETE: delete the Visbo Center from the server */
  deleteVisboCenter (visbocenter: VisboCenter, sysadmin: boolean = false): Observable<any> {
    //const id = typeof visbocenter === 'number' ? visbocenter : visbocenter._id;
    const id = visbocenter._id;
    var url = `${this.vcUrl}/${id}`;
    if (sysadmin) url = url.concat('?sysadmin=1');

    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboCenter>(url, httpOptions).pipe(
      tap(response => this.log(`deleted VisboCenter id=${id}`)),
      catchError(this.handleError<VisboCenter>('deleteVisboCenter'))
    );
  }

  /** PUT: update the Visbo Center on the server */
  updateVisboCenter (visbocenter: VisboCenter, sysadmin: boolean = false): Observable<VisboCenter> {
    var url = `${this.vcUrl}/${visbocenter._id}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboCenterResponse>(url, visbocenter, httpOptions)
      .pipe(
        map(response => response.vc[0] ),
        tap(vc => this.log(`updated VisboCenter ${vc.name} with id=${vc._id}`)),
        catchError(this.handleError<any>('updateVisboCenter'))
      );
  }

  // GET VisboCenter Users for a specified VC from the server
  getVCUsers(vcid: string, sysadmin: boolean = false): Observable<any> {
    var url = `${this.vcUrl}/${vcid}/group?userlist=1`;
    if (sysadmin) {
      url = url.concat('&sysadmin=1')
    }
    return this.http.get<VGUserResponse>(url, httpOptions)
      .pipe(
        map(response => {
          var userGroupMix = new VGUserGroupMix();
          userGroupMix.users = response.users;
          userGroupMix.groups = response.groups;
          return userGroupMix
        }),
        // tap(users => this.log(`fetched Users & Groups Users `)),
        catchError(this.handleError('getVisboCenterUsers', []))
      );
  }

  /** POST: add a new User to the Visbo Center */
  addVCUser (email: string, groupId: string, message: string, vcid: string, sysadmin: boolean = false): Observable<VGGroup> {
    var url = `${this.vcUrl}/${vcid}/group/${groupId}/user`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    var reqBody: any = {};
    reqBody.email = email;
    reqBody.message = message;
    this.log(`Calling HTTP Request: ${url} for ${email} in VG ${groupId} in VC ${vcid} `);
    return this.http.post<VGUserResponse>(url, reqBody, httpOptions)
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo User to Group with id=${group._id}`)),
        catchError(this.handleError<any>('addVCUser'))
      );
  }

  /** DELETE: remove a User from the Visbo Center */
  deleteVCUser (user: VGUserGroup, vcid: string, sysadmin: boolean = false): Observable<any> {
    var url = `${this.vcUrl}/${vcid}/group/${user.groupId}/user/${user.userId}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.groupName} in VC ${vcid} `);
    return this.http.delete<VGUserResponse>(url, httpOptions)
    .pipe(
      // map(response => response.vc[0].users),
      tap(users => this.log(`deleted Visbo Center User ${user.email}`)),
      catchError(this.handleError<any>('deleteVisboCenterUser'))
    );
  }

  /** POST: add a new Group to the Visbo Center */
  addVCGroup (newGroup: VGGroup, sysadmin: boolean = false): Observable<VGGroup> {
    var url = `${this.vcUrl}/${newGroup.vcid}/group`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for ${newGroup.name} in in VC ${newGroup.vcid} `);
    return this.http.post<VGUserResponse>(url, newGroup, httpOptions)
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo Group with id=${group._id}`)),
        catchError(this.handleError<any>('addVCGroup'))
      );
  }

  /** PUT: modify a VC Group in the Visbo Center (Change: Name, Global, Permission)*/
  modifyVCGroup (actGroup: VGGroup, sysadmin: boolean = false): Observable<VGGroup> {
    var url = `${this.vcUrl}/${actGroup.vcid}/group/${actGroup._id}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for ${actGroup.name} in in VC ${actGroup.vcid} `);
    return this.http.put<VGUserResponse>(url, actGroup, httpOptions)
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`modified Visbo Group with id=${JSON.stringify(group)}`)),
        catchError(this.handleError<any>('addVCGroup'))
      );
  }


  /** DELETE: remove a Group from the Visbo Center */
  deleteVCGroup (group: VGGroup, sysadmin: boolean = false): Observable<any> {
    var url = `${this.vcUrl}/${group.vcid}/group/${group._id}`;
    if (sysadmin) url = url.concat('?sysadmin=1')
    this.log(`Calling HTTP Request: ${url} for Group ${group.name} / ${group._id} in VC ${group.vcid} `);
    return this.http.delete<VGUserResponse>(url, httpOptions)
    .pipe(
      // map(response => response.vc[0].users),
      tap(groups => this.log(`deleted Visbo Center Group ${group.name}`)),
      catchError(this.handleError<any>('deleteVisboCenterGroup'))
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

  /** Log a VisboCenterService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenterService: ' + message);
  }
}
