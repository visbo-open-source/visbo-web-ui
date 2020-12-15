import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewKeyMetricsComponent } from './comp-viewkeymetrics.component';

describe('VisboCompViewKeyMetricsComponent', () => {
  let component: VisboCompViewKeyMetricsComponent;
  let fixture: ComponentFixture<VisboCompViewKeyMetricsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectViewCostComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewKeyMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
