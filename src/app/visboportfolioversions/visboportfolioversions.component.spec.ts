import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboPortfolioVersionsComponent } from './visboportfolioversions.component';
import { NavbarComponent } from '../navbar/navbar.component';

describe('VisboPortfolioVersionsComponent', () => {
  let component: VisboPortfolioVersionsComponent;
  let fixture: ComponentFixture<VisboPortfolioVersionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboPortfolioVersionsComponent,
        NavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboPortfolioVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
