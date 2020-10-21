import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import 'jasmine';

import { VisboCompViewVPVListComponent } from './comp-vpvlist.component';

describe('VisboCompViewVPVListComponent', () => {
  let component: VisboCompViewVPVListComponent;
  let fixture: ComponentFixture<VisboCompViewVPVListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VisboCompViewVPVListComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisboCompViewVPVListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
