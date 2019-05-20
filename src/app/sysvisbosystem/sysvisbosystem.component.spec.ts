import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysvisbosystemComponent } from './sysvisbosystem.component';

describe('SysvisbosystemComponent', () => {
  let component: SysvisbosystemComponent;
  let fixture: ComponentFixture<SysvisbosystemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SysvisbosystemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysvisbosystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
