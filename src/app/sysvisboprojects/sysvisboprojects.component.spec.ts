import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysVisboProjectsComponent } from './sysvisboprojects.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysVisboProjectsComponent', () => {
  let component: SysVisboProjectsComponent;
  let fixture: ComponentFixture<SysVisboProjectsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        SysVisboProjectsComponent,
        SysNavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysVisboProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
