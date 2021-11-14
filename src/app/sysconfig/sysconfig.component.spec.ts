import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysconfigComponent } from './sysconfig.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysconfigComponent', () => {
  let component: SysconfigComponent;
  let fixture: ComponentFixture<SysconfigComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        SysconfigComponent,
        SysNavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
