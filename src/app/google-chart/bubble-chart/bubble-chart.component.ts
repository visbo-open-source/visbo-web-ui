import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

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

  constructor(
    private gChartService : GoogleChartService,
    private messageService: MessageService
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

    let options = {'title':'Bubble Chart'};

    chart.draw(data, this.graphOptions || options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Bubble Chart: ' + message);
  }
}
