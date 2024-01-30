import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { visboCmpString } from '../../_helpers/visbo.helper';
import { VtrVisboTrackerExtended } from 'src/app/_models/employee';
import { VisboTimeTracking } from 'src/app/_services/visbotimetracker.service';
import { UserService } from 'src/app/_services/user.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { VisboCenter } from 'src/app/_models/visbocenter';
import { VisboCenterService } from 'src/app/_services/visbocenter.service';
import { VisboProjectService } from 'src/app/_services/visboproject.service';
import { VisboProject } from 'src/app/_models/visboproject';
import { VisboSettingService } from 'src/app/_services/visbosetting.service';
import { VisboOrganisation } from 'src/app/_models/visbosetting';
import { VisboUser } from 'src/app/_models/visbouser';

@Component({
  selector: 'app-comp-approvertable',
  templateUrl: './comp-approvertable.component.html',
  styleUrls: ['./comp-approvertable.component.css']
})
export class ApproverComponent implements OnInit {

    // @ViewChild('VtrModalCreate') VtrModalCreate: HTMLElement;
    rows: VtrVisboTrackerExtended[] = [];
    originalColumns: VtrVisboTrackerExtended[] = [];
    startDate: string = new Date(Date.now() - 12096e5).toISOString().slice(0, 10);
    endDate: string = new Date().toISOString().slice(0, 10);
    sortAscending: boolean;
    sortColumn: number;
    userForm: FormGroup = new FormGroup({
      userId: new FormControl('', Validators.required),
      vpid: new FormControl('', Validators.required),
      vcid: new FormControl('', Validators.required),
      roleId: new FormControl('', Validators.required),
      date: new FormControl('', Validators.required),
      time: new FormControl('', Validators.required),
      notes: new FormControl('', Validators.required),
      status: new FormControl(null),
      failed: new FormControl(null),
      approvalId: new FormControl(null),
      approvalDate: new FormControl(null)
    });
    selectedRow: VtrVisboTrackerExtended;
    showModal = false;
    vtrApprove = ['Yes', 'No'];
    visboCentersList: VisboCenter[] = [];
    visboProjectsList: VisboProject[] = [];  
    indexedProjectsList: VisboProject[] = [];
    selectedCenterProjects: VisboProject[];
    hasOrga = false;
    vcOrga: VisboOrganisation[] = [];
    vcActive: VisboCenter;
    vpActiveName: string;
    vcActiveName: string;
    vtrActiveUserName: string;
    isCreatorOfRecord: boolean;
    managerTimeTrackerList: VtrVisboTrackerExtended[]=[];
    originalManagerList: VtrVisboTrackerExtended[]=[];
    private userId: string;
    userName: string;
    filterName: string = "";
    private userEmail: string;
    private managerUid: number;
    userIsApprover: boolean;
  
    constructor(
      private trackerService: VisboTimeTracking,
      private userService: UserService,
      private authService: AuthenticationService,
      private visboCenterWs: VisboCenterService,
      private visboProjectService: VisboProjectService,
      private visboSettingService: VisboSettingService,
    ) {
    }
  
    ngOnInit(): void {
      this.visboCenterWs.getVisboCenters().subscribe(
        visboCentersList => {
          this.visboCentersList = visboCentersList;
          this.getProfile();
        },
        error => {
          console.log('get VCs failed: error: %d message: %s', error.status, error.error.message);
        }
      );
      this.getProjectList();
      this.userForm.get('vcid').valueChanges.subscribe((value) => {
        if (value) {
          this.onCenterChange(value);
        }
      });
    }
  
    onCenterChange(selectedCenterId: string): void {
      this.visboProjectService.getVisboProjects(selectedCenterId).subscribe(
        visboProjectsList => {
          this.selectedCenterProjects = visboProjectsList.filter(project => project.vpType === 0);
        },
        error => {
          console.log(error);
        }
      );
      this.getOrganizationList(selectedCenterId);
    }
  
    addEmployee() {
      this.showModal = true;
      this.trackerService.addUserTimeTracker({...this.userForm.value, status: 'No', name: this.userName}).subscribe(() => {
        this.userForm.reset();
        this.getTimeTrackerList();
      }, error => {
        console.log('Error:', error);
      });
      this.showModal = false;
    }
  
    openEditModal(user: VtrVisboTrackerExtended, isCreator?) {
      if (isCreator) {
        this.showModal = true;
        this.isCreatorOfRecord = true;
      }
      this.vpActiveName = user.vpName;
      this.vcActiveName = user.vcName;
      this.vtrActiveUserName = user.userName;
  
      this.userForm.patchValue({
        userId: user.userId,
        vcid: user.vcid,
        vpid: user.vpid,
        date: user.date,
        time: user.time,
        notes: user.notes,
        roleId: user.roleId,
        approvalId: null,
        approvalDate: null
      });
    }
  
    saveChanges() {
      const employeeId = this.selectedRow.userId;
      const timeTrackerId = this.selectedRow.timeTrackerId;
      // const updatedRow = {
      //   ...this.userForm.value,
      //   employeeId,
      // };
      const updatedRow = this.selectedRow;

      if (!this.isCreatorOfRecord) {
        updatedRow.approvalDate = new Date().toISOString();
        updatedRow.approvalId = this.userId;
        updatedRow.status = this.userForm.value.status;
      }
      this.trackerService.editUserTimeTracker(updatedRow, timeTrackerId)
        .subscribe(
          () => {
            this.userForm.reset();
            this.getTimeTrackerList();
          },
          (error) => {
            console.error('Error updating row:', error);
          }
        );
      this.isCreatorOfRecord = false;
    }
  
    selectRow(user:VtrVisboTrackerExtended) {
      this.selectedRow = user;
      this.userForm.patchValue({
        userId: user.userId,
        vcid: user.vcid,
        vpid: user.vpid,
        roleId: user.roleId,
        date: user.date,
        notes: user.notes,
        time: user.time,
        status: user.status,
        approvalId: user?.approvalId || null,
        approvalDate: user?.approvalDate || null
      });
    }
  
    sortVTRTable(n: number, isManager: boolean=false): void {
      if (isManager) {
        if (n !== undefined) {
          if (!this.managerTimeTrackerList) {
            return;
          }
          if (n !== this.sortColumn) {
            this.sortColumn = n;
            this.sortAscending = undefined;
          }
          if (this.sortAscending === undefined) {
            this.sortAscending = (n === 1 || n === 3);
          } else {
            this.sortAscending = !this.sortAscending;
          }
        }
        this.managerTimeTrackerList.sort((a, b) => {
          switch (this.sortColumn) {
            case 1:             
             return (visboCmpString(b.userName.toLowerCase(), a.userName.toLowerCase()) || (b.date.localeCompare(a.date)) ) ;
            case 2:
              return (b.vpName.localeCompare(a.vpName) || (b.date.localeCompare(a.date)) );
            case 3:
              return a.date.localeCompare(b.date);
            case 4:
              return a.time - b.time;
            case 5:
              return a.status.localeCompare(b.status);
            case 6:
              return (visboCmpString(a.failed, b.failed));
          }
        });
        if (!this.sortAscending) {
          this.managerTimeTrackerList.reverse();
        }
      }  
    }
  
    updateFilter() {
      var approvableTimeRecs:VtrVisboTrackerExtended[] = [];
      this.managerTimeTrackerList = this.originalManagerList;
      // this.originalColumns = this.rows;
      if (!!this.startDate?.length || !!this.endDate?.length) {
        const startDate = this.startDate?.length ? new Date(this.startDate) : null;
        const endDate = this.endDate?.length ? new Date(this.endDate) : null;
  
        this.managerTimeTrackerList = this.managerTimeTrackerList?.filter(item => {
          var identicalName = true;
          if (this.filterName) {
            identicalName = (item.userName.toLowerCase().search(this.filterName.toLowerCase()) > -1);
          }
          if (item.status == 'No') {
            approvableTimeRecs.push(item)
          }
          const date = new Date(item.date);
          if (startDate && !endDate) {
            return (date >= startDate) && identicalName;
          } else if (!startDate && endDate) {
            return (date <= endDate) && identicalName;;
          } else {
            return (date >= startDate) && (date <= endDate) && identicalName;
          }
        });

      }
    }
  
    private getProjectList(): void {
      this.visboProjectService.getVisboProjects(null)
        .subscribe(
          visboProjectsList => {
            visboProjectsList.forEach(vp => this.indexedProjectsList[vp._id] = vp)
            this.visboProjectsList = visboProjectsList;
            // this.visboProjectsList = visboProjectsList.filter(item => item.vpType == 0);
          },
          ({error, status}) => {
            console.log('get VPs failed: error: %d message: %s', status, error.message); // log to console instead
          }
        );

    }
  
    
    getActiveUser(): VisboUser {
      return JSON.parse(localStorage.getItem('currentUser'));
    }
   
  
    private getProfile() {
        const user = this.getActiveUser();
        this.userId = user._id;
        this.userName = user.profile.firstName + ' ' + user.profile.lastName;
        this.userEmail = user.email;
        this.userIsApprover = user.status.isApprover;
        console.log("getProfile: userIsApprover: ", this.userIsApprover);
        this.userForm.get('userId').setValue(user._id);
        this.getTimeTrackerList();
    }
  
    private getTimeTrackerList() {
      this.trackerService.getUserTimeTracker(this.userId).subscribe(({timeEntries, managerView}) => {        
        this.managerTimeTrackerList = managerView?.map(record => {
          const centerName = this.visboCentersList.find(vc => vc._id === record.vcid)?.name;
          const projectName = this.visboProjectsList.find(vp => vp._id === record.vpid)?.name;
          if (centerName && projectName) {
            return {
              userId: record.userId,
              vcid: record.vcid,
              vpid: record.vpid,
              roleId: record.roleId,
              notes: record.notes,
              status: record.status,
              time: record.time.$numberDecimal,
              date: record.date?.split('T')[0],
              approvalId: record.approvalId,
              approvalDate: record.approvalDate,
              vcName: centerName,
              vpName: projectName,
              timeTrackerId: record._id,
              userName: record.name,
              failed: record.failed
            }; 
          } else {

          }
        });
        this.originalManagerList = [];
        // delete the items which are undefined
        this.managerTimeTrackerList.forEach( item => {
          if (item) {this.originalManagerList.push(item)}
        });
        this.managerTimeTrackerList = this.originalManagerList;
        
        // ur: don't know why this is needed
        //
        // if (this.managerTimeTrackerList?.length) {
        //   this.getOrganizationList(this.visboCentersList[0]._id);         
        // }
       
        this.sortVTRTable(undefined, true);
        this.updateFilter();
      });
    }
  
    clearEditModal() {
      this.isCreatorOfRecord = false;
      this.userForm.reset();
      this.userForm.get('userId').setValue(this.userId);
    }
  
    approveAllTimeRecords() {
      const timeTrackerIds =
        this.managerTimeTrackerList
          .map(timeTrackerElem => {
            return {
              id: timeTrackerElem.timeTrackerId,
              vpid: timeTrackerElem.vpid,
            };
          });
      //console.log(this.managerTimeTrackerList);
      const requestBody = {
        status: "Yes",
        approvalId: this.userId,
        approvalDate: new Date().toISOString(),
        approvalList: timeTrackerIds
      };
      this.trackerService.approveAllTimeRecords(requestBody).subscribe(() => {
        this.getTimeTrackerList();
      });
    }
  
    checkIsCreatorOfRecord({userId}) {
      return userId === this.userId;
    }
  
    protected readonly event = event;
  
    checkHours(event: Event) {
      if (event.target['value'] > 24) {
        event.target['value'] = 24;
      } 
      if (event.target['value'] < 0) {
        event.target['value'] = 0;
      }
    }
  
    private getOrganizationList(selectedCenterId: string) {
      this.visboSettingService.getVCOrganisations(
        selectedCenterId, false, new Date().toISOString(), true, false).subscribe(
        organisation => {
          this.vcOrga = organisation;
          this.hasOrga = organisation?.length > 0;
          var role = organisation[0].allRoles.find(role => (role.email === this.userEmail && role.isSummaryRole && !role.isExternRole));        
          const roleId = role?.uid;
       
          if (this.managerTimeTrackerList) {
            this.managerUid = roleId;
          }
          if (this.hasOrga) {
            this.userForm.get('roleId').setValue(roleId);
          }
        },
        error => {
          console.log(error);
        });
    }


    getTimeRecFailed(user: VtrVisboTrackerExtended): string {
      let message = '';
      message = user.failed;
      return message || '';
    }
    
    checkApprovableTimeRecs() {
      var approvableTimeRecs:VtrVisboTrackerExtended[] = [];
      this.managerTimeTrackerList.forEach(item=> {
        if (item.status == 'No') {
            approvableTimeRecs.push(item);
        }
      });    
      return approvableTimeRecs.length > 0;
    }
    
}
