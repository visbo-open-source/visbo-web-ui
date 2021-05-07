import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PwresetComponent } from './pwreset.component';

describe('PwresetComponent', () => {
  let component: PwresetComponent;
  let fixture: ComponentFixture<PwresetComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PwresetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PwresetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
