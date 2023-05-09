import { Component, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-employee',
  templateUrl: './comp-employeetable.component.html',
  styleUrls: ['./comp-employeetable.component.css']
})

export class EmployeeComponent implements OnInit {
  @ViewChild('VtrModalCreate') VtrModalCreate: HTMLElement;
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
    approvalId: new FormControl(null),
    approvalDate: new FormControl(null)
  });
  selectedRow: VtrVisboTrackerExtended;
  showModal = false;
  vtrApprove = ['New', 'InQuestion', 'Approved', 'Rejected'];
  visboCentersList: VisboCenter[] = [];
  visboProjectsList: VisboProject[] = [];
  selectedCenterProjects: VisboProject[];
  hasOrga = false;
  vcOrga: VisboOrganisation[] = [];
  vcActive: VisboCenter;
  isCreatorOfRecord: boolean;
  managerTimeTrackerList: VtrVisboTrackerExtended[];
  private userId: string;

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
    this.visboSettingService.getVCOrganisations(
      selectedCenterId, false, new Date().toISOString(), true, false).subscribe(
      organisation => {
        this.vcOrga = organisation;
        this.hasOrga = organisation.length > 0;
        if (this.hasOrga) {
          this.userForm.get('roleId').setValue(this.vcOrga[0]?._id);
        }
      },
      error => {
        console.log(error);
      });
  }

  addEmployee() {
    this.showModal = true;
    this.trackerService.addUserTimeTracker({...this.userForm.value, status: 'New'}).subscribe(() => {
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
      updatedRow.approvalId = null; // here must be id of the manager who approved the request
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

  selectRow(user) {
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

  sortVTRTable(n: number): void {
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
        case 1:
          return visboCmpString(a.userId.toLowerCase(), b.userId.toLowerCase());
        case 2:
          return a.vpid.localeCompare(b.vpid);
        case 3:
          return a.date.localeCompare(b.date);
        case 4:
          return a.time - b.time;
        case 5:
          return a.status[0].localeCompare(b.status[0]);
      }
    });
    if (!this.sortAscending) {
      this.originalColumns.reverse();
    }
  }

  updateFilter() {
    this.originalColumns = this.rows;
    if (!!this.startDate?.length || !!this.endDate?.length) {
      console.log(!!this.startDate?.length, !!this.endDate?.length);
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
          this.visboProjectsList = visboProjectsList;
        },
        error => {
          console.log('get VPs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
        }
      );
  }

  private getProfile() {
    this.userService.getUserProfile()
      .subscribe(user => {
        this.userId = user._id;
        this.userForm.get('userId').setValue(user._id);
        this.getTimeTrackerList();
      });
  }

  private getTimeTrackerList() {
    this.trackerService.getUserTimeTracker(this.userId).subscribe(({timeEntries}) => {
      this.rows = timeEntries?.map(record => {
        const centerName = this.visboCentersList.find(vc => vc._id === record.vcid)?.name ?? '';
        const projectName = this.visboProjectsList.find(vp => vp._id === record.vpid)?.name ?? '';
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
          timeTrackerId: record._id
        };
      });
      this.managerTimeTrackerList = this.rows?.filter(timeTrackerElem => timeTrackerElem.userId !== this.userId);
      this.originalColumns = this.rows;
      this.sortVTRTable(undefined);
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
          }
        });
    const requestBody = {
      status: "Approved",
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
}
