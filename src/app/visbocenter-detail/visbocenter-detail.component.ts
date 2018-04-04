import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';


import { VisboCenter } from '../_models/visbocenter';
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
    private visbocenterService: VisboCenterService,
    private visboprojectService: VisboProjectService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router
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
//    this.heroService.updateHero(this.hero)
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
}
