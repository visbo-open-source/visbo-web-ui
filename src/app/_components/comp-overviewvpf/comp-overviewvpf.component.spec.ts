import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboCompOverviewVPFComponent } from './comp-overviewvpf.component';

describe('VisboCompOverviewVPFComponent', () => {
  let component: VisboCompOverviewVPFComponent;
  let fixture: ComponentFixture<VisboCompOverviewVPFComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [VisboCompOverviewVPFComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompOverviewVPFComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
