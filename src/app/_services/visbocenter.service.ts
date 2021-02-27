import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { EnvService } from './env.service';

import { VisboCenter, VisboCenterResponse } from '../_models/visbocenter';
import { VGPermission, VGGroup, VGUserGroup, VGResponse, VGUserGroupMix } from '../_models/visbogroup';
import { MessageService } from './message.service';

const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable()
export class VisboCenterService  {
  //   private vcUrl = 'vc';  // URL to api on same server
  private vcUrl = this.env.restUrl.concat('/vc');  // URL to web api
  private combinedPerm: VGPermission;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }


  /** GET VisboCenters from the server */
  getVisboCenters(sysadmin = false, deleted = false): Observable<VisboCenter[]> {
    const url = this.vcUrl;
    let params = new HttpParams();

    if (sysadmin) { params = params.append('sysadmin', '1'); }
    if (deleted) { params = params.append('deleted', '1'); }

    this.log(`Calling HTTP Request: ${url} `);
    return this.http.get<VisboCenterResponse>(url, { headers , params })
      .pipe(
        map(response => response.vc),
        tap(visbocenters => this.log(`fetched ${visbocenters.length} VisboCenters `)),
        catchError(this.handleError<VisboCenter[]>('getVisboCenters'))
      );
  }

  /** GET VisboCenters from the server */
  getSysVisboCenter(): Observable<VisboCenter[]> {
    const url = this.vcUrl;
    let params = new HttpParams();
    params = params.append('systemvc', 'true');
    params = params.append('sysadmin', '1');
    this.log(`Calling HTTP Request for SysVC: ${url}`);

    return this.http.get<VisboCenterResponse>(url, { headers , params }).pipe(
      map(response => {
                this.log(`fetched System VisboCenter ${JSON.stringify(response)}`);
                if (response.vc && response.vc.length > 0) {
                  response.vc[0].perm = response.perm;
                  this.combinedPerm = response.perm;
                  localStorage.setItem('combinedPerm', JSON.stringify(response.perm));
                  localStorage.setItem('systemVC', response.vc[0]._id);
                }
                return response.vc;
              }),
        tap(visbocenters => {
          this.log(`fetched System VisboCenter user Role is ${visbocenters[0].perm.system || 'None'}`);
        }),
        catchError(this.handleError<VisboCenter[]>('getSysVisboCenters'))
      );
  }

  /* Role of User in sysadmin */
  getSysAdminRole(): VGPermission {
    let result: VGPermission;
    if (this.combinedPerm === undefined) {
      result = JSON.parse(localStorage.getItem('combinedPerm'));
    } else {
      result = this.combinedPerm;
    }
    this.log(`SysAdmin Role: ${JSON.stringify(result)}`);
    return result;
  }

  /* VCID of System */
  getSysVCId(): string {
    const result = localStorage.getItem('systemVC');
    this.log(`Sysem VC ID: ${result}`);

    return result;
  }

  /** GET VisboCenter by id. Return `undefined` when id not found */
  /** Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
  // getVisboCenterNo404<Data>(id: string): Observable<VisboCenter> {
  //   const url = `${this.vcUrl}/?id=${id}`;
  //   this.log(`Calling HTTP Request: ${this.vcUrl}`);
  //   return this.http.get<VisboCenter[]>(url)
  //     .pipe(
  //       map(visbocenters => visbocenters[0]), // returns a {0|1} element array
  //       tap(h => {
  //         var outcome = h ? `fetched` : `did not find`;
  //         this.log(`${outcome} VisboCenter ${id}`);
  //       }),
  //       catchError(this.handleError<VisboCenter>(`getVisboCenter id: ${id}`))
  //     );
  // }

  /** GET VisboCenter by id. Will 404 if id not found */
  getVisboCenter(id: string, sysadmin = false, deleted = false): Observable<VisboCenter> {
    const url = `${this.vcUrl}/${id}`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboCenterResponse>(url, { headers , params }).pipe(
      map(response => {
                // TODO: is there a better way to transfer the perm?
                response.vc[0].perm = response.perm;
                return response.vc[0];
              }),
      tap(visbocenter => this.log(`fetched VC ${visbocenter.name} id:${id} perm:${JSON.stringify(visbocenter.perm)}`)),
      catchError(this.handleError<VisboCenter>(`getVisboCenter id:${id}`))
    );
  }

  /** GET Capacity of VisboCenter by id. Will 404 if id not found */
  getCapacity(id: string, refDate: Date, roleID: string, hierarchy = false, pfv = false, sysadmin = false, deleted = false, perProject = false): Observable<VisboCenter> {
    const url = `${this.vcUrl}/${id}/capacity`;
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
    if (roleID) {
      this.log(`Calling RoleID: ${roleID}`);
      params = params.append('roleID', roleID);
    }
    this.log(`Calling Capacity for a VC: ${url} params  ${JSON.stringify(params)}`);
    return this.http.get<VisboCenterResponse>(url, { headers , params }).pipe(
      map(response => {
                // TODO: is there a better way to transfer the perm?
                response.vc[0].perm = response.perm;
                return response.vc[0];
              }),
      tap(visbocenter => this.log(`fetched Capacity for VC ${visbocenter.name} id:${id} perm:${JSON.stringify(visbocenter.perm)}`)),
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
  //     catchError(this.handleError<VisboCenter[]>('searchVisboCenters'))
  //   );
  // }

  //////// Save methods //////////

  /** POST: a new Visbo Center to the server */
  addVisboCenter (visbocenter: VisboCenter): Observable<VisboCenter> {
    const url = this.vcUrl;
    let params = new HttpParams();
    params = params.append('sysadmin', '1');

    this.log(`Calling HTTP Request: ${url} ${JSON.stringify(visbocenter)}`);
    return this.http.post<VisboCenterResponse>(url, visbocenter, { headers , params }).pipe(
      map(response => response.vc[0] ),
      tap(vc => this.log(`added VisboCenter ${vc.name} with id=${vc._id}`)),
      catchError(this.handleError<VisboCenter>('addVisboCenter'))
    );
  }


  /** DELETE: delete the Visbo Center from the server */
  deleteVisboCenter (visbocenter: VisboCenter, sysadmin = false, deleted = false): Observable<VisboCenterResponse> {
    const id = visbocenter._id;
    const url = `${this.vcUrl}/${id}`;
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboCenterResponse>(url, { headers , params }).pipe(
      tap(() => this.log(`deleted VisboCenter id=${id}`)),
      catchError(this.handleError<VisboCenterResponse>('deleteVisboCenter'))
    );
  }

  /** PUT: update the Visbo Center on the server */
  updateVisboCenter (visbocenter: VisboCenter, sysadmin = false, deleted = false): Observable<VisboCenter> {
    const url = `${this.vcUrl}/${visbocenter._id}`;
    let params = new HttpParams();

    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboCenterResponse>(url, visbocenter, { headers , params })
      .pipe(
        map(response => response.vc[0] ),
        tap(vc => this.log(`updated VisboCenter ${vc.name} with id=${vc._id}`)),
        catchError(this.handleError<VisboCenter>('updateVisboCenter'))
      );
  }

  // GET VisboCenter Users for a specified VC from the server
  getVCUsers(vcid: string, sysadmin = false, deleted = false): Observable<VGUserGroupMix> {
    const url = `${this.vcUrl}/${vcid}/group?userlist=1`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    if (deleted) {
      params = params.append('deleted', '1');
    }
    this.log(`Calling HTTP Request GET Users: ${url} `);
    return this.http.get<VGResponse>(url, { headers , params })
      .pipe(
        map(response => {
          const userGroupMix = new VGUserGroupMix();
          userGroupMix.users = response.users;
          userGroupMix.groups = response.groups;
          userGroupMix.vpusers = response.vpusers;
          return userGroupMix;
        }),
        tap(() => this.log(`fetched Users & Groups Users `)),
        catchError(this.handleError<VGUserGroupMix>('getVisboCenterUsers'))
      );
  }

  /** POST: add a new User to the Visbo Center */
  addVCUser (email: string, groupId: string, message: string, vcid: string, sysadmin?: boolean): Observable<VGGroup> {
    const url = `${this.vcUrl}/${vcid}/group/${groupId}/user`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    const reqBody = {
      email: email,
      message: message || ''
    };
    this.log(`Calling HTTP Request: ${url} for ${email} `);
    return this.http.post<VGResponse>(url, reqBody, { headers , params })
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo User to Group with id=${group._id}`)),
        catchError(this.handleError<VGGroup>('addVCUser'))
      );
  }

  /** DELETE: remove a User from the Visbo Center */
  deleteVCUser (user: VGUserGroup, vcid: string, sysadmin?: boolean): Observable<VGResponse> {
    const url = `${this.vcUrl}/${vcid}/group/${user.groupId}/user/${user.userId}`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.groupName} `);
    return this.http.delete<VGResponse>(url, { headers , params })
    .pipe(
      // map(response => response.vc[0].users),
      tap(() => this.log(`deleted Visbo Center User ${user.email}`)),
      catchError(this.handleError<VGResponse>('deleteVisboCenterUser'))
    );
  }

  /** POST: add a new Group to the Visbo Center */
  addVCGroup (newGroup: VGGroup, sysadmin?: boolean): Observable<VGGroup> {
    const url = `${this.vcUrl}/${newGroup.vcid}/group`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${newGroup.name} `);
    return this.http.post<VGResponse>(url, newGroup, { headers , params })
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`added Visbo Group with id=${group._id}`)),
        catchError(this.handleError<VGGroup>('addVCGroup'))
      );
  }

  /** PUT: modify a VC Group in the Visbo Center (Change: Name, Global, Permission)*/
  modifyVCGroup (actGroup: VGGroup, sysadmin?: boolean): Observable<VGGroup> {
    const url = `${this.vcUrl}/${actGroup.vcid}/group/${actGroup._id}`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for ${actGroup.name} Perm: ${JSON.stringify(actGroup.permission)} `);
    return this.http.put<VGResponse>(url, actGroup, { headers , params })
      .pipe(
        map(response => response.groups[0]),
        tap(group => this.log(`modified Visbo Group with id=${JSON.stringify(group)}`)),
        catchError(this.handleError<VGGroup>('addVCGroup'))
      );
  }


  /** DELETE: remove a Group from the Visbo Center */
  deleteVCGroup (group: VGGroup, sysadmin?: boolean): Observable<VGResponse> {
    const url = `${this.vcUrl}/${group.vcid}/group/${group._id}`;
    let params = new HttpParams();
    if (sysadmin) {
      params = params.append('sysadmin', '1');
    }
    this.log(`Calling HTTP Request: ${url} for Group ${group.name} `);
    return this.http.delete<VGResponse>(url, { headers , params })
    .pipe(
      // map(response => response.vc[0].users),
      tap(() => this.log(`deleted Visbo Center Group ${group.name}`)),
      catchError(this.handleError<VGResponse>('deleteVisboCenterGroup'))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation') {
    this.log(`HTTP Request ${operation} failed`);
    // eslint-disable-next-line
    return (error: any): Observable<T> => {

      this.log(`HTTP Request ${operation} failed: ${error.error.message} status:${error.status}`);

      // Let the app keep running by returning an empty result.
      return throwError(error);
      // return new ErrorObservable(error);
    };
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenterService: ' + message);
  }
}
