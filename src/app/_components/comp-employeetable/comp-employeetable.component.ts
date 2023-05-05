import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { visboCmpString } from '../../_helpers/visbo.helper';
import { VtrVisboTracker } from 'src/app/_models/employee';
import { VisboTimeTracking } from 'src/app/_services/visbotimetracker.service';
import { UserService } from 'src/app/_services/user.service';
import { switchMap } from 'rxjs/operators';
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

export class EmployeeComponent {
  rows: VtrVisboTracker[] = [];
  originalColumns: VtrVisboTracker[] = [];
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
    status: new FormControl('No', Validators.required),
    approvalId: new FormControl(null),
    approvalDate: new FormControl(null)
  });
  selectedRow: any;
  showModal = false;
  vtrApprove = ['No', 'Yes'];
  visboCentersList: VisboCenter[] = [];
  visboProjectsList: VisboProject[] = [];
  selectedCenterProjects: VisboProject[];
  visbosetting: VisboOrganisation[];
  hasOrga = false;
  vcOrga: VisboOrganisation[] = [];
  vcActive: VisboCenter;
  isManager = false;

  constructor(
    private fb: FormBuilder,
    private trackerService: VisboTimeTracking,
    private userService: UserService,
    private authService: AuthenticationService,
    private visboCenterws: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private visbosettingService: VisboSettingService,
  ) {
  }


  ngOnInit(): void {
    this.visboCenterws.getVisboCenters().subscribe(
      visboCentersList => {
        this.visboCentersList = visboCentersList;
      },
      error => {
        console.log('get VCs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
      }
    );
    this.getProjectList()
    this.userForm.valueChanges.subscribe(()=> console.log(this.userForm))
    this.getProfile()

  }


  openModal() {
    this.showModal = true;
  }


  onCenterChange(event: any): void {
    const selectedCenterId = event.target.value;
    this.visboprojectService.getVisboProjects(selectedCenterId).subscribe(
      visboProjectsList => {
        this.selectedCenterProjects = visboProjectsList.filter(project => project.vpType === 0);
        // set the value of the vcid field to the selected center's _id
      },
      error => {
        console.log(error);
      }
    );
    this.visbosettingService.getVCOrganisations(
      selectedCenterId,
      false,
      new Date().toISOString(),
      true,
      false)
      .subscribe(
        organisation => {
          this.vcOrga = organisation;
          console.log(organisation);
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
    this.trackerService.addUserTimeTracker(this.userForm.value).subscribe(response => {
      console.log('Response:', response);
      this.userForm.reset();
      this.getProfile()
    }, error => {
      console.log('Error:', error);
    });
    this.showModal = false;
  }

  openEditModal(user: VtrVisboTracker) {
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
    console.log(this.userForm, 'check');
  }

  saveChanges() {
    const userId = this.selectedRow.userId;
    const updatedRow = {
      ...this.userForm.value,
      approvalDate: new Date().toISOString(),
      approvalId: null, // here must be id of the manager who approved the request
      userId,
    };
    console.log(updatedRow, 'here');
    this.trackerService.editUserTimeTracker(updatedRow, userId)
      .subscribe(
        (response) => {
          console.log(response);
          this.userForm.reset();
          this.getProfile()
        },
        (error) => {
          console.error('Error updating row:', error);
        }
      );


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
    if (this.sortColumn === 1) {
      // sort by userId
      this.originalColumns.sort(function (a, b) {
        return visboCmpString(a.userId.toLowerCase(), b.userId.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.originalColumns.sort(function (a, b) {
        return a.vpid.localeCompare(b.vpid);
      });
    } else if (this.sortColumn === 3) {
      // sort by date
      this.originalColumns.sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });
    } else if (this.sortColumn === 4) {
      // sort by Hours
      this.originalColumns.sort(function (a, b) {
        return a.time - b.time;
      });
    } else if (this.sortColumn === 5) {
      // sort by Approve
      this.originalColumns.sort(function (a, b) {
        return a.status[0].localeCompare(b.status[0]);
      });
    }

    if (!this.sortAscending) {
      this.originalColumns.reverse();
    }
  }

  updateButtonValue() {
    for (let i = 0; i < this.rows.length; i++) {
      this.rows[i].status = 'Yes';
    }
  }

  updateFilter() {
    if (this.startDate && this.endDate) {
      const startDate = new Date(this.startDate);
      const endDate = new Date(this.endDate);

      this.originalColumns = this.rows.filter(item => {
        const date = new Date(item.date);
        return date >= startDate && date <= endDate;
      });
    } else {
      this.rows = this.originalColumns;
    }

  }

  private getProjectList(): void {
    this.visboprojectService.getVisboProjects(null)
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
      .pipe(switchMap(user => {
        if (user._id) {
          this.userForm.get('userId').setValue(user._id);
        }
        return this.trackerService.getUserTimeTracker(user._id);
      }))
      .subscribe(data => {
        console.log(data);
        this.rows = data.timeEntries.map(item => {
          const centerName = this.visboCentersList.find(vc => vc._id === item.vcid)?.name ?? '';
          const projectName = this.visboProjectsList.find(vp => vp._id === item.vpid)?.name ?? '';
          return {
            userId: item.userId,
            vcid: centerName,
            vpid: projectName,
            roleId: item.roleId,
            notes: item.notes,
            status: item.status,
            time: item.time.$numberDecimal,
            date: item.date,
            approvalId: item.approvalId,
            approvalDate: item.approvalDate
          };
        });
        this.originalColumns = this.rows;
        this.sortVTRTable(undefined);
        this.updateFilter();
      });
  }
}
