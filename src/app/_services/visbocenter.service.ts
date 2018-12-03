import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs'; // only need to import from rxjs
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboCenter, VisboCenterResponse } from '../_models/visbocenter';
import { VCUser, VCUserResponse } from '../_models/visbocenter';

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
  getSysVisboCenters(): Observable<VisboCenter[]> {
    var url = this.vcUrl + '?systemvc=true';
    var sysVCRole = undefined;
    var currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    this.log(`Calling HTTP Request for SysVC: ${url} for user ${currentUser.email}`);

    return this.http.get<VisboCenterResponse>(url, httpOptions).pipe(
        map(response => response.vc),
        tap(visbocenters => {
          sysVCRole = visbocenters[0].users.find(user => user.email == currentUser.email && user.role == 'Admin') ? 'Admin' : undefined;
          if (!sysVCRole) {
            // sysVCRole = this.sysvisbocenter.users.find(user => user.email == currentUser.email && user.role == 'User') ? 'User' : undefined;
          }
          sessionStorage.setItem('isSysAdmin', sysVCRole);
          this.log(`fetched ${visbocenters.length} VisboCenters user Role is ${sysVCRole || 'None'}`)
        }),
        catchError(this.handleError('getVisboCenters', []))
      );
  }

  /* Role of User in sysAdmin */
  getSysAdminRole() {
    var result = sessionStorage.getItem('isSysAdmin') || undefined;
    this.log(`SysAdmin Role: ${result}`);

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
      map(response => response.vc[0]),
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

  /** POST: aa a new Visbo Center to the server */
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
  updateVisboCenter (visbocenter: VisboCenter): Observable<VisboCenter> {
    const url = `${this.vcUrl}/${visbocenter._id}`;
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboCenterResponse>(url, visbocenter, httpOptions)
      .pipe(
        map(response => response.vc[0] ),
        tap(vc => this.log(`updated VisboCenter ${vc.name} with id=${vc._id}`)),
        catchError(this.handleError<any>('updateVisboCenter'))
      );
  }

  /** POST: add a new User to the Visbo Center */
  addVCUser (user: VCUser, message: string, vcid: string): Observable<VCUser> {
    const url = `${this.vcUrl}/${vcid}/user`;
    var reqBody: any = {};
    reqBody.email = user.email;
    reqBody.role = user.role;
    reqBody.message = message;
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.role} in VC ${vcid} `);
    return this.http.post<VCUserResponse>(url, reqBody, httpOptions)
      .pipe(
        map(response => response.users[0]),
        tap(users => this.log(`added Visbo User with id=${users._id}`)),
        catchError(this.handleError<VCUser>('addVCUser'))
      );
  }


  /** DELETE: remove a User from the Visbo Center */
  deleteVCUser (user: VCUser, vcid: string): Observable<[VCUser]> {
    const url = `${this.vcUrl}/${vcid}/user/${user.userId}?role=${user.role}`;
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.role} in VC ${vcid} `);
    return this.http.delete<VisboCenterResponse>(url, httpOptions)
    .pipe(
      map(response => response.vc[0].users),
      tap(users => this.log(`deleted VisboProject User ${user.email}`)),
      catchError(this.handleError<any>('deleteVisboCenterUser'))
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
