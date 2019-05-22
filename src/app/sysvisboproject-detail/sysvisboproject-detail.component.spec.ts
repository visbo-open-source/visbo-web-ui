import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysvisboprojectDetailComponent } from './sysvisboproject-detail.component';

describe('SysvisboprojectDetailComponent', () => {
  let component: SysvisboprojectDetailComponent;
  let fixture: ComponentFixture<SysvisboprojectDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SysvisboprojectDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysvisboprojectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
