import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysvisbocenterDetailComponent } from './sysvisbocenter-detail.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysvisbocenterDetailComponent', () => {
  let component: SysvisbocenterDetailComponent;
  let fixture: ComponentFixture<SysvisbocenterDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        SysvisbocenterDetailComponent,
        SysNavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysvisbocenterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
