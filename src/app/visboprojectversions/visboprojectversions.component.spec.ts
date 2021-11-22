import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectVersionsComponent } from './visboprojectversions.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectVersionsComponent', () => {
  let component: VisboProjectVersionsComponent;
  let fixture: ComponentFixture<VisboProjectVersionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        VisboProjectVersionsComponent,
        NavbarComponent
    ],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
