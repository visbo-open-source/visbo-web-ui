import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboCompViewKeyMetricsComponent } from './comp-keyMetrics.component';

describe('VisboCompViewKeyMetricsComponent', () => {
  let component: VisboCompViewKeyMetricsComponent;
  let fixture: ComponentFixture<VisboCompViewKeyMetricsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboCompViewKeyMetricsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewKeyMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
