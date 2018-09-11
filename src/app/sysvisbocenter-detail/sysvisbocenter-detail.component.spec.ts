import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboCenterDetailComponent } from './visbocenter-detail.component';

describe('VisboCenterDetailComponent', () => {
  let component: VisboCenterDetailComponent;
  let fixture: ComponentFixture<VisboCenterDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboCenterDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCenterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
