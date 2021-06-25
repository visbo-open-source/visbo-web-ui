import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewCapacityCmpComponent } from './comp-viewcapacitycmp.component';

describe('VisboCompViewCapacityCmpComponent', () => {
  let component: VisboCompViewCapacityCmpComponent;
  let fixture: ComponentFixture<VisboCompViewCapacityCmpComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboCompViewCapacityCmpComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewCapacityCmpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
