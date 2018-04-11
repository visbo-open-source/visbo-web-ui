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
    this.visbocenterService.getVisboCenters()
        .subscribe(visbocenters => this.visbocenters = visbocenters);
  }

  add(name: string): void {
    name = name.trim();
    if (!name) { return; }
    this.visbocenterService.addVisboCenter({ name: name } as VisboCenter)
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
}
