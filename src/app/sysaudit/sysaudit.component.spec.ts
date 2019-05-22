import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysauditComponent } from './sysaudit.component';

describe('SysauditComponent', () => {
  let component: SysauditComponent;
  let fixture: ComponentFixture<SysauditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SysauditComponent ]
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
