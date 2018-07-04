import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AlertService } from '../_services/alert.service';
import { MessageService } from '../_services/message.service';
import { VisboCenter } from '../_models/visbocenter';
import { VCUser } from '../_models/visbocenter';
import { VisboCenterService }  from '../_services/visbocenter.service';
import { VisboProject } from '../_models/visboproject';
import { VisboProjectService }  from '../_services/visboproject.service';

@Component({
  selector: 'app-visbocenter-detail',
  templateUrl: './visbocenter-detail.component.html'
})
export class VisboCenterDetailComponent implements OnInit {

  @Input() visbocenter: VisboCenter;

  constructor(
    private messageService: MessageService,
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.getVisboCenter();
  }

  getVisboCenter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    //this.messageService.add('VisboCenter Detail of: ' + id);
    this.visbocenterService.getVisboCenter(id)
      .subscribe(visbocenter => this.visbocenter = visbocenter);
  }
  goBack(): void {
    this.location.back();
  }
  save(): void {
    this.visbocenterService.updateVisboCenter(this.visbocenter)
      .subscribe(() => this.goBack());
  }

  delete(visbocenter: VisboCenter): void {
    // remove item from list
    this.visbocenterService.deleteVisboCenter(visbocenter)
      .subscribe(() => this.goBack());
  }

  addproject(name: string, vcid: string): void {
    name = name.trim();
    if (!name) { return; }
    this.visboprojectService.addVisboProject({ name: name, vcid: vcid } as VisboProject)
      .subscribe(vp => { vp; });
      // show up alter about success / error
  }

  addvcuser(email: string, role: string, message: string, vcid: string): void {
    email = email.trim();
    role = role.trim();
    message = message.trim();
    this.messageService.add(`Add VisboCenter User: ${email} Role: ${role} VC: ${vcid}`);
    if (!email || !role) { return; }
    this.visbocenterService.addVCUser({ email: email, role: role} as VCUser, message, vcid )
      .subscribe(
        users => {
          this.visbocenter.users.push(users[0]);
          this.alertService.success(`User ${email} added successfully`);
        },
        error => {
          this.messageService.add(`Add VisboCenter User error: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }

      );
      // .subscribe(users => { users; });
      // show up alter about success / error
  }

  removevcuser(user: VCUser, vcid: string): void {
    this.messageService.add(`Remove VisboCenter User: ${user.email}/${user.userId} Role: ${user.role} VC: ${vcid}`);
    this.visbocenterService.deleteVCUser(user, vcid)
      .subscribe(
        result => {
          // this.messageService.add(`Remove VisboCenter User result: ${JSON.stringify(result)}`);
          this.visbocenter.users = result;
          this.alertService.success(`User ${user.email} removed successfully`);
        },
        error => {
          this.messageService.add(`Remove VisboCenter User error: ${error.error.message}`);
          this.alertService.error(error.error.message);
        }
      );
  }

}
