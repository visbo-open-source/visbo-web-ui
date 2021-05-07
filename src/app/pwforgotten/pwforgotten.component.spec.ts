import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PwforgottenComponent } from './pwforgotten.component';

describe('PwforgottenComponent', () => {
  let component: PwforgottenComponent;
  let fixture: ComponentFixture<PwforgottenComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PwforgottenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PwforgottenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
