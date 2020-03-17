import { Component, Input, OnInit } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements OnInit {

  private gLib: any;
  @Input() elementID: string;
  @Input() graphData: any;
  @Input() graphDataBefore: any;
  @Input() graphLegend: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;
  @Input() language: string;

  constructor(
    private gChartService: GoogleChartService
  ) {
    if (!this.language) { this.language = 'de'; }
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages': ['corechart', 'table'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    this.parentThis.log(`Google Chart Pie Chart Init elementID ${JSON.stringify(this.elementID)}`);
    if (!this.elementID || this.elementID === '') {
      this.elementID = 'divPieChart';
    }
  }

  private drawChart() {
    // this.log(`Google Chart Pie Chart Draw ${this.graphData.length}`);
    const chart = new this.gLib.visualization.PieChart(document.getElementById(this.elementID));
    const data = new this.gLib.visualization.DataTable();
    const dataBefore = new this.gLib.visualization.DataTable();
    const parentThis = this.parentThis;
    for (let i = 0; i < this.graphLegend.length; i++) {
      data.addColumn(this.graphLegend[i][0], this.graphLegend[i][1]);
    }
    data.addRows(this.graphData);
    if (this.graphDataBefore && this.graphDataBefore.length > 0) {
      for (let i = 0; i < this.graphLegend.length; i++) {
        dataBefore.addColumn(this.graphLegend[i][0], this.graphLegend[i][1]);
      }
      dataBefore.addRows(this.graphDataBefore);
    }

    const options = {
      'title': 'Pie Chart Title',
      'sliceVisibilityThreshold': .0
    };

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const selectedItem = chart.getSelection()[0];
      if (!parentThis) {
        console.log(`The user clicked and this is undefined`);
        return;
      }
      parentThis.log(`Pie Chart Selected Item ${JSON.stringify(selectedItem)}`)
      if (selectedItem) {
        const label = data.getValue(selectedItem.row, 0);
        const value = data.getValue(selectedItem.row, 1);
        // parentThis.log(`The user selected Row ${selectedItem.row} ${label} ${value}`)
        if (parentThis.chartSelectRow) {
          parentThis.chartSelectRow(selectedItem.row, label, value);
        }
      } else {
        parentThis.chartSelectRow(undefined, undefined, undefined);
      }
    }

    if (!this.graphDataBefore || this.graphDataBefore.length === 0) {
      // Listen for the 'select' event, and call my function selectHandler() when
      // the user selects something on the chart.
      this.gLib.visualization.events.addListener(chart, 'select', selectHandler);
      chart.draw(data, this.graphOptions || options);
    } else {
      const diffData = chart.computeDiff(dataBefore, data);
      this.gLib.visualization.events.addListener(chart, 'select', selectHandler);
      chart.draw(diffData, this.graphOptions || options);
    }
  }
}
