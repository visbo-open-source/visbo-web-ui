import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboCompViewBubbleCmpComponent } from './comp-viewbubblecmp.component';

describe('VisboCompViewBubbleCmpComponent', () => {
  let component: VisboCompViewBubbleCmpComponent;
  let fixture: ComponentFixture<VisboCompViewBubbleCmpComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [VisboCompViewBubbleCmpComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewBubbleCmpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
