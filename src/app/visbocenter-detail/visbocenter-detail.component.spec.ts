import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisbocenterDetailComponent } from './visbocenter-detail.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisbocenterDetailComponent', () => {
  let component: VisbocenterDetailComponent;
  let fixture: ComponentFixture<VisbocenterDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisbocenterDetailComponent,
        NavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisbocenterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
