import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisbocenterAuditComponent } from './visbocenter-audit.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisbocenterAuditComponent', () => {
  let component: VisbocenterAuditComponent;
  let fixture: ComponentFixture<VisbocenterAuditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisbocenterAuditComponent,
        SysNavbarComponent,
        NavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisbocenterAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
