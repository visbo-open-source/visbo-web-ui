import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { GoogleChartService } from '../service/google-chart.service';

@Component({
  selector: 'app-combo-chart',
  templateUrl: './combo-chart.component.html',
  styleUrls: ['./combo-chart.component.css']
})
export class ComboChartComponent implements OnInit, OnChanges {

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
    this.gLib.charts.load('current', {'packages': ['corechart', 'table'], 'language': this.language});
    this.gLib.charts.setOnLoadCallback(this.drawChart.bind(this));
    // this.log(`Google Chart Combo Chart Init ${JSON.stringify(this.graphData)}`);
  }

  ngOnChanges(): void {
    // console.log(`Combo Chart On Changes`);
    if (this.initialised) {
      this.drawChart();
    }
  }

  private drawChart() {
    // this.log(`Google Chart Combo Chart Draw ${this.graphData.length}`);
    const chart = new this.gLib.visualization.ComboChart(document.getElementById('divComboChart'));
    const data = new this.gLib.visualization.arrayToDataTable(this.graphData);
    const parentThis = this.parentThis;

    const options = {'title': 'Combo Chart'};

    // The select handler. Call the chart's getSelection() method
    function selectHandler() {
      const list = chart.getSelection();
      if (!list || list.length === 0 ) {
         // console.log(`Chart Combo: chartGetSelection is undefined`, list || list.length);
      } else {
        const selectedItem = list[0];
        // console.log(`Chart Combo: The user selected ${JSON.stringify(selectedItem)}`);
        if (parentThis === undefined) {
          // console.log(`Chart Combo: The user clicked and this is undefined`);
        } else if (selectedItem) {
          const row = selectedItem.row;
          const col = selectedItem.column;
          if (row != null && row >= 0) {
            const label = data.getValue(row, 0);
            parentThis.chartSelectRow(row, col, label);
          }
        }
      }
    }

    // Listen for the 'select' event, and call my function selectHandler() when
    // the user selects something on the chart.
    this.gLib.visualization.events.addListener(chart, 'select', selectHandler);

    chart.draw(data, this.graphOptions || options);
    // next line to show the tooltip definition in dev-tools by click
    // chart.draw(data, {tooltip: {trigger: 'selection', isHtml: true}});
    this.initialised = true;
  }
}
