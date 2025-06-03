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
// The getUserTimeTracker method is responsible for retrieving time tracking data for a specific user within a defined date range. 
// It also supports fetching data where the user acts as an approver.
// Parameters:
//    userId: string:        The ID of the user whose time tracking data is being requested.
//    startDate: string:     The start date for the time tracking range.
//    endDate: Date:         The end date for the time tracking range, extended to the end of the day.
//    asApprover: boolean:   If true, the method fetches time tracking data where the user is an approver.
 getUserTimeTracker(userId: string, startDate: string, endDate: string, asApprover: boolean): Observable<any> {
  console.log(userId);
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  let params = new HttpParams();
  if (startDate) {
    params = params.append('startDate', startDate);
  }
  if (endDate) {
    params = params.append('endDate', endDate);
  }
  if (asApprover) {
    params = params.append('asApprover', asApprover);
  }
  const url = `${this.timetrackerUrl}/${userId}`;
  return this.http.get(url, {headers, params});
}
// The addUserTimeTracker method is responsible for adding a new time tracking entry for a user. 
// It sends the time tracking data to the server to be stored.
// Parameters:
//    data: VtrVisboTracker:   The time tracking data object that needs to be added. 
//                             This object includes all necessary details, such as the user's ID, time logged, and any related metadata.
  addUserTimeTracker(data: VtrVisboTracker): Observable<any> {
    const url = `${this.timetrackerUrl}`;
    return this.http.post(url, data);
  }

// The editUserTimeTracker method is used to update an existing time tracking entry. 
// It uses a PATCH request to modify the specified entry with new data provided in the VtrVisboTracker object.
// Parameters:
//    data: VtrVisboTracker:   The updated time tracking data object. This should contain all relevant changes to the time entry, 
//                             including logged hours, descriptions, and other metadata.
//    id: number:              The unique identifier of the time tracking entry that needs to be updated.
  editUserTimeTracker(data: VtrVisboTracker, id: number): Observable<any> {
    const url = `${this.timetrackerUrl}/${id}`;
    console.log('id parameter:', id);
    return this.http.patch(url, data);
  }

  // The approveAllTimeRecords method is responsible for approving multiple time tracking records at once. 
  // It sends a PATCH request with the necessary data to the time tracker service.
  // Parameters:
  //    requestBody: any:     The data payload containing the list of time records to be approved along with any relevant metadata. 
  //                          This could include record IDs, approver information, and approval status.
  approveAllTimeRecords(requestBody: any) {
    const url = `${this.timetrackerUrl}`;
    return this.http.patch(url, requestBody);
  }
}
