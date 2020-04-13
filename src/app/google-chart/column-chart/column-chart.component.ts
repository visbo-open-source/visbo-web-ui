import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-column-chart',
  templateUrl: './column-chart.component.html',
  styleUrls: ['./column-chart.component.css']
})
export class ColumnChartComponent implements OnInit {

  @Input() graphData: any;
  @Input() graphOptions: any;
  @Input() language: string;

  private gLib: any;
  initialised: boolean;

  constructor(
    private gChartService: GoogleChartService
  ) {}

  ngOnInit() {
    if (!this.language) { this.language = 'de'; }
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages': ['corechart', 'table'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));

    // console.log(`Google Chart Column Chart Init ${this.language} ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(changes: SimpleChanges) {
    // console.log(`Column Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // console.log(`Google Chart Column Chart Draw ${this.graphData.length}`);
    let chart: any, data: any;
    chart = new this.gLib.visualization.ColumnChart(document.getElementById('divColumnChart'));
    data = new this.gLib.visualization.arrayToDataTable(this.graphData);

    const options = {'title': 'Column Chart'};

    chart.draw(data, this.graphOptions || options);
    this.initialised = true;
  }

}
