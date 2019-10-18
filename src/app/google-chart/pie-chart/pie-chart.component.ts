import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;
  @Input() graphLegend: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;

  constructor(
    private gChartService : GoogleChartService,
    private messageService: MessageService,
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages':['corechart','table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Pie Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart(){
    // this.log(`Google Chart Pie Chart Draw ${this.graphData.length}`);
    let chart = new this.gLib.visualization.PieChart(document.getElementById('divPieChart'));
    let data = new this.gLib.visualization.DataTable();
    let parentThis = this.parentThis;
    for (var i = 0; i < this.graphLegend.length; i++) {
      data.addColumn(this.graphLegend[i][0], this.graphLegend[i][1]);
    }
    // data.addColumn('string', 'Accessories');
    // data.addColumn('number', 'Quantity');
    data.addRows(this.graphData);

    let options = {
      'title':'Pie Chart Title',
      'sliceVisibilityThreshold': .0
    };

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      var selectedItem = chart.getSelection()[0];
      if (parentThis) console.log(`The user clicked and this is defined`);
      else if (parentThis == undefined) console.log(`The user clicked and this is undefined`)
      if (selectedItem) {
        var label = data.getValue(selectedItem.row, 0);
        var value = data.getValue(selectedItem.row, 1);
        console.log(`The user selected Row ${label} ${value}`);
        parentThis.log(`The user selected Row ${label} ${value}`)
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);
    chart.draw(data, this.graphOptions || options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Chart Pie: ' + message);
  }

}
