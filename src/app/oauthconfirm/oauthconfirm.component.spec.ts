import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OauthconfirmComponent } from './oauthconfirm.component';

describe('OauthconfirmComponent', () => {
  let component: OauthconfirmComponent;
  let fixture: ComponentFixture<OauthconfirmComponent>;

  beforeEach(async(() => {
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
