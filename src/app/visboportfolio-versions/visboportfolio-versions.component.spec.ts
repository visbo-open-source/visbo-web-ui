import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VisboPortfolioVersionsComponent } from './visboportfolio-versions.component';

describe('VisboPortfolioVersionsComponent', () => {
  let component: VisboPortfolioVersionsComponent;
  let fixture: ComponentFixture<VisboPortfolioVersionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VisboPortfolioVersionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboPortfolioVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
