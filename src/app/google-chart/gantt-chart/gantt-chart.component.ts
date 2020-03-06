import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-gantt-chart',
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css']
})
export class GanttChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;

  constructor(
    private gChartService: GoogleChartService
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages': ['corechart', 'table', 'gantt']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Gantt Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart() {
    // this.log(`Google Chart Gantt Chart Draw ${this.graphData.length}`);
    let chart: any, data: any;
    chart = new this.gLib.visualization.Gantt(document.getElementById('divGanttChart'));
    data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;

    const options = {'title': 'Gantt Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const list = chart.getSelection();
      if (parentThis === undefined) {
        console.log(`Chart Gantt: The user clicked and parentThis is undefined`);
        return;
      }
      if (!list || list.length === 0 ) {
         parentThis.log(`Chart Gantt: chartGetSelection is undefined`, list || list.length);
         parentThis.ganttSelectRow(undefined, undefined);
      } else {
        const selectedItem = list[0];
        parentThis.log(`Chart Gantt: The user selected ${JSON.stringify(selectedItem)}`);
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
  }
}
