import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysuserComponent } from './sysuser.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysuserComponent', () => {
  let component: SysuserComponent;
  let fixture: ComponentFixture<SysuserComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        SysuserComponent,
        SysNavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysuserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
