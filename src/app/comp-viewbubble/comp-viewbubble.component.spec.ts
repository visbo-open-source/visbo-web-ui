import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboCompViewBubbleComponent } from './comp-keyMetrics.component';

describe('VisboCompViewBubbleComponent', () => {
  let component: VisboCompViewBubbleComponent;
  let fixture: ComponentFixture<VisboCompViewBubbleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboCompViewBubbleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
