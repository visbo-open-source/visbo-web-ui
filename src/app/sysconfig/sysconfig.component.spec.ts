import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysconfigComponent } from './sysconfig.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysconfigComponent', () => {
  let component: SysconfigComponent;
  let fixture: ComponentFixture<SysconfigComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SysconfigComponent,
        SysNavbarComponent
      ]
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
