import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboCentersComponent } from './visbocenters.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboCentersComponent', () => {
  let component: VisboCentersComponent;
  let fixture: ComponentFixture<VisboCentersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboCentersComponent,
        SysNavbarComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
