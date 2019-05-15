import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SystasksComponent } from './systasks.component';

describe('SystasksComponent', () => {
  let component: SystasksComponent;
  let fixture: ComponentFixture<SystasksComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SystasksComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SystasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
