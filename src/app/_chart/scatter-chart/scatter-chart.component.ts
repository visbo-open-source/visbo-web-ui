import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-scatter-chart',
  templateUrl: './scatter-chart.component.html',
  styleUrls: ['./scatter-chart.component.css']
})
export class ScatterChartComponent implements OnInit, OnChanges {

  @Input() graphData: [];
  @Input() language: string;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  @Input() graphOptions: any;
  @Input() parentThis: any;
  private gLib: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  initialised: boolean;

  constructor(
    private gChartService: GoogleChartService
  ) {}

  ngOnInit(): void {
    if (!this.language) { this.language = 'de'; }
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages': ['corechart', 'table'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
    // console.log(`Google Chart Scatter Chart Init ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(): void {
    // console.log(`Scatter Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // console.log(`Google Chart Scatter Chart Draw ${this.graphData.length}`);
    const chart = new this.gLib.visualization.ScatterChart(document.getElementById('divScatterChart'));
    const data = new this.gLib.visualization.arrayToDataTable(this.graphData);

    const options = {'title': 'Scatter Chart'};

    chart.draw(data, this.graphOptions || options);
    this.initialised = true;
  }
}
