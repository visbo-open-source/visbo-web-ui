import { Component, Input, OnInit } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-bubble-chart',
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css']
})
export class BubbleChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;

  constructor(
    private gChartService: GoogleChartService
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages': ['corechart', 'table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Bubble Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart() {
    // this.log(`Google Chart Bubble Chart Draw ${this.graphData.length}`);
    let chart: any, data: any;
    chart = new this.gLib.visualization.BubbleChart(document.getElementById('divBubbleChart'));
    data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;

    // parentThis.log("Google Chart Bubble Draw/Refresh");
    const options = {'title': 'Bubble Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const selectedItem = chart.getSelection()[0];
      if (parentThis === undefined) {
        console.log(`Bubble: The user clicked and this is undefined`);
      } else if (selectedItem) {
        const row = selectedItem.row;
        const label = data.getValue(selectedItem.row, 0);
        parentThis.log(`Bubble: The user selected Row ${row} ${label}`);
        parentThis.chartSelectRow(row, label);
      }
    }
    // The select handler. Call the chart's getSelection() method
    function clickHandler(targetID: any) {
      if (parentThis === undefined) {
        console.log(`Bubble: The user clicked and this is undefined`);
      } else if (targetID) {
        parentThis.log(`Bubble: The user clicked ${JSON.stringify(targetID)}`);
      } else {
        parentThis.log(`Bubble: The user clicked somewhere`);
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);
    this.gLib.visualization.events.addListener(chart, 'click', clickHandler);

    chart.draw(data, this.graphOptions || options);
  }
}
