import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisboPortfolioCmpComponent } from './visboportfolio-cmp.component';

describe('VisboPortfolioCmpComponent', () => {
  let component: VisboPortfolioCmpComponent;
  let fixture: ComponentFixture<VisboPortfolioCmpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [VisboPortfolioCmpComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboPortfolioCmpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
