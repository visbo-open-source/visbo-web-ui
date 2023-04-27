import { ChangeDetectorRef, Component} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';
import { Employee, VtrVisboTracker } from 'src/app/_models/employee';
import { VisboTimeTracking } from 'src/app/_services/visbotimetracker.service';
import { UserService } from 'src/app/_services/user.service';
import { switchMap } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/_services/authentication.service';



@Component({
  selector: 'app-employee',
  templateUrl: './comp-employeetable.component.html',
  styleUrls: ['./comp-employeetable.component.css']
})

export class EmployeeComponent {
 rows: VtrVisboTracker[]=[];
 timeTrackerRows: VtrVisboTracker[]=[];
  userForm: FormGroup;
  editForm:FormGroup;
  originalColumns: VtrVisboTracker[] = [];
  modalService: any;
  selectedRow: any;
  showModal = false;
  vtrApprove: string[] = ['No', 'Yes'];

  

  constructor(private fb: FormBuilder, private trackerService: VisboTimeTracking , private userService: UserService, private authService: AuthenticationService){
    this.timeTrackerRows = []
    this.userForm = this.fb.group({
      userId: ['643ff52cc4a4a77b8026097e'],
      vpid: ["644733a1957f2611d00a80a6"],
      vpvid: ["644733b1957f2611d00a80a9"],
      vcid: ["644733b1957f2611d00a80a8"],
      roleId: ["5a1f1b0b1c9d440000e1b1b1"],
      date: ["2017-11-30T00:00:00.000Z"],
      time: 0,
      notes: ["John Smith"],
      approvalDate: ["2017-11-30T00:00:00.000Z"],
      approvalId: ["5a1f1b0b1c9d440000e1b1b2"],
      status: ["Not Started"],
      aggreUID: ["5a1f1b0b1c9d440000e1b1b4"],
      aggreDate: ["2017-11-30T00:00:00.000Z"],
    });

    this.editForm = this.fb.group({
      userId: [''],
      vpid: [""],
      vpvid: [""],
      vcid: [""],
      roleId: [""],
      date: [""],
      time: [''],
      notes: [""],
      approvalDate: [""],
      approvalId: [""],
      status: [""],
      aggreUID: [""],
      aggreDate: [""],
    });
    
  }


  ngOnInit(): void {
    this.userService.getUserProfile()
    .pipe(switchMap(user => this.trackerService.getUserTimeTracker(user._id)))
    .subscribe(data => this.rows = data)

    this.originalColumns = this.timeTrackerRows;
  }


  openModal() {
    this.showModal = true;
  }
  addEmployee() {
    this.showModal = true
    const newId = this.timeTrackerRows.length + 1;
    const newRow = {
      _id: newId.toString(),
      ...this.userForm.value,
      userId: this.userForm.value.userId,
      vpid: this.userForm.value.vpid,
      vpvid: this.userForm.value.vpvid,
      vcid: this.userForm.value.vcid,
      roleId: this.userForm.value.roleId,
      date: new Date(this.userForm.value.date).toString(),
      time: this.userForm.value.time,
      notes: this.userForm.value.notes,
      approvalDate: this.userForm.value.approvalDate,
      approvalId: this.userForm.value.approvalId,
      status: "Not Started",
      aggreUID: this.userForm.value.aggreUID,
      aggreDate: this.userForm.value.aggreDate,
    };
    this.trackerService.addUserTimeTracker(newRow).subscribe(response => {
      
      console.log('Response:', response);
    }, error => {
      console.log('Error:', error);
    });

      this.timeTrackerRows.push(newRow);
      this.userForm.reset();
      this.showModal = false;
    console.log(newRow)
  }

  onRowEdit(event: any) {
    const index = this.timeTrackerRows.findIndex((item) => item.userId === event.userId);
    this.timeTrackerRows[index].userId = event.userId;
    console.log(index);
  
    const _id = this.editForm.get('_id').value;
  }

openEditModal(user: VtrVisboTracker) {
  this.userForm.patchValue({
    userId: user.userId,
    vcid: user.vcid,
    vpid: user.vpid,
    date: user.date,

  });
  this.userForm.reset(); 

}


saveChanges() {
  const updatedRow = {
    userId: this.selectedRow.userId,
    vcid: this.editForm.value.vcid,
    vpid: this.editForm.value.vpid,
    vpvid: this.editForm.value.vpvid,
    date: this.editForm.value.date,
    roleId: this.editForm.value.date,
    notes: this.editForm.value.notes,
    time: this.editForm.value.time,
    status: this.editForm.value.status,
    approvalId: this.editForm.value.approvalId,
    approvalDate: this.editForm.value.approvalDate,
    aggreDate:this.editForm.value.aggreDate,
    aggreUID: this.editForm.value.aggreUID
  };
  
  const index = this.timeTrackerRows.findIndex(c => c.userId === this.selectedRow.userId);
  this.timeTrackerRows.splice(index, 1, updatedRow);
  
}


selectRow(user) {
  this.selectedRow = user;

  this.editForm.setValue({
    userId: user.userId,
    vcid: user.vcid,
    vpid: user.vpid,
    roleId: user.roleId,
    vpvid: user.vpvid,
    date: user.date,
    notes: user.notes,
    time: user.time,
    status: user.status,
    approvalId: user.approvalId,
    approvalDate: user.approvalDate,
    aggreDate:user.aggreDate,
    aggreUID: user.aggreUID
  });
}
  
  startDate: Date;
  endDate:Date;
  sortAscending: boolean;
  sortColumn: number;
  filteredColumns = [];

  
  
  
  
  sortVTRTable(n: number): void {
    if (n !== undefined) {
      if (!this.timeTrackerRows) {
        return;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      // sort by Enployee
      this.timeTrackerRows.sort(function(a, b) {
        return visboCmpString(a.userId.toLowerCase(), b.userId.toLowerCase());
      });
    }else if (this.sortColumn === 2) {
      this.timeTrackerRows.sort(function(a, b) {
        return a.vpid[0].localeCompare(b.vpid[0]);
      });
    } else if (this.sortColumn === 3) {
      // sort by emplDate
      this.timeTrackerRows.sort(function(a, b) {
        return a.date.localeCompare(b.date);
      });
    }else if (this.sortColumn === 4) {
      // sort by Hours
      this.timeTrackerRows.sort(function(a, b) {
        return a.time - b.time;
      });
    } else if (this.sortColumn === 5) {
      // sort by Approve
      this.timeTrackerRows.sort(function(a, b) {
        return a.status[0].localeCompare(b.status[0]);
      });
    } 

    if (!this.sortAscending) {
      this.timeTrackerRows.reverse();
    }
  }
  updateButtonValue() {
    for (let i = 0; i < this.timeTrackerRows.length; i++) {
      this.timeTrackerRows[i].status = 'Yes';
    }
  }
 
  updateFilter() {
    if (this.startDate && this.endDate) {
      const startDate = new Date(this.startDate);
      const endDate = new Date(this.endDate);
  
      this.timeTrackerRows = this.originalColumns.filter(item => {
        const date = new Date(item.date);
        return date >= startDate && date <= endDate;
      });
    }
  }
}
