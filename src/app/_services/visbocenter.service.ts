import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { VisboCenter } from '../_models/visbocenter';
import { VCUser } from '../_models/visbocenter';
import { VCUserResponse } from '../_models/visbocenter';
import { VisboCenterResponse } from '../_models/visbocenter';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboCenterService {

  //   private vcUrl = 'vc';  // URL to web api on same server
  private vcUrl = environment.restUrl.concat('/vc');  // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET VisboCenters from the server */
  getVisboCenters(): Observable<VisboCenter[]> {
    this.log(`Calling HTTP Request: ${this.vcUrl}`);

    return this.http.get<VisboCenterResponse>(this.vcUrl, httpOptions)
      .pipe(
        map(response => response.vc), // map the JSON to an object? MS Todo Check ${xeroes[0].Name}
        tap(visbocenters => this.log(`fetched ${visbocenters.length} VisboCenters `)),
        // tap(visbocenters => this.log(`fetched JSON VisboCenters ${JSON.stringify(visbocenters)}`)),
        catchError(this.handleError('getVisboCenters', []))
      );
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
          const outcome = h ? `fetched` : `did not find`;
          this.log(`${outcome} VisboCenter id=${id}`);
        }),
        catchError(this.handleError<VisboCenter>(`getVisboCenter id=${id}`))
      );
  }

  /** GET VisboCenter by id. Will 404 if id not found */
  getVisboCenter(id: string): Observable<VisboCenter> {
    const url = `${this.vcUrl}/${id}`;
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboCenterResponse>(url).pipe(
      map(response => response.vc[0]),
      tap(visbocenter => this.log(`fetched VC ${visbocenter.name} id=${id}`)),
      catchError(this.handleError<VisboCenter>(`getVisboCenter id=${id}`))
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

  /** POST: add a new Visbo Center to the server */
  addVisboCenter (visbocenter: VisboCenter): Observable<VisboCenter> {
    // MS ToDo: currently no users were set
    // the active user is added to the list by the API Post
    return this.http.post<VisboCenter>(this.vcUrl, visbocenter, httpOptions)
      .pipe(
        map(response => { return JSON.parse(JSON.stringify(response)).vc }), // map the JSON to an object? MS Todo Check ${xeroes[0].Name}
        tap(visbocenter => this.log(`added VisboCenter ${visbocenter[0].name} with id=${visbocenter[0]._id}`)),
        catchError(this.handleError<VisboCenter>('addVisboCenter'))
      );
  }

  /** DELETE: delete the Visbo Center from the server */
  deleteVisboCenter (visbocenter: VisboCenter): Observable<VisboCenter> {
    //const id = typeof visbocenter === 'number' ? visbocenter : visbocenter._id;
    const id = visbocenter._id;
    const url = `${this.vcUrl}/${id}`;
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboCenter>(url, httpOptions).pipe(
      tap(response => this.log(`deleted VisboCenter id=${id}`)),
      catchError(this.handleError<VisboCenter>('deleteVisboCenter'))
    );
  }

  /** PUT: update the Visbo Center on the server */
  updateVisboCenter (visbocenter: VisboCenter): Observable<any> {
    const url = `${this.vcUrl}/${visbocenter._id}`;
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put(url, visbocenter, httpOptions)
      .pipe(
        tap(_ => this.log(`updated VisboCenter ${visbocenter.name} id=${visbocenter._id}`)),
        catchError(this.handleError<any>('updateVisboCenter'))
      );
  }

  /** POST: add a new User to the Visbo Center */
  addVCUser (user: VCUser, message: string, vcid: string): Observable<any> {
    const url = `${this.vcUrl}/${vcid}/user`;
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.role} in VC ${vcid} `);
    return this.http.post<VCUserResponse>(url, user, httpOptions)
      .pipe(
        map(response => {
          // this.log(`added User to Visbo Center Response ${JSON.stringify(response.users)}`)
          return response.users
        }),
        tap(users => this.log(`added Visbo User with id=${users[0]._id}`)),
        catchError(this.handleError<VCUser>('addVCUser'))
      );
  }


  /** DELETE: remove a User from the Visbo Center */
  deleteVCUser (user: VCUser, vcid: string): Observable<any> {
    const url = `${this.vcUrl}/${vcid}/user/${user.userId}?role=${user.role}`;
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.role} in VC ${vcid} `);
    return this.http.delete<VisboCenterResponse>(url, httpOptions).pipe(
//      tap(response => this.log(`deleted VisboCenter User ${user.email}`)),
      map(result => {
        this.log(`Remove User Successful:  ${result.message}`);
        // this.log(`Remove User Successful Detail:  ${JSON.stringify(result)}`);
        return result.vc[0].users;
      }),
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

      this.log(`HTTP Request failed: ${error.error.message} status:${error.status}`);

      // TODO: better job of transforming error for user consumption
      // user no longer authenticated, remove it from the session
      if (error.status == 401) {
        this.log(`${operation} failed: ${error.message}`);
        sessionStorage.removeItem('currentUser');
      }
      // Let the app keep running by returning an empty result.
      return new ErrorObservable(error);
    };
  }

  /** Log a VisboCenterService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenterService: ' + message);
  }
}
