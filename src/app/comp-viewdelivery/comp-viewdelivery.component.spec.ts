import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectViewDeliveryComponent } from './visboproject-viewdelivery.component';

describe('VisboProjectViewDeliveryComponent', () => {
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
