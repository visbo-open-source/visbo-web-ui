import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { AuthenticationService } from './authentication.service'

import { environment } from '../../environments/environment';

// import { VisboCenter } from '../_models/visbocenter';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectResponse } from '../_models/visboproject';

import { MessageService } from './message.service';
import { LoginComponent } from '../login/login.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class VisboProjectService {

  //   private vpUrl = 'projects';  // URL to web api on same server
  private vpUrl = environment.restUrl.concat('/vp'); // URL to web api

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private authenticationService: AuthenticationService ) { }


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
        map(response => response.vp), // map the JSON to an object? MS Todo Check ${xeroes[0].Name}
        tap(visboprojects => this.log(`fetched ${visboprojects.length} VisboProjects `)),
        catchError(this.handleError('getVisboProjects', []))
      );
  }

  /** GET VisboProject by id. Return `undefined` when id not found */
  /** MS Todo Check that 404 is called correctly, currently rest server delivers 500 instead of 404 */
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
    // set active user as admin
    //visboproject.Users.push({email:'markus.seyfried@visbo.de', role:'Admin' })
    // var newVP = new VisboProject();
    // newVP.name = visboproject.name;
    // newVP.vcid = visboproject.vcid;
    // MS ToDo: currently no users were set
    // the active user is added to the list by the API Post
    return this.http.post<VisboProjectResponse>(this.vpUrl, visboproject, httpOptions)
      .pipe(
        map(response => {
          // this.log(`added VisboProject Response ${JSON.stringify(response.vp[0])}`)
          return response.vp[0]
        }),
        tap(vp => this.log(`added VisboProject with id=${vp._id}`)),
        catchError(this.handleError<VisboProject>('addVisboProject'))
      );
  }

  /** DELETE: delete the Visbo Project from the server */
  deleteVisboProject (visboproject: VisboProject): Observable<VisboProject> {
    //const id = typeof visboproject === 'number' ? visboproject : visboproject._id;
    const id = visboproject._id;
    const url = `${this.vpUrl}/${id}`;
    this.log(`Calling HTTP Request: ${url} `);

    return this.http.delete<VisboProject>(url, httpOptions)
      .pipe(
        tap(_ => this.log(`deleted VisboProject id=${id}`)),
        catchError(this.handleError<VisboProject>('deleteVisboProject'))
      );
  }

  /** PUT: update the Visbo Project on the server */
  updateVisboProject (visboproject: VisboProject): Observable<any> {
    const url = `${this.vpUrl}/${visboproject._id}`;
    this.log(`Calling HTTP Request PUT: ${url} `);
    return this.http.put(url, visboproject, httpOptions)
      .pipe(
        tap(_ => this.log(`updated VisboProject id=${visboproject._id} url=${this.vpUrl}`)),
        catchError(this.handleError<any>('updateVisboProject'))
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

      this.log(`HTTP Request failed: ${error.message} ${error.status}`);
      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead
      if ( error.status = 401 ) this.authenticationService.logout();
      // TODO: better job of transforming error for user consumption
      this.log(`${operation} failed: ${error.message}`);

      if ( error.status = 401 ) {
        this.authenticationService.logout();
        //this.router.navigate(['/login']); // MS Todo: Set a ReturnURL so the user is redirected to this page again after login
      }
      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectService: ' + message);
  }
}
