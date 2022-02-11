import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewCostComponent } from './comp-viewcost.component';

describe('VisboCompViewCostComponent', () => {
  let component: VisboCompViewCostComponent;
  let fixture: ComponentFixture<VisboCompViewCostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisboProjectViewCostComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewCostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
