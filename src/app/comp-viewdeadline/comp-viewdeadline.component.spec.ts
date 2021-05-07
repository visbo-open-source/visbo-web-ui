import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewDeadlineComponent } from './comp-viewdeadline.component';

describe('VisboCompViewDeadlineComponent', () => {
  let component: VisboCompViewDeadlineComponent;
  let fixture: ComponentFixture<VisboCompViewDeadlineComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboCompViewDeadlineComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewDeadlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
