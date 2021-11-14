import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimelineChartComponent } from './timeline-chart.component';

describe('TimelineChartComponent', () => {
  let component: TimelineChartComponent;
  let fixture: ComponentFixture<TimelineChartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [TimelineChartComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
