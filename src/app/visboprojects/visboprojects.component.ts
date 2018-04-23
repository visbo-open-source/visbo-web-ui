import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { VisboProject } from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService }  from '../_services/visbocenter.service';

import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-visboprojects',
  templateUrl: './visboprojects.component.html'
})
export class VisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;

  constructor(
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    // this.getVisboCenters();
    this.getVisboProjects();
  }

  onSelect(visboproject: VisboProject): void {
    this.getVisboProjects();
  }

  getVisboProjects(): void {
    const id = this.route.snapshot.paramMap.get('id');
    var i: number;
    this.vcSelected = id;
    if (id) {
      this.visbocenterService.getVisboCenter(id)
          .subscribe(visbocenters => {
            this.vcActive = visbocenters;
            console.log("get VC name if ID is used %s", this.vcActive.name);
            this.visboprojectService.getVisboProjects(id)
                .subscribe(visboprojects => this.visboprojects = visboprojects);
          });
    } else {
      this.vcSelected = null;
      this.vcActive = null;
      this.visboprojectService.getVisboProjects(null)
          .subscribe(visboprojects => this.visboprojects = visboprojects);
    }
  }

  addproject(name: string, vcid: string): void {
    name = name.trim();
    console.log("call create VP %s with ID %s to list", name, vcid);
    if (!name) { return; }
    this.visboprojectService.addVisboProject({ name: name, vcid: vcid } as VisboProject)
      .subscribe(vp => {
        console.log("add VP %s with ID %s to VC %s", vp.name, vp._id, vp.vcid);
        this.visboprojects.push(vp)
      });
      // show up afterwards about success / error
  }

  delete(visboproject: VisboProject): void {
    // remove item from list
    this.visboprojects = this.visboprojects.filter(vp => vp !== visboproject);
    this.visboprojectService.deleteVisboProject(visboproject).subscribe();
  }


  gotoClickedRow(visboproject: VisboProject):void {
    console.log("clicked row %s", visboproject.name);
    this.router.navigate(['vpv/'.concat(visboproject._id)]);
  }

  gotoDetail(visboproject: VisboProject):void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

}
