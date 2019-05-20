import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboprojectAuditComponent } from './visboproject-audit.component';

describe('VisboprojectAuditComponent', () => {
  let component: VisboprojectAuditComponent;
  let fixture: ComponentFixture<VisboprojectAuditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboprojectAuditComponent ]
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
