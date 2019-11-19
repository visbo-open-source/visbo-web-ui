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
    private gChartService : GoogleChartService
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages':['corechart','table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Bubble Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart(){
    // this.log(`Google Chart Bubble Chart Draw ${this.graphData.length}`);
    let chart = new this.gLib.visualization.BubbleChart(document.getElementById('divBubbleChart'));
    let data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    let parentThis = this.parentThis;

    parentThis.log("Google Chart Bubble Draw/Refresh");
    let options = {'title':'Bubble Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      var selectedItem = chart.getSelection()[0];
      if (parentThis == undefined) console.log(`Bubble: The user clicked and this is undefined`)
      else if (selectedItem) {
        var row = selectedItem.row;
        var label = data.getValue(selectedItem.row, 0);
        parentThis.log(`Bubble: The user selected Row ${row} ${label}`)
        parentThis.chartSelectRow(row, label);
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);

    chart.draw(data, this.graphOptions || options);
  }
}
