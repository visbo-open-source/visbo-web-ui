import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboprojectDetailComponent } from './visboproject-detail.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboprojectDetailComponent', () => {
  let component: VisboprojectDetailComponent;
  let fixture: ComponentFixture<VisboprojectDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboprojectDetailComponent,
        NavbarComponent
      ]
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
