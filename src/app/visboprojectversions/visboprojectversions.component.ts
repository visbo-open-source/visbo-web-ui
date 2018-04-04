import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-visboprojectversions',
  templateUrl: './visboprojectversions.component.html'
})
export class VisboProjectVersionsComponent implements OnInit {

  visboprojectversions: VisboProjectVersion[];
  vpSelected: string;
  vpActive: VisboProject;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    // this.getVisboCenters();
    this.getVisboProjectVersions();
  }

  onSelect(visboprojectversion: VisboProjectVersion): void {
    this.getVisboProjectVersions();
  }

  getVisboProjectVersions(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var i: number;
    this.vpSelected = id;
    console.log("get VP name if ID is used %s", id);
    if (id) {
      this.visboprojectService.getVisboProject(id)
          .subscribe(visboproject => {
            this.vpActive = visboproject;
            console.log("get VP name if ID is used %s", this.vpActive.name);
            this.visboprojectversionService.getVisboProjectVersions(id)
                .subscribe(visboprojectversions => this.visboprojectversions = visboprojectversions);
          });
    } else {
      this.vpSelected = null;
      this.vpActive = null;
      this.visboprojectversionService.getVisboProjectVersions(null)
          .subscribe(visboprojectversions => this.visboprojectversions = visboprojectversions);
    }
  }

  // add(name: string): void {
  //   name = name.trim();
  //   if (!name) { return; }
  //   this.visboprojectService.addVisboProject({ name: name } as VisboProject)
  //     .subscribe(vp => { this.visboprojects.push(vp[0]); });
  // }

  // delete(visboproject: VisboProject): void {
  //   // remove item from list
  //   this.visboprojects = this.visboprojects.filter(vp => vp !== visboproject);
  //   this.visboprojectService.deleteVisboProject(visboproject).subscribe();
  // }


  // gotoClickedRow(visboproject: VisboProject):void {
  //   console.log("clicked row %s", visboproject.name);
  //   this.router.navigate(['vpv/'.concat(visboproject._id)]);
  // }

  gotoDetail(visboprojectversion: VisboProjectVersion):void {
    console.log("clicked Details %s", visboprojectversion.name);
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

}
