import { Component, OnInit } from '@angular/core';
//import { ActivatedRoute } from '@angular/router';
import { ActivatedRoute, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-visbocenters',
  templateUrl: './visbocenters.component.html'
})
export class VisboCentersComponent implements OnInit {

  visbocenters: VisboCenter[];
  sortAscending: boolean;
  sortColumn: number;

  constructor(
    private visbocenterService: VisboCenterService,
    private route: ActivatedRoute,
    //private location: Location,
    private router: Router
  ) { }

  ngOnInit() {
    this.getVisboCenters();
  }

  onSelect(visbocenter: VisboCenter): void {
    this.getVisboCenters();
  }

  getVisboCenters(): void {
    // console.log("VC getVisboCenters");
    this.visbocenterService.getVisboCenters()
        .subscribe(visbocenters =>
          {
            this.visbocenters = visbocenters;
            this.sortVCTable(1);
          }
        );
  }

  add(name: string, description: string): void {
    name = name.trim();
    description = description.trim();
    if (!name) { return; }
    this.visbocenterService.addVisboCenter({ name: name, description: description } as VisboCenter)
      .subscribe(vc => { this.visbocenters.push(vc[0]); });
  }

  delete(visbocenter: VisboCenter): void {
    // remove item from list
    this.visbocenters = this.visbocenters.filter(vc => vc !== visbocenter);
    this.visbocenterService.deleteVisboCenter(visbocenter).subscribe();
  }

  gotoDetail(visbocenter: VisboCenter):void {
    this.router.navigate(['vcDetail/'+visbocenter._id]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

  gotoClickedRow(visbocenter: VisboCenter):void {
    // console.log("clicked row %s", visbocenter.name);
    this.router.navigate(['vp/'+visbocenter._id]);
    //this.router.navigate(['vp'], { queryParams: { vc: visbocenter.name } });
  }

  sortVCTable(n) {

    if (!this.visbocenters) return
    if (n != this.sortColumn) {
      this.sortColumn = n;
      this.sortAscending = undefined;
    }

    if (this.sortAscending == undefined) {
      // sort name column ascending, number values desc first
      this.sortAscending = n == 1 ? true : false;
      // console.log("Sort VC Column undefined", this.sortColumn, this.sortAscending)
    }
    else this.sortAscending = !this.sortAscending;
    // console.log("Sort VC Column %d Asc %s", this.sortColumn, this.sortAscending)
    if (this.sortColumn == 1) {
      this.visbocenters.sort(function(a, b) {
        var result = 0
        if (a.name.toLowerCase() > b.name.toLowerCase())
          result = 1;
        else if (a.name.toLowerCase() < b.name.toLowerCase())
          result = -1;
        return result
      })
    } else if (this.sortColumn == 2) {
      this.visbocenters.sort(function(a, b) {
        var result = 0
        // console.log("Sort VC Date %s", a.updatedAt)
        if (a.updatedAt > b.updatedAt)
          result = 1;
        else if (a.updatedAt < b.updatedAt)
          result = -1;
        return result
      })
    } else if (this.sortColumn == 3) {
      // sort VP Count
      this.visbocenters.sort(function(a, b) { return a.vpCount - b.vpCount })
    }
    // console.log("Sort VC Column %d %s Reverse?", this.sortColumn, this.sortAscending)
    if (!this.sortAscending) {
      this.visbocenters.reverse();
      // console.log("Sort VC Column %d %s Reverse", this.sortColumn, this.sortAscending)
    }
  }
}
