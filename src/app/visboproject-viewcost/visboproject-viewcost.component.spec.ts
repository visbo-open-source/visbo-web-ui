import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectViewCostComponent } from './visboproject-viewcost.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectVersionsComponent', () => {
  let component: VisboProjectViewCostComponent;
  let fixture: ComponentFixture<VisboProjectViewCostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectViewCostComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectViewCostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
