import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisbocenterAuditComponent } from './visbocenter-audit.component';

describe('VisbocenterAuditComponent', () => {
  let component: VisbocenterAuditComponent;
  let fixture: ComponentFixture<VisbocenterAuditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisbocenterAuditComponent ]
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
