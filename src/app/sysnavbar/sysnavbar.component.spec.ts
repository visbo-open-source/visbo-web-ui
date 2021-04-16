import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SysNavbarComponent } from './sysnavbar.component';

describe('SysNavbarComponent', () => {
  let component: SysNavbarComponent;
  let fixture: ComponentFixture<SysNavbarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SysNavbarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
