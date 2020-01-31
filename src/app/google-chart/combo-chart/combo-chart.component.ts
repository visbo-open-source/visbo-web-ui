import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-combo-chart',
  templateUrl: './combo-chart.component.html',
  styleUrls: ['./combo-chart.component.css']
})
export class ComboChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;

  constructor(
    private gChartService : GoogleChartService,
    private messageService: MessageService
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages':['corechart','table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Combo Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart(){
    // this.log(`Google Chart Combo Chart Draw ${this.graphData.length}`);
    let chart = new this.gLib.visualization.ComboChart(document.getElementById('divComboChart'));
    let data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    let parentThis = this.parentThis;

    let options = {'title':'Combo Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      var list = chart.getSelection();
      if (!list || list.length == 0 ) {
         console.log(`Chart Combo: chartGetSelection is undefined`, list || list.length)
      } else {
        var selectedItem = list[0];
        parentThis.log(`Chart Combo: The user selected ${JSON.stringify(selectedItem)}`)
        if (parentThis == undefined) console.log(`Chart Combo: The user clicked and this is undefined`)
        else if (selectedItem) {
          var row = selectedItem.row;
          var col = selectedItem.column;
          if (row != null && row >= 0) {
            var label = data.getValue(row, 0);
            parentThis.chartSelectRow(row, col, label);
          }
        }
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);

    chart.draw(data, this.graphOptions || options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Combo Chart: ' + message);
  }
}
