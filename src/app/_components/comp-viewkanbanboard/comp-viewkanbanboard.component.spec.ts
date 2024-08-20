import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompViewkanbanboardComponent } from './comp-viewkanbanboard.component';

describe('CompViewkanbanboardComponent', () => {
  let component: CompViewkanbanboardComponent;
  let fixture: ComponentFixture<CompViewkanbanboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompViewkanbanboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompViewkanbanboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
