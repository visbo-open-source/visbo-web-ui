import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysvisbosystemComponent } from './sysvisbosystem.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysvisbosystemComponent', () => {
  let component: SysvisbosystemComponent;
  let fixture: ComponentFixture<SysvisbosystemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        SysvisbosystemComponent,
        SysNavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysvisbosystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
