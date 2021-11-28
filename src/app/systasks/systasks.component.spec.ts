import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SystasksComponent } from './systasks.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SystasksComponent', () => {
  let component: SystasksComponent;
  let fixture: ComponentFixture<SystasksComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        SystasksComponent,
        SysNavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SystasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
