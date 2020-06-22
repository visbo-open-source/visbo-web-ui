import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboSetting, VisboSettingListResponse, VisboOrganisation , VisboRole} from '../_models/visbosetting';
import { VisboProject } from '../_models/visboproject';
import { VisboCenter } from '../_models/visbocenter';

import * as moment from 'moment';
import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-comp-viewboard',
  templateUrl: './comp-viewboard.component.html'
})
export class VisboCompViewBoardComponent implements OnInit, OnChanges {

  @Input() refDate: Date;
  @Input() vps: any[];

  currentRefDate: Date;
  vpFilter: string;

  parentThis: any;

  graphDataTimeline: any[] = [];
  graphOptionsTimeline: any = undefined;
  currentLang: string;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.parentThis = this;
    if (!this.refDate) { this.refDate = new Date(); }
    this.currentRefDate = this.refDate;
    this.log(`ProjectBoard Init  ${this.refDate.toISOString()} ${this.refDate !== this.currentRefDate} `);

    this.visboViewBoardOverTime();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.log(`ProjectBoard Changes  ${this.refDate?.toISOString()} ${this.refDate?.getTime() !== this.currentRefDate?.getTime()} `);
    // if (this.currentRefDate !== undefined && this.refDate.getTime() !== this.currentRefDate.getTime()) {
      this.visboViewBoardOverTime();
    // }
  }

  visboViewBoardOverTime(): void {
    this.graphOptionsTimeline = {
        // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
        width: '100%',
        height: 500,
        timeline: {
          showBarLabels: true
        },
        tooltip: {
          isHtml: true
        },
        animation: {startup: true, duration: 200}
        // explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01}
        // curveType: 'function',
        // colors: this.colors,
        // hAxis: {
        //   format: 'MMM YY',
        //   gridlines: {
        //     color: '#FFF',
        //     count: -1
        //   }
        // }
      };
    this.currentRefDate = this.refDate;
    const graphDataTimeline: any = [];
    if (!this.vps || this.vps.length === 0) {
      this.graphDataTimeline = [];
      return;
    }

    this.vps.sort(function(a, b) { return visboCmpString(b.name.toLowerCase(), a.name.toLowerCase()); });

    for (let i = 0; i < this.vps.length; i++) {
      if (this.vpFilter
        && !(this.vps[i].name.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
          || this.vps[i].businessUnit?.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
          || this.vps[i].leadPerson?.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
          || this.vps[i].VorlagenName?.toLowerCase().indexOf(this.vpFilter.toLowerCase()) >= 0
        )
      ) {
        // ignore projects not matching filter
        continue;
      }
      const startDate = this.vps[i].startDate;
      const endDate = this.vps[i].endDate;
      if (startDate && endDate && startDate <= endDate) {
        // we have a start & end date for the project, add it to the Timeline
        let name = this.vps[i].name;
        if (this.vps[i].variantName) {
          name = name.concat(' ( ', this.vps[i].variantName, ' )');
        }
        graphDataTimeline.push([
          (this.vps.length - i).toString(),
          name,
          this.createCustomHTMLContent(this.vps[i]),
          new Date(this.vps[i].startDate),
          new Date(this.vps[i].endDate)
        ]);
      } else {

      }
    }
    this.graphOptionsTimeline.height = 50 + graphDataTimeline.length * 41;

    const project = this.translate.instant('compViewBoard.lbl.project');
    const start = this.translate.instant('compViewBoard.lbl.startDate');
    const end = this.translate.instant('compViewBoard.lbl.endDate');

    graphDataTimeline.push([
      'ID',
      project,
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      start,
      end
    ]);
    graphDataTimeline.reverse();
    // this.log(`view Timeline VP Timeline ${JSON.stringify(graphDataTimeline)}`);

    this.graphDataTimeline = graphDataTimeline;
  }

  createCustomHTMLContent(vp: any): string {
    const startDate = moment(vp.startDate).format('DD.MM.YY');
    const endDate = moment(vp.endDate).format('DD.MM.YY');
    let name = vp.name;
    if (vp.variantName) {
      name = name.concat('(' + vp.variantName + ')');
    }
    let result = '<div style="padding:5px 5px 5px 5px;">' +
      '<div><b>' + vp.name + '</b></div>' + '<div>' +
      '<table>';

    const bu = this.translate.instant('compViewBoard.lbl.bu');
    const lead = this.translate.instant('compViewBoard.lbl.lead');
    const template = this.translate.instant('compViewBoard.lbl.template');
    const start = this.translate.instant('compViewBoard.lbl.startDate');
    const end = this.translate.instant('compViewBoard.lbl.endDate');

    if (vp.businessUnit) {
      result = result + '<tr>' + '<td>' + bu + ':</td>' + '<td><b>' + vp.businessUnit + '</b></td>' + '</tr>';
    }
    if (vp.leadPerson) {
      result = result + '<tr>' + '<td>' + lead + ':</td>' + '<td><b>' + vp.leadPerson + '</b></td>' + '</tr>';
    }
    if (vp.VorlagenName) {
      result = result + '<tr>' + '<td>' + template + ':</td>' + '<td><b>' + vp.VorlagenName + '</b></td>' + '</tr>';
    }
    result = result + '<tr>' + '<td>' + start + ':</td>' + '<td><b>' + startDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + end + ':</td>' + '<td><b>' + endDate + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${JSON.stringify(this.graphDataTimeline[row + 1])} ${value} `);
    const vpName = this.graphDataTimeline[row + 1][1];
    const vp = this.vps.find(x => x.name === vpName);

    this.log(`Navigate to: ${vp.vpid} ${vp.name}`);
    let queryParams: any;
    queryParams = {};
    this.router.navigate(['vpKeyMetrics/'.concat(vp.vpid)], { queryParams: queryParams });
  }

  getvps(): string {
    return JSON.stringify(this.vps);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboViewBoard: ' + message);
  }

}
