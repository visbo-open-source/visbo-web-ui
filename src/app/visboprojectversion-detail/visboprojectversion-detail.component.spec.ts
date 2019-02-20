import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboProjectDetailComponent } from './visboproject-detail.component';

describe('VisboProjectDetailComponent', () => {
  let component: VisboProjectDetailComponent;
  let fixture: ComponentFixture<VisboProjectDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboProjectDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
