import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboCentersComponent } from './visbocenters.component';

describe('VisboCentersComponent', () => {
  let component: VisboCentersComponent;
  let fixture: ComponentFixture<VisboCentersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboCentersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
