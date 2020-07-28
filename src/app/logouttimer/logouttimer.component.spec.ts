import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoutTimerComponent } from './logouttimer.component';

describe('LogoutTimerComponent', () => {
  let component: LogoutTimerComponent;
  let fixture: ComponentFixture<LogoutTimerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LogoutTimerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogoutTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
