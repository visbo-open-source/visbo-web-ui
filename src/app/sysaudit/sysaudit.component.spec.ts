import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysauditComponent } from './sysaudit.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysauditComponent', () => {
  let component: SysauditComponent;
  let fixture: ComponentFixture<SysauditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        SysauditComponent,
        SysNavbarComponent,
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysauditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
