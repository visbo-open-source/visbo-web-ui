import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, EventEmitter, Output } from '@angular/core';
import * as d3 from 'd3';
import { VisboProjectVersion } from 'src/app/_models/visboprojectversion';
import { ResizedEvent } from 'angular-resize-event';



export interface TimelineProject {
  id: string;
  name: string;
  color: string;
  startDate: Date;
  endDate: Date;
  phases: Phase[];
  milestones: Milestone[];
}

export interface Phase {
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface Milestone {
  name: string;
  date: Date;
}

@Component({
  selector: 'app-portfolio-chart',
  templateUrl: './portfolio-chart.component.html',
  styleUrls: ['./portfolio-chart.component.css']
})
export class PortfolioChartComponent implements OnInit, AfterViewInit {

  public yScale: d3.ScaleBand<string> = d3.scaleBand();
  public xScale: d3.ScaleTime<number, number, never> = d3.scaleTime();
  public margin = { top: 10, right: 10, bottom: 30, left: 10 };
  public height: number = 500;
  public width: number = 1000;

  public someDate: Date = new Date();

  constructor() { }

  // @Input()
  // projectVersions: VisboProjectVersion[]; // VPVs

  @Input()
  projects: TimelineProject[];

  @Input()
  minDate: Date;

  @Input()
  maxDate: Date;

  // @Input()
  // parentThis: any;

  @Output()
  projectSelected = new EventEmitter<string>();

  @ViewChild('chart')
  private chartElement: ElementRef;

  @ViewChild('xAxis')
  private xAxisElement: ElementRef;

  ngOnInit(): void { }

  ngOnChanges(): void {
    console.log("change");
    this.drawChart();
  }

  ngAfterViewInit(): void {
    console.log("after view init");
    this.drawChart();
  }

  drawChart() {
    const elem = this.chartElement?.nativeElement;
    this.width = elem?.offsetWidth;
    const projectHeight = 30;
    const innerHeight = this.projects.length * projectHeight;
    const outerHeight = innerHeight + this.margin.top + this.margin.bottom;
    // const parentThis = this.parentThis;

    // const minDate = d3.min(this.projects, d => new Date(d.startDate));
    // const maxDate = d3.max(this.projects, d => new Date(d.endDate));

    this.xScale.domain([this.minDate, this.maxDate])
      .range([this.margin.left, this.width - this.margin.left - this.margin.right]);

    this.yScale.domain(this.projects.map(d => d.id))
      .range([this.margin.top + innerHeight, this.margin.top])
      .padding(0);

    const chartDiv = d3.select(elem);
    chartDiv.select("svg").remove();

    const svg = chartDiv.append("svg")
      .attr("width", this.width)
      .attr("height", outerHeight)
      .style("border", '1px solid black');

    const projects = svg.selectAll("g.project").data(this.projects)
      .join("g")
      .classed("project", true)
      .attr("transform", d => `translate(${this.x(d.startDate)}, ${this.yScale(d.id)})`)
      .on("mouseover", (event, d) => console.log(d))
      // .on("click", (event, d) => parentThis.timelineSelectVPName(d.name));
      .on('click', (event, d) => this.projectSelected.emit(d.name));


    // add rectangles for project spans
    projects.append("rect")
      .attr("x", 0)
      .attr("y", this.yScale.bandwidth() * 0.1)
      .attr("fill", d => d.color)
      .attr("opacity", "2.5")   // has to be between 0 - 1
      .attr("width", d => this.x(d.endDate) - this.x(d.startDate))
      .attr("height", this.yScale.bandwidth() * 0.8);

    const self = this;
    projects.each(function (project) {
      const phases = d3.select(this)
        .selectAll("g.phase").data((project: TimelineProject) => project.phases)
        .join("g")
        .classed("phase", true)
        .attr("transform", d => `translate(${self.x(d.startDate) - self.x(project.startDate)}, 0)`);

      phases.append("rect")
        .attr("x", 0)
        .attr("y", self.yScale.bandwidth() * 0.25)
        .attr("fill", "#34ab1c")
        .attr("width", d => self.x(d.endDate) - self.x(d.startDate))
        .attr("height", self.yScale.bandwidth() * 0.5);
    })

    projects.each(function (project) {
      const milestones = d3.select(this)
        .selectAll("g.milestone").data((project: TimelineProject) => project.milestones)
        .join("g")
        .classed("milestone", true)
        .attr("transform", d => `translate(${self.x(d.date) - self.x(project.startDate)}, 0)`);

      milestones.append("path")
        .attr("d", d3.symbol().type(d3.symbolTriangle)())
        .attr("x", 0)
        .attr("transform", `translate(0, 5) rotate(180)`)
        // .attr("transform", `translate(0, ${self.yScale.bandwidth() * 0.5})`)
        .attr("fill", "#000000");
    })

    projects.append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "hanging")
      .attr("fill", "black")
      .attr("font-size", "12")
      .text(d => d.name);

    // add rectangles for phase spans
    // const phases = projects.selectAll("g.phase").data(project => project.phases)
    //   .join("g")
    //   .classed("phase", true)
    //   .attr("transform", d => `translate(${this.x(d.startDate)}, 0)`);

    // phases.append("rect")
    //   .attr("x", 0)
    //   .attr("y", 0)
    //   .attr("fill", "#34ab1c")
    //   .attr("width", d => this.x(d.endDate) - this.x(d.startDate))
    //   .attr("height", this.yScale.bandwidth());



    svg.append("g")
      .attr("transform", `translate(0, ${this.margin.top + innerHeight})`)
      .call(d3.axisBottom(this.xScale));

    // svg.append("g")
    //   .attr("transform", `translate( ${this.margin.left}, 0)`)
    //   .call(d3.axisLeft(this.yScale));

  }

  x(date: Date): number {
    return this.xScale(new Date(date));
  }

  onResize(event: ResizedEvent) {
    console.log("resize");
    this.drawChart();
  }

}
