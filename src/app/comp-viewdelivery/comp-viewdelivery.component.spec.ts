import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewDeliveryComponent } from './comp-viewdelivery.component';

describe('VisboCompViewDeliveryComponent', () => {
  let component: VisboCompViewDeliveryComponent;
  let fixture: ComponentFixture<VisboCompViewDeliveryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboCompViewDeliveryComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
