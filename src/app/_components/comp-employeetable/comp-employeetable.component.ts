import { ChangeDetectorRef, Component} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { visboCmpString, visboCmpDate } from '../../_helpers/visbo.helper';
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
rows: VtrVisboTracker[]=[];
originalColumns: VtrVisboTracker[]=[];
startDate: string;
endDate:string;
selectedCenterId: string;
sortAscending: boolean;
sortColumn: number;
filteredColumns = [];
userForm: FormGroup;
editForm:FormGroup;
modalService: any;
selectedRow: any;
showModal = false;
vtrApprove: string[] = ['No', 'Yes'];
visbocenters : VisboCenter[] = []
visboprojects : VisboProject[] = []
selectedCenterProjects: VisboProject[];
visbosetting: VisboOrganisation[]
hasOrga = false;
vcOrga: VisboOrganisation[]=[];
vcActive: VisboCenter;

  constructor(private fb: FormBuilder, 
    private trackerService: VisboTimeTracking , 
    private userService: UserService, 
    private authService: AuthenticationService, 
    private visboCenterws: VisboCenterService,
    private visboprojectService :VisboProjectService,
    private visbosettingService: VisboSettingService,
    ){
    this.rows = []
    this.userForm = this.fb.group({
      userId: [''],
      vpid: [''],
      vcid: [''],
      roleId: [""],
      date: [''],
      time: [''],
      notes: [""],
      approvalId: ["5a1f1b0b1c9d440000e1b1b2"],
      status: [""],
      approvalDate: ['']
    });

    this.editForm = this.fb.group({
      userId: [''],
      vpid: [""],
      vcid: [""],
      roleId: [""],
      date: [""],
      time: [''],
      notes: [""],
      approvalId: ["5a1f1b0b1c9d440000e1b1b2"],
      status: [""],
      approvalDate: [""]
    });
    
  }

  
  
  ngOnInit(): void {
    // this.getRoleId('Organisation');
    this.visboCenterws.getVisboCenters().subscribe(
      visbocenters => {
        this.visbocenters = visbocenters
      },
      error => {
        // console.log('get VCs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
      }
    );


      this.visboprojectService.getVisboProjects(null)
        .subscribe(
          visboprojects => {
            this.visboprojects = visboprojects;
          },
          error => {
            // console.log('get VPs failed: error: %d message: %s', error.status, error.error.message); // log to console instead
          }
        );

        

        // this.userForm.patchValue({
        //   userId: item.userId,
        //   roleId: item.roleId,
        //   notes: item.notes,
        //   status: item.status,
        //   time: item.time.$numberDecimal,
        //   date: item.date,
        //   approvalId: item.approvalId,
        //   approvalDate: item.approvalDate
        // })


        this.userService.getUserProfile()
        .pipe(switchMap(user => this.trackerService.getUserTimeTracker(user._id)))
        .subscribe(data => {
          console.log(data)
          this.rows = data.timeEntries.map(item => {
            const centerName = this.visbocenters.find(vc => vc._id === item.vcid)?.name ?? '';
            const projectName = this.visboprojects.find(vp => vp._id === item.vpid)?.name ?? '';
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
            }
          });
          this.originalColumns = this.rows;
          this.sortVTRTable(undefined);
          this.updateFilter();
        });

  }
  

  openModal() {
    this.showModal = true;
  }
 
  
  onCenterChange(event: any): void {
    const selectedCenterId = event.target.value;
    // const currentUser = this.userService.getUserProfile()
    this.visboprojectService.getVisboProjects(selectedCenterId).subscribe(
      
      visboprojects => {
        this.selectedCenterProjects = visboprojects.filter(project => project.vpType === 0);
        console.log(this.selectedCenterProjects)
        // set the value of the vcid field to the selected center's _id
      },
        error => {
          
        }
      );
      this.visbosettingService.getVCOrganisations(selectedCenterId, false, (new Date()).toISOString(), true, false)
        .subscribe(
          organisation => {
           
            this.vcOrga = organisation;
            this.hasOrga = organisation.length > 0;
          },
          error => {
            
        })
  }


  addEmployee() {
    this.showModal = true;
    this.userService.getUserProfile().subscribe(user => {
      const approvalDate = this.userForm.value.approvalDate ? new Date(this.userForm.value.approvalDate).toISOString() : new Date().toISOString();
      const newRow = {
        userId: user._id,
        vpid: this.userForm.value.vpid,
        vcid: this.userForm.value.vcid,
        roleId: this.userForm.value.roleId,
        date: new Date(this.userForm.value.date).toISOString(),
        time: this.userForm.value.time,
        notes: this.userForm.value.notes,
        approvalId: this.editForm.value.approvalId,
        status: "No",
        approvalDate: approvalDate
      };
      console.log(newRow)
        
      
      this.trackerService.addUserTimeTracker(newRow).subscribe(response => {
        console.log('Response:', response);
      }, error => {
        console.log('Error:', error);
      });
  
      const centerName = this.visbocenters.find(vc => vc._id === newRow.vcid)?.name ?? '';
      const projectName = this.visboprojects.find(vp => vp._id === newRow.vpid)?.name ?? '';
      this.rows.push({
        ...newRow,
        vcid: centerName,
        vpid: projectName,
      });
     
      this.showModal = false;
    });
    
  }

  onRowEdit(event: any) {
    const index = this.rows.findIndex((item) => item.userId === event.userId);
    this.rows[index].userId = event.userId;
    console.log(index, 'here');
  
  }

openEditModal(user: VtrVisboTracker) {
  // console.log(user)
  this.editForm.patchValue({
    userId: user.userId,
    vcid: user.vcid,
    vpid: user.vpid,
    date: user.date,
    time: user.time,
    notes:user.notes,
    roleId: this.userForm.value.roleId,
    approvalId: user.approvalId,
    approvalDate: this.userForm.value.approvalDate
  });
  console.log(this.editForm, 'check')
  // this.userForm.reset(); 
}

saveChanges() {
  const updatedRow = {
    userId: this.selectedRow.userId,
    vcid: this.editForm.value.vcid,
    vpid: this.editForm.value.vpid,
    date: this.editForm.value.date,
    roleId: this.editForm.value.roleId,
    notes: this.editForm.value.notes,
    time: this.editForm.value.time,
    status: this.editForm.value.status,
    approvalId: this.editForm.value.approvalId,
    approvalDate: new Date().toISOString(),

  };
  console.log(updatedRow, 'here')
 const id = this.selectedRow.userId;
  this.trackerService.editUserTimeTracker(updatedRow, id)
  .subscribe(
    (response) => {
      console.log(response)
      const index = this.rows.indexOf(this.selectedRow);
      this.rows.splice(index, 1, updatedRow);
    },
    (error) => {
      console.error('Error updating row:', error);
    }
  )
  

}


selectRow(user) {
  this.selectedRow = user;

  this.editForm.setValue({
    userId: user.userId,
    vcid: user.vcid,
    vpid: user.vpid,
    roleId: user.roleId,
    date: user.date,
    notes: user.notes,
    time: user.time,
    status: user.status,
    approvalId: user.approvalId,
    approvalDate: user && user.approvalDate ? user.approvalDate : ''
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
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      // sort by userId
      this.originalColumns.sort(function(a, b) {
        return visboCmpString(a.userId.toLowerCase(), b.userId.toLowerCase());
      });
    }else if (this.sortColumn === 2) {
      this.originalColumns.sort(function(a, b) {
        return a.vpid.localeCompare(b.vpid);
      });
    } else if (this.sortColumn === 3) {
      // sort by date
      this.originalColumns.sort(function(a, b) {
        return a.date.localeCompare(b.date);
      });
    }else if (this.sortColumn === 4) {
      // sort by Hours
      this.originalColumns.sort(function(a, b) {
        return a.time - b.time;
      });
    } else if (this.sortColumn === 5) {
      // sort by Approve
      this.originalColumns.sort(function(a, b) {
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
}
