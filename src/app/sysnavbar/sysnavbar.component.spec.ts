import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysNavbarComponent } from './sysnavbar.component';

describe('SysNavbarComponent', () => {
  let component: SysNavbarComponent;
  let fixture: ComponentFixture<SysNavbarComponent>;

  beforeEach(async(() => {
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
