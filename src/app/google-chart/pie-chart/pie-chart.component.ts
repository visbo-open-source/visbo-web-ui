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

  constructor(
    private gChartService : GoogleChartService,
    private messageService: MessageService,
  ) {
    this.gLib = this.gChartService.getGoogle();
    this.gLib.charts.load('current', {'packages':['corechart','table']});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  ngOnInit() {
    this.log(`Google Chart Pie Chart Init ${JSON.stringify(this.graphData)}`);
  }

  private drawChart(){
    this.log(`Google Chart Pie Chart Draw ${this.graphData.length}`);
    let chart = new this.gLib.visualization.PieChart(document.getElementById('divPieChart'));
    let data = new this.gLib.visualization.DataTable();
    for (var i = 0; i < this.graphLegend.length; i++) {
      data.addColumn(this.graphLegend[i][0], this.graphLegend[i][1]);
    }
    // data.addColumn('string', 'Accessories');
    // data.addColumn('number', 'Quantity');
    data.addRows(this.graphData);

    let options = {'title':'Audit Activity by Action'};

    chart.draw(data, options);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('Pie Chart: ' + message);
  }

}
