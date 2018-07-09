import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboProjectService }  from '../_services/visboproject.service';
import { VisboProject } from '../_models/visboproject';

@Component({
  selector: 'app-visboproject-detail',
  templateUrl: './visboproject-detail.component.html'
})
export class VisboProjectDetailComponent implements OnInit {

  @Input() visboproject: VisboProject;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private location: Location,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.getVisboProject();
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');
    //this.messageService.add('VisboProject Detail of: ' + id);
    this.visboprojectService.getVisboProject(id)
      .subscribe(visboproject => this.visboproject = visboproject);
  }

  // add(name: string): void {
  //   name = name.trim();
  //   if (!name) { return; }
  //   this.visboprojectService.addVisboProject({ name: name } as VisboProject)
  //     .subscribe(vp => { this.visboprojects.push(vp[0]); });
  // }

  delete(visboproject: VisboProject): void {
    // remove item from list
    this.visboprojectService.deleteVisboProject(visboproject).subscribe();
    this.goBack();
  }


  goBack(): void {
    this.location.back();
  }
  save(): void {
    this.visboprojectService.updateVisboProject(this.visboproject)
      .subscribe(() => this.goBack());
  }

  addvpuser(email: string, role: string, message: string, vpid: string): void {
    email = email.trim();
    role = role.trim();
    message = message.trim();
    this.messageService.add(`Add VisboProject User: ${email} Role: ${role} VP: ${vpid}`);
    if (!email || !role) { return; }
    this.visboprojectService.addVPUser({ email: email, role: role} as VPUser, message, vpid )
      .subscribe(
        users => {
          this.visboproject.users.push(users[0]);
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.messageService.add(`Add VisboProject User error: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }

      );
      // .subscribe(users => { users; });
      // show up alter about success / error
  }

  removevpuser(user: VPUser, vpid: string): void {
    this.messageService.add(`Remove VisboProject User: ${user.email}/${user.userId} Role: ${user.role} VP: ${vpid}`);
    this.visboprojectService.deleteVPUser(user, vpid)
      .subscribe(
        result => {
          // this.messageService.add(`Remove VisboProject User result: ${JSON.stringify(result)}`);
          this.visboproject.users = result;
          this.alertService.success(`User ${user.email} removed successfully`);
        },
        error => {
          this.messageService.add(`Remove VisboProject User error: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

}
