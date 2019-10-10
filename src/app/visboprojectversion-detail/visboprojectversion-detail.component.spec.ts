import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboProjectVersionDetailComponent } from './visboprojectversion-detail.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectVersionDetailComponent', () => {
  let component: VisboProjectVersionDetailComponent;
  let fixture: ComponentFixture<VisboProjectVersionDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectVersionDetailComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectVersionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
