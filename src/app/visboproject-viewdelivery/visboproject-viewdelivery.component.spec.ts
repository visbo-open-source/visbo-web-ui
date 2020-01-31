import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectViewDeliveryComponent } from './visboproject-viewdelivery.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectViewDeliveryComponent', () => {
  let component: VisboProjectViewDeliveryComponent;
  let fixture: ComponentFixture<VisboProjectViewDeliveryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectViewDeliveryComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectViewDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
