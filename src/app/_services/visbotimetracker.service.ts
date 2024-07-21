import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EnvService } from './env.service';
import { MessageService } from './message.service';
import { VtrVisboTracker } from '../_models/employee';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};
@Injectable()
export class VisboTimeTracking {
  
  private timetrackerUrl = this.env.restUrl.concat('/user/timetracker');  // URL to api
  //private baseUrl = 'http://localhost:3484';
  
  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private env: EnvService
  ) { }

 getUserTimeTracker(userId: string, startDate: Date, endDate: Date, asApprover: boolean): Observable<any> {
  console.log(userId);
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  let params = new HttpParams();
  if (startDate) {
    params = params.append('startDate', startDate.toUTCString());
  }
  if (endDate) {
    endDate.setHours(23);
    endDate.setMinutes(59);
    endDate.setSeconds(0);    
    params = params.append('endDate', endDate.toUTCString())
  }
  if (asApprover) {
    params = params.append('asApprover', asApprover)
  }
  const url = `${this.timetrackerUrl}/${userId}`;
  return this.http.get(url, {headers, params});
}

  addUserTimeTracker(data: VtrVisboTracker): Observable<any> {
    const url = `${this.timetrackerUrl}`;
    return this.http.post(url, data);
  }

  editUserTimeTracker(data: VtrVisboTracker, id: number): Observable<any> {
    const url = `${this.timetrackerUrl}/${id}`;
    console.log('id parameter:', id);
    return this.http.patch(url, data);
  }

  approveAllTimeRecords(requestBody: any) {
    const url = `${this.timetrackerUrl}`;
    return this.http.patch(url, requestBody);
  }
}
