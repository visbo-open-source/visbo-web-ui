import { TestBed } from '@angular/core/testing';

import { MessageService } from './message.service';

describe('MessageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageService]
    });
    service = TestBed.get(MessageService); // * inject service instance
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
