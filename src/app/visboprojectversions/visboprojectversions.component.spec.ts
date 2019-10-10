import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectVersionsComponent } from './visboprojectversions.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectVersionsComponent', () => {
  let component: VisboProjectVersionsComponent;
  let fixture: ComponentFixture<VisboProjectVersionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectVersionsComponent,
        NavbarComponent
      ]
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
