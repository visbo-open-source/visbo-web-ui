import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-column-chart',
  templateUrl: './column-chart.component.html',
  styleUrls: ['./column-chart.component.css']
})
export class ColumnChartComponent implements OnInit, OnChanges {

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

    // console.log(`Google Chart Column Chart Init ${this.language} ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(): void {
    // console.log(`Column Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // console.log(`Google Chart Column Chart Draw ${this.graphData.length}`);
    const chart = new this.gLib.visualization.ColumnChart(document.getElementById('divColumnChart'));
    const data = new this.gLib.visualization.arrayToDataTable(this.graphData);

    const options = {'title': 'Column Chart'};

    chart.draw(data, this.graphOptions || options);
    this.initialised = true;
  }

}
