import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-timeline-chart',
  templateUrl: './timeline-chart.component.html',
  styleUrls: ['./timeline-chart.component.css']
})
export class TimelineChartComponent implements OnInit, OnChanges {

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
    this.gLib.charts.load('current', {'packages': ['timeline'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
    // this.log(`Google Chart Timeline Chart Init ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(changes: SimpleChanges) {
    // console.log(`Timeline Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // this.log(`Google Chart Timeline Chart Draw ${this.graphData.length}`);
    let chart: any, data: any;
    chart = new this.gLib.visualization.Timeline(document.getElementById('divTimelineChart'));
    data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;

    const options = {
      'title': 'Timeline Chart',
      'height': 400
    };

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const list = chart.getSelection();
      if (!list || list.length === 0 ) {
         console.log(`Chart Timeline: chartGetSelection is undefined`, list || list.length);
      } else {
        const selectedItem = list[0];
        parentThis.log(`Chart Timeline: The user selected ${JSON.stringify(selectedItem)}`);
        if (parentThis === undefined) {
          console.log(`Chart Timeline: The user clicked and this is undefined`);
        } else if (selectedItem) {
          const row = selectedItem.row;
          const col = selectedItem.column;
          if (row != null && row >= 0) {
            const label = data.getValue(row, 0);
            parentThis.timelineSelectRow(row, col, label);
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
