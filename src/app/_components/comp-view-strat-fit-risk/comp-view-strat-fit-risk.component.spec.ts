import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompViewStratFitRiskComponent } from './comp-view-strat-fit-risk.component';

describe('CompViewStratFitRiskComponent', () => {
  let component: CompViewStratFitRiskComponent;
  let fixture: ComponentFixture<CompViewStratFitRiskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompViewStratFitRiskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompViewStratFitRiskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
