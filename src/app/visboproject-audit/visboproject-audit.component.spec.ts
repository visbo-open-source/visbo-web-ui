import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboprojectAuditComponent } from './visboproject-audit.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboprojectAuditComponent', () => {
  let component: VisboprojectAuditComponent;
  let fixture: ComponentFixture<VisboprojectAuditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisboprojectAuditComponent,
        SysNavbarComponent,
        NavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboprojectAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
