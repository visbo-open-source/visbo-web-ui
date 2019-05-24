import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysconfigComponent } from './sysconfig.component';

describe('SysconfigComponent', () => {
  let component: SysconfigComponent;
  let fixture: ComponentFixture<SysconfigComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SysconfigComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
