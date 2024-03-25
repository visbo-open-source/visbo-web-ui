import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { visboCmpString ,getErrorMessage, visboGetShortText} from '../../_helpers/visbo.helper';
import { VtrVisboTrackerExtended } from 'src/app/_models/employee';
import { VisboTimeTracking } from 'src/app/_services/visbotimetracker.service';
import { UserService } from 'src/app/_services/user.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { VisboCenter } from 'src/app/_models/visbocenter';
import { VisboCenterService } from 'src/app/_services/visbocenter.service';
import { VisboProjectService } from 'src/app/_services/visboproject.service';
import { VisboProject, constSystemVPStatus } from 'src/app/_models/visboproject';
import { VisboSettingService } from 'src/app/_services/visbosetting.service';
import { VisboOrganisation } from 'src/app/_models/visbosetting';
import { VisboUser } from 'src/app/_models/visbouser';


import * as XLSX from 'xlsx';
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
  status: string;
  approvalID: string;
  approverName: string;
  approvalDate: string;  
  result: string;
}

@Component({
  selector: 'app-employee',
  templateUrl: './comp-employeetable.component.html',
  styleUrls: ['./comp-employeetable.component.css']
})

export class EmployeeComponent implements OnInit {
  @ViewChild('VtrModalCreate') VtrModalCreate: HTMLElement;
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
  vcUser = new Map<string, VisboUser>();
  hasOrga = false;
  vcOrga: VisboOrganisation[] = [];
  vcActive: VisboCenter;
  vpActiveName: string;
  vcActiveName: string;
  vtrActiveUserName: string;
  isCreatorOfRecord: boolean;
  // managerTimeTrackerList: VtrVisboTrackerExtended[];
  // originalManagerList: VtrVisboTrackerExtended[];
  private userId: string;
  private userName: string;
  private userEmail: string;
  private managerUid: number;
  userIsApprover: boolean;

  constructor(
    private trackerService: VisboTimeTracking,
    private translate: TranslateService,
    private messageService: MessageService,
    private alertService: AlertService,
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
        this.selectedCenterProjects = visboProjectsList.filter(project => (project.vpType === 0) && ((project.vpStatus != constSystemVPStatus[3] )&&(project.vpStatus != constSystemVPStatus[4] )&&(project.vpStatus != constSystemVPStatus[5] )));
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
    const userId = this.selectedRow.userId;
    const timeTrackerId = this.selectedRow.timeTrackerId;
    const updatedRow = {
      ...this.userForm.value,
      userId,
    };
    if (!this.isCreatorOfRecord) {
      updatedRow.approvalDate = new Date().toISOString();
      updatedRow.approvalId = userId;
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

  
  getVisboCenterUsers(): void {
    if (!this.userForm) {
      this.vcUser.clear();
      return;
    }
    //this.log(`VisboCenter UserList of: ${this.vcActive}`);
    this.visboCenterWs.getVCUser(this.vcActive._id, false, false)
      .subscribe(
        user => {
          user.forEach(user => this.vcUser.set(user._id, user));          
          this.log(`fetched Users ${this.vcUser.size}`);
        },
        error => {
          this.log(`Get VC Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  sortVTRTable(n: number, isManager: boolean=false): void {
   
      if (n !== undefined) {
        if (!this.originalColumns) {
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
      this.originalColumns.sort((a, b) => {
        switch (this.sortColumn) {
          case 0:
            return (visboCmpString(a.vcName.toLowerCase(), b.vcName.toLowerCase()) && b.vpName.localeCompare(a.vpName) && (a.date.localeCompare(b.date))) ;
          case 1:
            return (visboCmpString(a.userName.toLowerCase(), b.userName.toLowerCase()) && (a.date.localeCompare(b.date))) ;
          case 2:
            return (b.vpName.localeCompare(a.vpName) || (b.date.localeCompare(a.date)) );
          case 3:
            return a.date.localeCompare(b.date);
          case 4:
            return a.time - b.time;
          case 5:
            return a.status.localeCompare(b.status);
        }
      });
      if (!this.sortAscending) {
        this.originalColumns.reverse();
      }
  }

  updateFilter() {
    this.originalColumns = this.rows;
    if (!!this.startDate?.length || !!this.endDate?.length) {
      const startDate = this.startDate?.length ? new Date(this.startDate) : null;
      const endDate = this.endDate?.length ? new Date(this.endDate) : null;

      this.originalColumns = this.originalColumns.filter(item => {
        const date = new Date(item.date);
        if (startDate && !endDate) {
          return date >= startDate;
        } else if (!startDate && endDate) {
          return date <= endDate;
        } else {
          return date >= startDate && date <= endDate;
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
      this.rows = timeEntries?.map(record => {
        const centerName = this.visboCentersList.find(vc => vc._id === record.vcid)?.name ?? '';
        const projectName = this.visboProjectsList.find(vp => vp._id === record.vpid)?.name ?? '';        
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
            userName: record.name
          }; 
        } else {
            //console.log("No access to this VC %s for User: %s", record.vcid, record.name)
        }
      });
      // delete the records = undefined
      this.originalColumns = [];
      this.rows.forEach( item => {
        if (item) {this.originalColumns.push(item)}
      });
      this.rows = this.originalColumns;

      // ur: don't no why this is needed
      //
      // if (this.originalColumns?.length) {
      //   this.getOrganizationList(this.visboCentersList[0]._id);
      // }
      this.sortVTRTable(undefined);
      this.updateFilter();
    });
  }

  clearEditModal() {
    this.isCreatorOfRecord = false;
    this.userForm.reset();
    this.userForm.get('userId').setValue(this.userId);
    if (this.visboCentersList.length == 1) {
      this.userForm.get('vcid').setValue(this.visboCentersList[0]._id);
      const thisday = new Date();
      let thisdayStr = thisday.toISOString();
      thisdayStr = thisdayStr.split('T')[0];
      this.userForm.get('date').setValue(thisdayStr);
    }
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
        var role = organisation[0].allRoles.find(role => (role.email === this.userEmail && !role.isSummaryRole && !role.isExternRole));        
        const roleId = role?.uid;
        
        if (this.hasOrga) {
          this.userForm.get('roleId').setValue(roleId);
        }
      },
      error => {
        console.log(error);
      });
  }

  
  copyTimeRecords(vtr: VtrVisboTrackerExtended, name: string): exportVTR {
    
    const copy = new exportVTR();
    copy.userID = vtr.userId;
    copy.userName = this.userEmail;
    copy.date = new Date(vtr.date);
    copy.vcName = vtr.vcName;
    copy.vpid = vtr.vpid;
    copy.vpName = vtr.vpName;
    copy.roleID = vtr.roleId;
    copy.time = vtr.time;
    copy.description = vtr.notes;
    copy.status = vtr.status;
    copy.approvalID = vtr.approvalId;
    const approverEmail = this.getApprover(vtr, true);
    copy.approverName = approverEmail;
    copy.approvalDate = vtr.approvalDate;
    if (vtr.failed) {
      copy.result = vtr.failed
    } else {
      copy.result = ""
    }  
    delete copy.vpid;
    return copy;
  }

  exportExcel(): void {
    this.log(`Export TimeRecords to Excel ${this.originalColumns?.length}`);
    // convert list to matrix

    const excel: exportVTR[] = [];

    let name = '';
    let urlWeb = ''
    const listURL: string[] = [];
    const tooltip = this.translate.instant('compEmployeetable.msg.viewWeb');
    if (this.userId) {
      name = this.userEmail;
      urlWeb = window.location.origin.concat('/vtr');
    }
    const cumulate = new exportVTR();
    
    this.originalColumns?.forEach(element => {
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
      header[element] = this.translate.instant('compViewEmployeetable.lbl.'.concat(element))
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
      '_TimeRecsEmployee ',
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
  // exportExcel(): void {
  //   this.log(`Export Data to Excel ${this.visboCost?.length} `);
  //   // convert list to matix

  //   const excel: exportCosttype[] = [];

  //   let name = '';
  //   let urlWeb = ''
  //   const listURL: string[] = [];
  //   const tooltip = this.translate.instant('ViewCosttypes.msg.viewWeb');
  //   if (this.vpfActive) {
  //     name = this.vpfActive.name
  //     urlWeb = window.location.origin.concat('/vpf/', this.vpfActive.vpid, '?view=Costtypes');
  //   } else if (this.vpActive) {
  //     name = this.vpActive.name;
  //     urlWeb = window.location.origin.concat('/vpKeyMetrics/', this.vpActive._id, '?view=Costtypes');
  //   } else if (this.vcActive) {
  //     name = this.vcActive.name;
  //     urlWeb = window.location.origin.concat('/vp/', this.vcActive._id, '?view=KeyMetrics&viewCockpit=Costtypes');
  //   }
  //   if (this.visboCost) {
  //     this.visboCost.forEach(element => {
  //       excel.push(this.copyCosttypes(element, name));
  //       listURL.push(urlWeb);
  //     });
  //   }
  //   if (this.visboCostChild) {
  //     this.visboCostChild.forEach(element => {
  //       let urlWebDetail = urlWeb;
  //       if (element.name) {
  //         urlWebDetail = window.location.origin.concat('/vpKeyMetrics/', element.vpid, '?view=Costtypes');
  //       }
  //       excel.push(this.copyCosttypes(element, element.name || name));
  //       listURL.push(urlWebDetail);
  //     });
  //   }

  //   const len = excel.length;
  //   const width = Object.keys(excel[0]).length;
  //   this.log(`Export Data to Excel ${excel.length}`);
  //   // Add Localised header to excel
  //   // eslint-disable-next-line
  //   const header: any = {};
  //   let colName: number, colIndex = 0;
  //   for (const element in excel[0]) {
  //     // this.log(`Processing Header ${element}`);
  //     if (element == 'name') {
  //       colName = colIndex;
  //     }
  //     colIndex++;
  //     header[element] = this.translate.instant('ViewCosttypes.lbl.'.concat(element))
  //   }
  //   excel.unshift(header);
  //   // this.log(`Header for Excel: ${JSON.stringify(header)}`)

  //   const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
  //   for (let index = 1; index <= len; index++) {
  //     const address = XLSX.utils.encode_cell({r: index, c: colName});
  //     const url = listURL[index - 1];
  //     worksheet[address].l = { Target: url, Tooltip: tooltip };
  //   }
  //   const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
  //   worksheet['!autofilter'] = { ref: matrix };
  //   // eslint-disable-next-line
  //   const sheets: any = {};
  //   const sheetName = visboGetShortText(name, 30);
  //   sheets[sheetName] = worksheet;
  //   const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [sheetName] };
  //   // eslint-disable-next-line
  //   const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  //   const actDate = new Date();
  //   const fileName = ''.concat(
  //     actDate.getFullYear().toString(),
  //     '_',
  //     (actDate.getMonth() + 1).toString().padStart(2, "0"),
  //     '_',
  //     actDate.getDate().toString().padStart(2, "0"),
  //     '_Costtypes ',
  //     (name || '')
  //   );

  //   const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
  //   const url = window.URL.createObjectURL(data);
  //   const a = document.createElement('a');
  //   document.body.appendChild(a);
  //   a.href = url;
  //   a.download = fileName.concat(EXCEL_EXTENSION);
  //   this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
  //   a.click();
  //   window.URL.revokeObjectURL(url);
  // }

  getApprover(vtr: VtrVisboTrackerExtended, withEmail = true): string {
    let fullName = '';
    if (vtr.approvalId) {
      const user = this.vcUser.get(vtr.approvalId);
      if (user) {        
        if ( withEmail) {
          fullName = fullName.concat(' (', user.email, ')');
        } else {
          fullName = user.profile.firstName.concat(' ', user.profile.lastName)
        }      
      }
    }
    return fullName || '';
  }
  
  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}

