import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewCapacityComponent } from './comp-viewcapacity.component';

describe('VisboCompViewCapacityComponent', () => {
  let component: VisboCompViewCapacityComponent;
  let fixture: ComponentFixture<VisboCompViewCapacityComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectViewCapacityComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewCapacityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
