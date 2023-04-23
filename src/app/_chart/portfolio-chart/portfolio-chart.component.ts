import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';
import { VisboProjectVersion } from 'src/app/_models/visboprojectversion';

@Component({
  selector: 'app-portfolio-chart',
  templateUrl: './portfolio-chart.component.html',
  styleUrls: ['./portfolio-chart.component.css']
})
export class PortfolioChartComponent implements OnInit, AfterViewInit {

  constructor() { }

  @Input()
  projectVersions: VisboProjectVersion[]; // VPVs

  @ViewChild('chart')
  private chartElement: ElementRef;

  ngOnInit(): void {
    console.log(this.projectVersions);
  }

  ngAfterViewInit(): void {
    console.log(this.chartElement.nativeElement);

    const minDate = d3.min(this.projectVersions, d => new Date(d.startDate));
    const maxDate = d3.max(this.projectVersions, d => new Date(d.endDate));

    console.log([minDate, maxDate]);

    const xScale = d3.scaleTime()
      .domain([minDate, maxDate])
      .range([0, 500]);

    const yScale = d3.scaleBand()
      .domain(this.projectVersions.map(d => d._id))
      .range([0, 500]);

    d3.select(this.chartElement.nativeElement)
      .selectAll(".project")
      .data(this.projectVersions)
      .join("li")
      .classed("project", true)
      .text(d => d.name);
  }

}
