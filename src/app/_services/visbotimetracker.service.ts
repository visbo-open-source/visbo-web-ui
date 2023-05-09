import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VtrVisboTracker } from '../_models/employee';

@Injectable({
  providedIn: 'root'
})
export class VisboTimeTracking {
  private baseUrl = 'http://localhost:3484';

  constructor(private http: HttpClient) { }

 getUserTimeTracker(userId: string): Observable<any> {
  console.log(userId)
  const url = `${this.baseUrl}/user/timetracker/${userId}`;
  return this.http.get(url);
}

  addUserTimeTracker(data: VtrVisboTracker): Observable<any> {
    const url = `${this.baseUrl}/user/timetracker`;
    return this.http.post(url, data);
  }

  editUserTimeTracker(data: VtrVisboTracker, id: number): Observable<any> {
    const url = `${this.baseUrl}/user/timetracker/${id}`;
    console.log('id parameter:', id);
    return this.http.patch(url, data);
  }

  approveAllTimeRecords(requestBody: any) {
    const url = `${this.baseUrl}/user/timetracker`;
    return this.http.patch(url, requestBody);
  }
}
