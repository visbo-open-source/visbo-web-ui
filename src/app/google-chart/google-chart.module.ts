import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineChartComponent } from './line-chart/line-chart.component';
import { ComboChartComponent } from './combo-chart/combo-chart.component';
import { BubbleChartComponent } from './bubble-chart/bubble-chart.component';
import { ScatterChartComponent } from './scatter-chart/scatter-chart.component';
import { ServiceModule } from './service/service.module';
import { PieChartComponent } from './pie-chart/pie-chart.component';
import { TableChartComponent } from './table-chart/table-chart.component';
import { ColumnChartComponent } from './column-chart/column-chart.component';

@NgModule({
  declarations: [LineChartComponent, ComboChartComponent, BubbleChartComponent, ScatterChartComponent, PieChartComponent, TableChartComponent, ColumnChartComponent],
  imports: [
    CommonModule,
    ServiceModule
  ],
  exports: [LineChartComponent, ComboChartComponent, BubbleChartComponent, ScatterChartComponent, PieChartComponent, TableChartComponent, ColumnChartComponent],
  providers : []
})
export class GoogleChartModule { }
