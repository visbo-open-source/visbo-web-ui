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
  sortAscending: boolean;
  sortColumn: number;

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

  gotoDetail(visboprojectversion: VisboProjectVersion):void {
    console.log("clicked Details %s", visboprojectversion.name);
    // this.router.navigate(['vpvDetail/'.concat(visboprojectversion._id)]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

  gotoVPDetail(visboproject: VisboProject):void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  sortVPVTable(n) {
    if (!this.visboprojectversions) return
    if (n != this.sortColumn) {
      this.sortColumn = n;
      this.sortAscending = undefined;
    }
    if (this.sortAscending == undefined) {
      // sort name column ascending, number values desc first
      this.sortAscending = ( n == 5 ) ? true : false;
    }
    else this.sortAscending = !this.sortAscending;
    if (this.sortColumn == 1) {
      // sort by VPV Timestamp
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.timestamp > b.timestamp)
          result = 1;
        else if (a.timestamp < b.timestamp)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      // sort by VPV endDate
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.endDate > b.endDate)
          result = 1;
        else if (a.endDate < b.endDate)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort by VPV ampelStatus
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.ampelStatus > b.ampelStatus)
          result = 1;
        else if (a.ampelStatus < b.ampelStatus)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 4) {
      // sort by VPV Erloes
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.Erloes > b.Erloes)
          result = 1;
        else if (a.Erloes < b.Erloes)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 5) {
      // sort by VC vpvCount
      this.visboprojectversions.sort(function(a, b) {
        var result = 0
        if (a.variantName.toLowerCase() > b.variantName.toLowerCase())
          result = 1;
        else if (a.variantName.toLowerCase() < b.variantName.toLowerCase())
          result = -1;
        return result
      })
    }
    if (!this.sortAscending) {
      this.visboprojectversions.reverse();
    }
  }

}
