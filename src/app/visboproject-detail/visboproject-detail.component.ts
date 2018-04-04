import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { VisboProjectService }  from '../_services/visboproject.service';
import { VisboProject } from '../_models/visboproject';

@Component({
  selector: 'app-visboproject-detail',
  templateUrl: './visboproject-detail.component.html'
})
export class VisboProjectDetailComponent implements OnInit {

  @Input() visboproject: VisboProject;

  constructor(
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private location: Location
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
//    this.heroService.updateHero(this.hero)
    this.visboprojectService.updateVisboProject(this.visboproject)
      .subscribe(() => this.goBack());
  }
}
