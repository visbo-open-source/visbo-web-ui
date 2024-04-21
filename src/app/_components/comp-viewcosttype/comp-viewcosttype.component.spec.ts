import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompViewcosttypeComponent } from './comp-viewcosttype.component';

describe('CompViewcosttypeComponent', () => {
  let component: CompViewcosttypeComponent;
  let fixture: ComponentFixture<CompViewcosttypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompViewcosttypeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompViewcosttypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
