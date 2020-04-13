import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css']
})
export class LineChartComponent implements OnInit {

  @Input() graphData: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;
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

    // console.log(`Google Chart Line Chart Init ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(changes: SimpleChanges) {
    // console.log(`Line Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // console.log(`Google Chart Line Chart Draw ${this.graphData.length}`);
    let chart: any, data: any;
    chart = new this.gLib.visualization.LineChart(document.getElementById('divLineChart'));
    data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;

    const options = {'title': 'Line Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const list = chart.getSelection();
      if (!list || list.length === 0 ) {
         console.log(`Chart Line: chartGetSelection is undefined`, list || list.length);
      } else {
        const selectedItem = list[0];
        parentThis.log(`Chart Line: The user selected ${JSON.stringify(selectedItem)}`);
        if (parentThis === undefined) {
          console.log(`Chart Line: The user clicked and this is undefined`);
        } else if (selectedItem) {
          const row = selectedItem.row;
          const col = selectedItem.column;
          if (row != null && row >= 0) {
            const label = data.getValue(row, 0);
            parentThis.chartSelectRow(row, col, label);
          }
        }
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);

    chart.draw(data, this.graphOptions || options);
    this.initialised = true;
  }
}
