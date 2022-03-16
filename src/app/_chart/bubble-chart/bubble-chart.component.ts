import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

class Target {
  targetID: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-bubble-chart',
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css']
})
export class BubbleChartComponent implements OnInit, OnChanges {

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

    // this.log(`Google Chart Bubble Chart Init ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(): void {
    // console.log(`Bubble Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // this.log(`Google Chart Bubble Chart Draw ${this.graphData.length}`);
    const chart = new this.gLib.visualization.BubbleChart(document.getElementById('divBubbleChart'));
    const data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;

    // console.log("Google Chart Bubble Draw/Refresh");
    const options = {'title': 'Bubble Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const selectedItem = chart.getSelection()[0];
      if (parentThis === undefined) {
        // console.log(`Bubble: The user clicked and this is undefined`);
      } else if (selectedItem) {
        const row = selectedItem.row;
        const label = data.getValue(selectedItem.row, 0);
        // console.log(`Bubble: The user selected Row ${row} ${label}`);
        parentThis.chartSelectRow(row, label);
      }
    }

    // The click handler. Call the chart's getSelection() method
    function clickHandler(targetID: Target) {
      if (parentThis === undefined) {
        // console.log(`Bubble: The user clicked and this is undefined`);
      } else if (targetID) {
        // console.log(`Bubble: The user clicked ${JSON.stringify(targetID)}`);
      } else {
        // console.log(`Bubble: The user clicked somewhere`);
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);
    this.gLib.visualization.events.addListener(chart, 'click', clickHandler);

    chart.draw(data, this.graphOptions || options);
    this.initialised = true;
  }
}
