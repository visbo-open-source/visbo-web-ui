import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewCostComponent } from './visboproject-viewcost.component';

describe('VisboCompViewCostComponent', () => {
  let component: VisboCompViewCostComponent;
  let fixture: ComponentFixture<VisboCompViewCostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectViewCostComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewCostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
