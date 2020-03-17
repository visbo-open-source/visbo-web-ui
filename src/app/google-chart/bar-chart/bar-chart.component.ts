import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;
  @Input() graphOptions: any;
  @Input() parentThis: any;
  @Input() language: string;

  constructor(
    private gChartService: GoogleChartService,
    private messageService: MessageService
  ) {
    if (!this.language) { this.language = 'de'; }
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages': ['corechart', 'table'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    // this.log(`Google Chart Bar Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart() {
    // this.log(`Google Chart Bar Chart Draw ${this.graphData.length}`);
    let chart: any, data: any;
    chart = new this.gLib.visualization.BarChart(document.getElementById('divBarChart'));
    data = new this.gLib.visualization.arrayToDataTable(this.graphData);

    const options = {'title': 'Bar Chart'};

    chart.draw(data, this.graphOptions || options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Bar Chart: ' + message);
  }
}
