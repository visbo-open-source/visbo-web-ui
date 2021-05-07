import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { OauthconfirmComponent } from './oauthconfirm.component';

describe('OauthconfirmComponent', () => {
  let component: OauthconfirmComponent;
  let fixture: ComponentFixture<OauthconfirmComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ OauthconfirmComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OauthconfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
