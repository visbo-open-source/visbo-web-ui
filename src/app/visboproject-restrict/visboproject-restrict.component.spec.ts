import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboprojectRestrictComponent } from './visboproject-restrict.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboprojectRestrictComponent', () => {
  let component: VisboprojectRestrictComponent;
  let fixture: ComponentFixture<VisboprojectRestrictComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboprojectRestrictComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboprojectRestrictComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
