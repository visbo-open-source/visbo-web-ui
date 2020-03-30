import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboProjectKeyMetricsComponent } from './visboproject-viewvpv.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboProjectVersionsComponent', () => {
  let component: VisboProjectKeyMetricsComponent;
  let fixture: ComponentFixture<VisboProjectKeyMetricsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboProjectKeyMetricsComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboProjectKeyMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
