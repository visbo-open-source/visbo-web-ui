import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboCompViewBubbleComponent } from './comp-viewbubble.component';

describe('VisboCompViewBubbleComponent', () => {
  let component: VisboCompViewBubbleComponent;
  let fixture: ComponentFixture<VisboCompViewBubbleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [VisboCompViewBubbleComponent],
    teardown: { destroyAfterEach: false }
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
