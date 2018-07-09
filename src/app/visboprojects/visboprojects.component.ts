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
  sortAscending: boolean;
  sortColumn: number;

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

  addproject(name: string, vcid: string, desc: string, vpPublic: boolean): void {
    name = name.trim();
    console.log("call create VP %s with VCID %s Desc %s Public %s", name, vcid, desc, vpPublic);
    if (!name) { return; }
    this.visboprojectService.addVisboProject({ name: name, description: desc, vpPublic: vpPublic != '', vcid: vcid } as VisboProject)
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
  sortVPTable(n) {

    if (n != this.sortColumn) {
      this.sortColumn = n;
      this.sortAscending = undefined;
    }
    if (this.sortAscending == undefined) this.sortAscending = true;
    else this.sortAscending = !this.sortAscending;
    console.log("Sort VP Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn == 1) {
      // sort by VP Name
      this.visboprojects.sort(function(a, b) {
        var result = 0
        if (a.name > b.name)
          result = 1;
        else if (a.name < b.name)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by VP updatedAt
      this.visboprojects.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by VC Name
      this.visboprojects.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.vc.name > b.vc.name)
          result = 1;
        else if (a.vc.name < b.vc.name)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by VC Name
      this.visboprojects.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.vpvCount > b.vpvCount)
          result = 1;
        else if (a.vpvCount < b.vpvCount)
          result = -1;
        return result
      })
    }
    console.log("Sort VP Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visboprojects.reverse();
      console.log("Sort VP Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }

}
