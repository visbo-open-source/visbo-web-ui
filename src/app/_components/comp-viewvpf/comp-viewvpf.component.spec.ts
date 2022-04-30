import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboCompViewVPFComponent } from './comp-viewvpf.component';

describe('VisboCompViewVPFComponent', () => {
  let component: VisboCompViewVPFComponent;
  let fixture: ComponentFixture<VisboCompViewVPFComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [VisboCompViewVPFComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewVPFComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
