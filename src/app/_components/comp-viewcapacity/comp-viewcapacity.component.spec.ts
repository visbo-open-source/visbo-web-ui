import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewCapacityComponent } from './comp-viewcapacity.component';

describe('VisboCompViewCapacityComponent', () => {
  let component: VisboCompViewCapacityComponent;
  let fixture: ComponentFixture<VisboCompViewCapacityComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisboCompViewCapacityComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewCapacityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
