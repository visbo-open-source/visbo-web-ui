import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyssettingsComponent } from './syssettings.component';

describe('SyssettingsComponent', () => {
  let component: SyssettingsComponent;
  let fixture: ComponentFixture<SyssettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SyssettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SyssettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
