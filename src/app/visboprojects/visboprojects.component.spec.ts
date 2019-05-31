import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboProjectsComponent } from './visboprojects.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectsComponent', () => {
  let component: VisboProjectsComponent;
  let fixture: ComponentFixture<VisboProjectsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectsComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
