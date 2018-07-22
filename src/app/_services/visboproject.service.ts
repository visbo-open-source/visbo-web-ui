import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

// import { VisboCenter } from '../_models/visbocenter';
import { VisboProject, VisboProjectResponse } from '../_models/visboproject';
import { VPUser, VPUserResponse } from '../_models/visboproject';

import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboProjectService {

  //   private vpUrl = 'projects';  // URL to web api on same server
  private vpUrl = environment.restUrl.concat('/vp'); // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) { }


  /** GET VisboProjects from the server if id is specified get only projects of this vcid*/
  getVisboProjects(id: string): Observable<VisboProject[]> {
    const url = `${this.vpUrl}`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let params = new HttpParams();
    if (id) {
      params = params.append('vcid', id);
    }
    // this.log(`Calling HTTP Request: ${url} Options: ${params}`);
    return this.http.get<VisboProjectResponse>(this.vpUrl, { headers , params })
      .pipe(
        map(response => response.vp),
        tap(visboprojects => this.log(`fetched ${visboprojects.length} VisboProjects `)),
        catchError(this.handleError('getVisboProjects', []))
      );
  }

  /** GET VisboProject by id. Return `undefined` when id not found */
  /** Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
  getVisboProjectNo404<Data>(id: string): Observable<VisboProject> {
    const url = `${this.vpUrl}/?id=${id}`;
    this.log(`Calling HTTP Request: ${this.vpUrl}`);
    return this.http.get<VisboProject[]>(url)
      .pipe(
        map(visboprojects => visboprojects[0]), // returns a {0|1} element array
        tap(h => {
          const outcome = h ? `fetched` : `did not find`;
          this.log(`${outcome} VisboProject id=${id}`);
        }),
        catchError(this.handleError<VisboProject>(`getVisboProject id=${id}`))
      );
  }

  /** GET VisboProject by id. Will 404 if id not found */
  getVisboProject(id: string): Observable<VisboProject> {
    const url = `${this.vpUrl}/${id}`;
    this.log(`Calling HTTP Request for a specific entry: ${url}`);
    return this.http.get<VisboProjectResponse>(url).pipe(
      map(response => response.vp[0]),
      // tap(visboproject => this.log(`fetched vp id=${id} ${JSON.stringify(visboproject)}`)),
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
  deleteVisboProject (visboproject: VisboProject): Observable<any> {
    //const id = typeof visboproject === 'number' ? visboproject : visboproject._id;
    const id = visboproject._id;
    const url = `${this.vpUrl}/${id}`;
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboProjectResponse>(url, httpOptions)
      .pipe(
        tap(_ => this.log(`deleted VisboProject id=${id}`)),
        catchError(this.handleError('deleteVisboProject'))
      );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProject (visboproject: VisboProject): Observable<VisboProject> {
    const url = `${this.vpUrl}/${visboproject._id}`;
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put<VisboProjectResponse>(url, visboproject, httpOptions)
      .pipe(
        map(response => response.vp[0]),
        tap(_ => this.log(`updated VisboProject id=${visboproject._id} url=${this.vpUrl}`)),
        catchError(this.handleError<any>('updateVisboProject'))
      );
  }

  /** POST: add a new User to the Visbo Project */
  addVPUser (user: VPUser, message: string, vpid: string): Observable<VPUser> {
    const url = `${this.vpUrl}/${vpid}/user`;
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.role} in VP ${vpid} `);
    return this.http.post<VPUserResponse>(url, user, httpOptions)
      .pipe(
        map(response => response.users[0]),
        tap(users => this.log(`added Visbo User with id=${users._id}`)),
        catchError(this.handleError<VPUser>('addVPUser'))
      );
  }


  /** DELETE: remove a User from the Visbo Project */
  deleteVPUser (user: VPUser, vpid: string): Observable<[VPUser]> {
    const url = `${this.vpUrl}/${vpid}/user/${user.userId}?role=${user.role}`;
    this.log(`Calling HTTP Request: ${url} for ${user.email} as ${user.role} in VP ${vpid} `);
    return this.http.delete<VisboProjectResponse>(url, httpOptions)
    .pipe(
      map(response => response.vp[0].users),
      tap(users => this.log(`deleted VisboProject User ${user.email} from ${vpid} `)),
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

      this.log(`HTTP Request failed: ${error.error.message} ${error.status}`);
      // TODO: send the error to remote logging infrastructure
      this.log(`${operation} failed: ${error.error.message}`);
      // Let the app keep running by returning an empty result.
      return new ErrorObservable(error);
    };
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectService: ' + message);
  }
}
