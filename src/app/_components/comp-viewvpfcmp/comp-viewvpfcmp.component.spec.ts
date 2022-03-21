import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboCompViewVpfCmpComponent } from './comp-viewvpfcmp.component';

describe('VisboCompViewVpfCmpComponent', () => {
  let component: VisboCompViewVpfCmpComponent;
  let fixture: ComponentFixture<VisboCompViewVpfCmpComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [VisboCompViewVpfCmpComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewVpfCmpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
