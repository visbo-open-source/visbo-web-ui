import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ComboChartComponent } from './combo-chart.component';

describe('ComboChartComponent', () => {
  let component: ComboChartComponent;
  let fixture: ComponentFixture<ComboChartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ComboChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComboChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
