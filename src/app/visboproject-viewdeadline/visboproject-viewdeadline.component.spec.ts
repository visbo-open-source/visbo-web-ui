import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectViewDeadlineComponent } from './visboproject-viewdeadline.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectViewDeadlineComponent', () => {
  let component: VisboProjectViewDeadlineComponent;
  let fixture: ComponentFixture<VisboProjectViewDeadlineComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectViewDeadlineComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectViewDeadlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
