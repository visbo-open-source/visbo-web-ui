import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboprojectDetailComponent } from './visboproject-detail.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboprojectDetailComponent', () => {
  let component: VisboprojectDetailComponent;
  let fixture: ComponentFixture<VisboprojectDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisboprojectDetailComponent,
        NavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboprojectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
