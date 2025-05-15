import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';
import { ActivatedRoute, Router } from '@angular/router';

import { visboCmpString ,getErrorMessage, visboGetShortText} from '../../_helpers/visbo.helper';
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
import { TTParams } from 'src/app/_models/employee';



import * as XLSX from 'xlsx';
import { SubjectSubscriber } from 'rxjs/internal/Subject';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';


class exportVTR {
  userID: string;
  userName: string;
  vcName: string;
  vpid: string;
  vpName: string;
  roleID: number;
  date: Date;
  time: number;
  description: string;
  approved: string;
  approvalID: string;
  approverName: string;
  approvalDate: Date;  
  result: string;
}

@Component({
  selector: 'app-comp-approvertable',
  templateUrl: './comp-approvertable.component.html',
  styleUrls: ['./comp-approvertable.component.css']
})
export class ApproverComponent implements OnInit {

    // @ViewChild('VtrModalCreate') VtrModalCreate: HTMLElement;
    rows: VtrVisboTrackerExtended[] = [];
    originalColumns: VtrVisboTrackerExtended[] = [];
    startDate: string;
    endDate: string;
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
    managerTimeTrackerList: VtrVisboTrackerExtended[] = [];
    originalManagerList: VtrVisboTrackerExtended[] = [];
    private userId: string;
    userName: string;
    filterName: string = "";
    private userEmail: string;
    private managerUid: number;
    userIsApprover: boolean;
    noSpinner: boolean = false;
  
    constructor(
      private trackerService: VisboTimeTracking,
      private translate: TranslateService,
      private messageService: MessageService,
      private route: ActivatedRoute,
      private router: Router,
      private alertService: AlertService,
      private userService: UserService,
      private authService: AuthenticationService,
      private visboCenterWs: VisboCenterService,
      private visboProjectService: VisboProjectService,
      private visboSettingService: VisboSettingService,
    ) {
    }
  
    ngOnInit(): void {

      const from = this.route.snapshot.queryParams['from'];
      const to = this.route.snapshot.queryParams['to'];
      if (!from) {
        // startDate set on the first day of the last month
        let dd = new Date();
        dd.setMonth(dd.getMonth() -1);
        dd.setDate(1);        
        this.startDate = dd.toISOString().slice(0, 10);
        // from WTT
        //this.startDate = new Date(Date.now() - (12096e5*3)).toISOString().slice(0, 10);
      }
      if (!to) {
        this.endDate = new Date().toISOString().slice(0, 10);
      }
     
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
          if (!this.originalManagerList) {
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
        this.originalManagerList.sort((a, b) => {
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
          this.originalManagerList.reverse();
        }
      }  
    }
  
    updateFilter() {
      var approvableTimeRecs:VtrVisboTrackerExtended[] = [];
      this.originalManagerList = this.managerTimeTrackerList;

      if (!!this.startDate?.length || !!this.endDate?.length) {
        const startDate = this.startDate?.length ? new Date(this.startDate) : null;
        const endDate = this.endDate?.length ? new Date(this.endDate) : null;
  
        this.originalManagerList = this.managerTimeTrackerList?.filter(item => {
          var identicalName = true;
          if (this.filterName) {
            identicalName = (item.userName.toLowerCase().search(this.filterName.toLowerCase()) > -1);
          }
          if (item.status == 'No') {
            approvableTimeRecs.push(item)
          }
          return identicalName;
          // const date = new Date(item.date);
          // if (startDate && !endDate) {
          //   return (date >= startDate) && identicalName;
          // } else if (!startDate && endDate) {
          //   return (date <= endDate) && identicalName;;
          // } else {
          //   return (date >= startDate) && (date <= endDate) && identicalName;
          // }
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
  
    getTimeTrackerList() {
      this.noSpinner = false;
      this.originalManagerList = [];
      this.trackerService.getUserTimeTracker(this.userId, this.startDate, this.endDate, true).subscribe(({timeEntries, managerView}) => {    
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
                date: record.date,
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
          
          if (this.managerTimeTrackerList.length > 0) {

            // delete the items which are undefined            
            this.managerTimeTrackerList.forEach( item => {
              if (item) {this.originalManagerList.push(item)}
            });
            this.managerTimeTrackerList = this.originalManagerList;
            this.sortVTRTable(undefined, true);
            this.updateFilter();
            this.noSpinner = true;
        
        } else {
          this.managerTimeTrackerList = undefined;
          this.noSpinner = true;          
        }      
      });
    }
  
    clearEditModal() {
      this.isCreatorOfRecord = false;
      this.userForm.reset();
      this.userForm.get('userId').setValue(this.userId);
    }
  
    approveAllTimeRecords() {
      const timeTrackerIds =
        this.originalManagerList
          .map(timeTrackerElem => {
            return {
              id: timeTrackerElem.timeTrackerId,
              vpid: timeTrackerElem.vpid,
            };
          });
      //console.log(this.originalManagerList);
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
       
          if (this.originalManagerList) {
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
      this.originalManagerList.forEach(item=> {
        if (item.status == 'No') {
            approvableTimeRecs.push(item);
        }
      });    
      return approvableTimeRecs.length > 0;
    }

     
  copyTimeRecords(vtr: VtrVisboTrackerExtended, name: string): exportVTR {
    
    const copy = new exportVTR();    
    copy.userName = vtr.userName;
    copy.userID = vtr.userId;
    copy.date = new Date(vtr.date);
    copy.vcName = vtr.vcName;
    copy.vpid = vtr.vpid;
    copy.vpName = vtr.vpName;
    copy.roleID = vtr.roleId * 1;
    copy.time = vtr.time * 1;
    copy.description = vtr.notes;
    copy.approved = vtr.status;    
    copy.approvalID = vtr.approvalId;
    if (vtr.approvalId) {
      copy.approverName = this.userEmail
    } else {
      copy.approverName = ""
    }
    copy.approverName = "";
    if (vtr.approvalDate) {
      copy.approvalDate = new Date(vtr.approvalDate);
    } 
    if (vtr.failed) {
      copy.result = vtr.failed
    } else {
      copy.result = ""
    }  

    if (vtr.approvalDate) {
      copy.approvalDate = new Date(vtr.approvalDate);
    } else {
      copy.approvalDate = undefined
    }
    if (vtr.failed) {
      copy.result = vtr.failed
    } else {
      copy.result = ""
    }  
    delete copy.vpid;
    delete copy.userID;    
    delete copy.approvalID;
    return copy;
  }

  exportExcel(): void {
    this.log(`Export TimeRecords to Excel ${this.originalManagerList?.length}`);
    // convert list to matrix

    const excel: exportVTR[] = [];

    let name = '';
    let urlWeb = ''
    const listURL: string[] = [];
    const tooltip = this.translate.instant('compViewApprovertable.msg.viewWeb');
    if (this.userId) {
      name = this.userEmail;
      urlWeb = window.location.origin.concat('/vtrApprove');
    }
    //const cumulate = new exportVTR();
    
    this.originalManagerList?.forEach(element => {
      excel.push(this.copyTimeRecords(element, name));
      listURL.push(urlWeb);
    });

    const len = excel.length;
    const width = Object.keys(excel[0]).length;
    this.log(`Export Data to Excel ${excel.length}`);
    // Add Localised header to excel
    // eslint-disable-next-line
    const header: any = {};
    let colName: number, colIndex = 0;
    for (const element in excel[0]) {
      this.log(`Processing Header ${element}`);
      if (element == 'userName') {
        colName = colIndex;
      }
      colIndex++;
      header[element] = this.translate.instant('compViewApprovertable.lbl.'.concat(element))
    }
    excel.unshift(header);
    this.log(`Header for Excel: ${JSON.stringify(header)}`)

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
    for (let index = 1; index <= len; index++) {
      const address = XLSX.utils.encode_cell({r: index, c: colName});
      const url = listURL[index - 1];
      worksheet[address].l = { Target: url, Tooltip: tooltip };
    }
    const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
    worksheet['!autofilter'] = { ref: matrix };
    // eslint-disable-next-line
    const sheets: any = {};
    const sheetName = visboGetShortText(name, 30);
    sheets[sheetName] = worksheet;
    const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [sheetName] };
    // eslint-disable-next-line
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const actDate = new Date();
    const fileName = ''.concat(
      actDate.getFullYear().toString(),
      '_',
      (actDate.getMonth() + 1).toString().padStart(2, "0"),
      '_',
      actDate.getDate().toString().padStart(2, "0"),
      '_TimeRecsApprover ',
      (name || '')
    );

    const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName.concat(EXCEL_EXTENSION);
    this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
   
  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }

    updateUrlParam(type: string, value: string, history = false): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new TTParams();
    if (type == 'from' || type == 'to') {
      queryParams.from = this.startDate;
      queryParams.to = this.endDate;
    } 
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: !history,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }
  // getApprover(vtr: VtrVisboTrackerExtended, withEmail = true): string {
  //   let fullName = '';
  //   if (vtr.approvalId) {
  //     const user = this.vcUser.get(vtr.approvalId);
  //     if (user) {        
  //       if ( withEmail) {
  //         fullName = fullName.concat(' (', user.email, ')');
  //       } else {
  //         fullName = user.profile.firstName.concat(' ', user.profile.lastName)
  //       }      
  //     }
  //   }
  //   return fullName || '';
  // }
  
    
}
