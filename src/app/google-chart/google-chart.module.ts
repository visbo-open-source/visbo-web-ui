import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineChartComponent } from './line-chart/line-chart.component';
import { ComboChartComponent } from './combo-chart/combo-chart.component';
import { BubbleChartComponent } from './bubble-chart/bubble-chart.component';
import { ScatterChartComponent } from './scatter-chart/scatter-chart.component';
import { ServiceModule } from './service/service.module';
import { PieChartComponent } from './pie-chart/pie-chart.component';
import { GanttChartComponent } from './gantt-chart/gantt-chart.component';
import { ColumnChartComponent } from './column-chart/column-chart.component';
import { BarChartComponent } from './bar-chart/bar-chart.component';

@NgModule({
  declarations: [
    LineChartComponent,
    ComboChartComponent,
    BubbleChartComponent,
    ScatterChartComponent,
    PieChartComponent,
    GanttChartComponent,
    ColumnChartComponent,
    BarChartComponent
  ],
  imports: [
    CommonModule,
    ServiceModule
  ],
  exports: [
    LineChartComponent,
    ComboChartComponent,
    BubbleChartComponent,
    ScatterChartComponent,
    PieChartComponent,
    GanttChartComponent,
    ColumnChartComponent,
    BarChartComponent
  ],
  providers : []
})
export class GoogleChartModule { }
