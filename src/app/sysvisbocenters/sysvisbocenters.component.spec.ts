import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SysVisboCentersComponent } from './sysvisbocenters.component';
import { SysNavbarComponent } from '../sysnavbar/sysnavbar.component';

describe('SysVisboCentersComponent', () => {
  let component: SysVisboCentersComponent;
  let fixture: ComponentFixture<SysVisboCentersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SysVisboCentersComponent,
        SysNavbarComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SysVisboCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
