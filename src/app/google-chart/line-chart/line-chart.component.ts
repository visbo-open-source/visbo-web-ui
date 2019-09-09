import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css']
})
export class LineChartComponent implements OnInit {

  private gLib: any;
  @Input() graphData: any;

  constructor(
    private gChartService : GoogleChartService,
    private messageService: MessageService
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages':['corechart','table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    this.log(`Google Chart Line Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart(){
    // let data = this.gLib.visualization.arrayToDataTable([
    //   ['Year', 'Sales', 'Expenses'],
    //   ['2004',  1000,      400],
    //   ['2005',  1170,      460],
    //   ['2006',  660,       1120],
    //   ['2007',  1030,      540]
    // ]);
    // let options = {'title':'Sales & Expenses',
    //                 'width': '100%',
    //                 'height': '100%'};
    //
    // let chart = new this.gLib.visualization.LineChart(document.getElementById('divLineChart'));
    //
    // chart.draw(data, options);

    this.log(`Google Chart Pie Chart Draw ${this.graphData.length}`);
    let chart = new this.gLib.visualization.LineChart(document.getElementById('divLineChart'));
    let data = new this.gLib.visualization.arrayToDataTable(this.graphData);

    let options = {'title':'Audit Activity by Time'};

    chart.draw(data, options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Line Chart: ' + message);
  }
}
