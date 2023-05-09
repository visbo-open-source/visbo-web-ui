import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';
import { VisboProjectVersion } from 'src/app/_models/visboprojectversion';
import { ResizedEvent } from 'angular-resize-event';

@Component({
  selector: 'app-portfolio-chart',
  templateUrl: './portfolio-chart.component.html',
  styleUrls: ['./portfolio-chart.component.css']
})
export class PortfolioChartComponent implements OnInit, AfterViewInit {

  public yScale: d3.ScaleBand<string> = d3.scaleBand();
  public xScale: d3.ScaleTime<number, number, never> = d3.scaleTime();
  public margin = {top: 10, right: 10, bottom: 30, left: 10};
  public height: number = 500;
  public width: number = 1000;
  public useTemplate = false;

  public someDate: Date = new Date();

  constructor() { }

  @Input()
  projectVersions: VisboProjectVersion[]; // VPVs

  @ViewChild('chart')
  private chartElement: ElementRef;

  @ViewChild('xAxis')
  private xAxisElement: ElementRef;

  ngOnInit(): void {}

  ngOnChanges(): void {
    console.log("change");
    this.drawChart();
  }

  ngAfterViewInit(): void {
    console.log("after view init");
    this.drawChart();
  }

  drawChart() {
    const elem = this.chartElement.nativeElement;
    this.width = elem.offsetWidth;

    const minDate = d3.min(this.projectVersions, d => new Date(d.startDate));
    const maxDate = d3.max(this.projectVersions, d => new Date(d.endDate));

    this.xScale.domain([minDate, maxDate])
      .range([this.margin.left, this.width - this.margin.left - this.margin.right]);

    this.yScale.domain(this.projectVersions.map(d => d._id))
      .range([this.height - this.margin.top - this.margin.bottom, this.margin.top])
      .padding(0.3);

    if (!this.useTemplate) {
      const chartDiv = d3.select(elem);
      chartDiv.select("svg").remove();

      const svg = chartDiv.append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .style("border", '1px solid black');

      const projectVersions = svg.selectAll("g.project-version").data(this.projectVersions)
        .join("g")
        .classed("project-version", true)
        .attr("transform", d => `translate(${this.x(d.startDate)}, ${this.yScale(d._id)})`);

      projectVersions.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", "#cd7436")
        .attr("width", d => this.x(d.endDate) - this.x(d.startDate))
        .attr("height", this.yScale.bandwidth());
    
      projectVersions.append("text")
        .attr("x", 10)
        .attr("y", 7)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "hanging")
        .attr("fill", "white")
        .attr("font-size", "12")
        .text(d => d.name);

      svg.append("g")
        .attr("transform", `translate(0, ${this.height - this.margin.bottom})`)
        .call(d3.axisBottom(this.xScale));

      // svg.append("g")
      //   .attr("transform", `translate( ${this.margin.left}, 0)`)
      //   .call(d3.axisLeft(this.yScale));

    } else {
      d3.select(this.xAxisElement.nativeElement)
        .call(d3.axisBottom(this.xScale));
    }
    
  }

  x(date: Date): number {
    return this.xScale(new Date(date));
  }

  onResize(event: ResizedEvent) {
    console.log("resize");
    this.drawChart();
  }

}
