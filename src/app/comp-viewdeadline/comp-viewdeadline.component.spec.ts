import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewDeadlineComponent } from './visboproject-viewdeadline.component';

describe('VisboProjectViewDeadlineComponent', () => {
  let component: VisboCompViewDeadlineComponent;
  let fixture: ComponentFixture<VisboCompViewDeadlineComponent>;

  beforeEach(async(() => {
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
