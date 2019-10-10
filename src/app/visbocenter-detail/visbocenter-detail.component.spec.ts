import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisbocenterDetailComponent } from './visbocenter-detail.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisbocenterDetailComponent', () => {
  let component: VisbocenterDetailComponent;
  let fixture: ComponentFixture<VisbocenterDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisbocenterDetailComponent,
        NavbarComponent
      ]
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
