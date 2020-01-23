import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarComponent } from '../navbar/navbar.component';
import { VisboPortfolioVersionsComponent } from './visboportfolio-versions.component';

describe('VisboPortfolioVersionsComponent', () => {
  let component: VisboPortfolioVersionsComponent;
  let fixture: ComponentFixture<VisboPortfolioVersionsComponent>;

  beforeEach(async(() => {
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
