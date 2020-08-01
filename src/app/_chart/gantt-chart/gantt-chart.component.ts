import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-gantt-chart',
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css']
})
export class GanttChartComponent implements OnInit, OnChanges {

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
    this.gLib.charts.load('current', {'packages': ['gantt'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));

    // console.log(`Google Chart Gantt Chart Init ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(): void {
    // console.log(`Gantt Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // this.log(`Google Chart Gantt Chart Draw ${this.graphData.length}`);
    const chart = new this.gLib.visualization.Gantt(document.getElementById('divGanttChart'));

    const data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;
    const options = {
      height: 400
    };

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const list = chart.getSelection();
      if (parentThis === undefined) {
        console.log(`Chart Gantt: The user clicked and parentThis is undefined`);
        return;
      }
      if (!list || list.length === 0 ) {
         console.log(`Chart Gantt: chartGetSelection is undefined`, list || list.length);
         parentThis.ganttSelectRow(undefined, undefined);
      } else {
        const selectedItem = list[0];
        console.log(`Chart Gantt: The user selected ${JSON.stringify(selectedItem)}`);
        const row = selectedItem.row;
        if (row != null && row >= 0) {
          const label = data.getValue(row, 0);
          parentThis.ganttSelectRow(row, label);
        } else {
          parentThis.ganttSelectRow(undefined, undefined);
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
