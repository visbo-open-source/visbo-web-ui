import { Injectable } from '@angular/core';
import { ServiceModule } from './service.module';

// eslint-disable-next-line
declare let google: any;

@Injectable({
  providedIn: ServiceModule
})
export class GoogleChartService {
  // eslint-disable-next-line
  private google: any;
  constructor() {
    this.google = google;
  }

  // eslint-disable-next-line
  getGoogle(): any {
    return this.google;
  }
}
