import { TestBed } from '@angular/core/testing';

import { AlertService } from './alert.service';

describe('AlertService', () => {
  var service: any;
  beforeEach(() => {
    TestBed.configureTestingModule({
    providers: [AlertService],
    teardown: { destroyAfterEach: false }
});
    service = TestBed.inject(AlertService); // * inject service instance
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('set success message', () => {
    // * act
    const message = 'Visbo Center Created'
    service.success(message);
    // * assert
    expect(service.getMessage()).toBe(message);
  });
});
