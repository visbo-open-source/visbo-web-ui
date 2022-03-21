import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewVPComponent } from './comp-viewvp.component';

describe('VisboCompViewVPComponent', () => {
  let component: VisboCompViewVPComponent;
  let fixture: ComponentFixture<VisboCompViewVPComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisboCompViewVPComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewVPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
