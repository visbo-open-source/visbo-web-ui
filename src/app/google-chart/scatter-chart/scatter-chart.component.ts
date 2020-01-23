import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-scatter-chart',
  templateUrl: './scatter-chart.component.html',
  styleUrls: ['./scatter-chart.component.css']
})
export class ScatterChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;
  @Input() graphOptions: any;

  constructor(
    private gChartService : GoogleChartService,
    private messageService: MessageService
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages':['corechart','table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Scatter Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart(){
    // this.log(`Google Chart Scatter Chart Draw ${this.graphData.length}`);
    let chart = new this.gLib.visualization.ScatterChart(document.getElementById('divScatterChart'));
    let data = new this.gLib.visualization.arrayToDataTable(this.graphData);

    let options = {'title':'Scatter Chart'};

    chart.draw(data, this.graphOptions || options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Scatter Chart: ' + message);
  }
}
