import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboSetting } from '../_models/visbosetting';
import { VPFParams } from '../_models/visboportfolioversion';
import { VisboProject, VPParams } from '../_models/visboproject';

import { scale } from 'chroma-js';

import { visboCmpString, visboCmpDate, convertDate, visboIsToday, getPreView, excelColorToRGBHex } from '../_helpers/visbo.helper';

class startAndEndDate {
  start: Date;
  end: Date;
}

@Component({
  selector: 'app-comp-viewboard',
  templateUrl: './comp-viewboard.component.html'
})
export class VisboCompViewBoardComponent implements OnInit, OnChanges {

  @Input() listVP: VisboProject[];
  @Input() listVPV: VisboProjectVersion[];
  @Input() customize: VisboSetting;
  @Input() vpf: VisboProject;

  mapVPID: number[];
  refDate: Date;
  filter: string;
  activeID: string; // either VP ID of Portfolio or VC ID
  timeoutID: number;

  parentThis = this;

  graphDataTimeline = [];
  graphOptionsTimeline = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      height: 500,
      colors:[],
      timeline: {
        showBarLabels: true
      },
      tooltip: {
        isHtml: true
      },
      animation: {startup: true, duration: 200}
    };
  currentLang: string;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.log(`ProjectBoard Init  ${this.refDate.toISOString()} `);
    this.initSetting();
    this.visboViewBoardOverTime();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.log(`ProjectBoard Changes  ${this.refDate?.toISOString()}, Changes ${JSON.stringify(changes)}`);
    this.initSetting();
    this.visboViewBoardOverTime();
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.visboViewBoardOverTime();
      this.timeoutID = undefined;
    }, 500);
  }

  initSetting(): void {
    this.activeID = this.route.snapshot.paramMap.get('id');
    const refDate = this.route.snapshot.queryParams['refDate'];
    const filter = this.route.snapshot.queryParams['filter'] || undefined;

    this.refDate = refDate ? new Date(refDate) : new Date();
    this.filter = filter;

    this.mapVPID = [];
    this.listVP?.forEach((vp, index) => this.mapVPID[vp._id] = index);
  }

  filterKeyBoardEvent(event: KeyboardEvent): void {
    if (!event) { this.log('No Keyboard Event'); }
    // const keyCode = event ? event.keyCode : 0;
    // if (keyCode == 13) {    // only return key
      // add parameter to URL
      this.updateUrlParam('filter', this.filter)
    // }
    this.visboViewBoardOverTime();
  }

  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPFParams();
    if (type == 'filter') {
      queryParams.filter = value;
      localStorage.setItem('vpfFilter', value || '');
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  updateVPV(): void {
      this.listVPV?.forEach(vpv => {
        const bu = this.getCustomPropertyString(vpv.vpid, 'businessUnit')
        if (bu) {
          vpv.businessUnit = bu;
        }
      });
  }

  visboViewBoardOverTime(): void {
    const defaultColor = '#59a19e';
    const headLineColor = '#808080';
    const graphDataTimeline = [];

    if (!this.listVPV || this.listVPV.length === 0 || !this.customize ) {
      this.graphDataTimeline = [];
      return;
    }
    var buDefs = [];
    for ( let j = 0; this.customize && this.customize.value && this.customize.value.businessUnitDefinitions && j < this.customize.value.businessUnitDefinitions.length; j++) {
      buDefs[this.customize.value.businessUnitDefinitions[j].name] = this.customize.value.businessUnitDefinitions[j].color;
    }

    this.updateVPV();
    this.listVPV.sort(function(a, b) {
      let result = visboCmpString((b.businessUnit || '').toLowerCase(), (a.businessUnit || '').toLowerCase());
      if (result == 0) {
        result = visboCmpDate(b.startDate, a.startDate);
      }
      if (result == 0) {
        result = visboCmpString(b.name.toLowerCase(), a.name.toLowerCase());
      }
      return result;
    });

    var minAndMaxDate = this.getMinAndMaxDate(this.listVPV);

    const filter = this.filter ? this.filter.toLowerCase() : undefined;
    // variables to count the number of sameBu's
    var bu = '';
    var lastbu = '';
    var sameBuCount = 0;
    var rgbHex = defaultColor;
    var colorArray = [];

    for (let i = 0; i < this.listVPV.length; i++) {
      if (filter
        && !(this.listVPV[i].name.toLowerCase().indexOf(filter) >= 0
          || this.getCustomPropertyString(this.listVPV[i].vpid, 'businessUnit').toLowerCase().indexOf(filter) >= 0
          || this.listVPV[i].leadPerson?.toLowerCase().indexOf(filter) >= 0
          || this.listVPV[i].VorlagenName?.toLowerCase().indexOf(filter) >= 0
          || this.listVPV[i].status?.toLowerCase().indexOf(filter) >= 0
        )
      ) {
        // ignore projects not matching filter
        continue;
      }
      const startDate = this.listVPV[i].startDate;
      const endDate = this.listVPV[i].endDate;

      if (startDate && endDate && startDate <= endDate) {
        // we have a start & end date for the project, add it to the Timeline

        graphDataTimeline.push([
          (this.listVPV.length - i).toString(),
          this.combineName(this.listVPV[i].name, this.listVPV[i].variantName),
          this.createCustomHTMLContent(this.listVPV[i]),
          new Date(this.listVPV[i].startDate),
          new Date(this.listVPV[i].endDate)
        ]);

        var buColor = 0;
        var businessUnit = this.getCustomPropertyString(this.listVPV[i].vpid, 'businessUnit');
        bu = businessUnit || undefined;
        if (i == 0) { lastbu = bu };
        if (bu) {
          if (lastbu != bu){
            let scaleArray = scale([rgbHex, 'white']).colors(sameBuCount + 3);
            scaleArray.splice(scaleArray.length-3, 3);
            scaleArray.reverse();
            colorArray = colorArray.concat(scaleArray);
            sameBuCount = 0;
            lastbu = bu;
          }
          sameBuCount += 1;
          buColor = buDefs[businessUnit] ? buDefs[businessUnit]: undefined;
          rgbHex = buColor ? excelColorToRGBHex(buColor): defaultColor;
        }
      }
    }
    let scaleArray = scale([rgbHex, 'white']).colors(sameBuCount + 3);
    scaleArray.splice(scaleArray.length-3, 3);
    scaleArray.reverse();
    colorArray = colorArray.concat(scaleArray);


    this.graphOptionsTimeline.colors = colorArray;

    //last data - projectline to keep the x-axis fix, start and end is the min and max of the portfolio
    if (minAndMaxDate && minAndMaxDate.start && minAndMaxDate.end && minAndMaxDate.start <= minAndMaxDate.end) {
      const lastlineID = 0;
      // color for the Portfolio-TimeLine
      this.graphOptionsTimeline.colors.push(headLineColor);

      graphDataTimeline.push([
        (lastlineID).toString(),
        this.combineName(this.vpf.name, ''),
        '',
        new Date(minAndMaxDate.start),
        new Date(minAndMaxDate.end)
      ]);
    }

    this.graphOptionsTimeline.height = 50 + graphDataTimeline.length * 41;

    const project = this.translate.instant('compViewBoard.lbl.project');
    const start = this.translate.instant('compViewBoard.lbl.startDate');
    const end = this.translate.instant('compViewBoard.lbl.endDate');

    // header of the projectboard
    graphDataTimeline.push([
      'ID',
      project,
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      start,
      end
    ]);

    graphDataTimeline.reverse();
    // this.log(`view Timeline VP Timeline ${JSON.stringify(graphDataTimeline)}`);

    // the order of the colors has to be changed, because the order of the projects was changed
    this.graphOptionsTimeline.colors.reverse();
    this.graphDataTimeline = graphDataTimeline;
  }

  createCustomHTMLContent(vpv: VisboProjectVersion): string {
    const startDate = convertDate(new Date(vpv.startDate), 'fullDate', this.currentLang);
    const endDate = convertDate(new Date(vpv.endDate), 'fullDate', this.currentLang);

    let result = '<div style="padding:5px 5px 5px 5px;">' +
      '<div><b>' + this.combineName(vpv.name, vpv.variantName) + '</b></div>' + '<div>' +
      '<table>';

    const bu = this.translate.instant('compViewBoard.lbl.bu');
    const lead = this.translate.instant('compViewBoard.lbl.lead');
    const template = this.translate.instant('compViewBoard.lbl.template');
    const start = this.translate.instant('compViewBoard.lbl.startDate');
    const end = this.translate.instant('compViewBoard.lbl.endDate');

    const businessUnit = this.getCustomPropertyString(vpv.vpid, 'businessUnit') || vpv.businessUnit;
    if (businessUnit) {
      result = result + '<tr>' + '<td>' + bu + ':</td>' + '<td><b>' + businessUnit + '</b></td>' + '</tr>';
    }
    if (vpv.leadPerson) {
      result = result + '<tr>' + '<td>' + lead + ':</td>' + '<td><b>' + vpv.leadPerson + '</b></td>' + '</tr>';
    }
    if (vpv.VorlagenName) {
      result = result + '<tr>' + '<td>' + template + ':</td>' + '<td><b>' + vpv.VorlagenName + '</b></td>' + '</tr>';
    }
    result = result + '<tr>' + '<td>' + start + ':</td>' + '<td><b>' + startDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + end + ':</td>' + '<td><b>' + endDate + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  getCustomPropertyString(vpid: string, name: string): string {
      let result = '';
      const index = this.mapVPID[vpid];
      if (index >= 0 && index < this.listVP.length) {
        const vp = this.listVP[index];
        const property = vp.customFieldString?.find(item => item.name == name);
        if (property) {
          result = property.value;
        }
      }
      return result;
  }

  timelineSelectRow(row: number): void {
    this.log(`timeline Select Row ${row} ${JSON.stringify(this.graphDataTimeline[row + 1])} `);
    const vpName = this.graphDataTimeline[row + 1][1];
    // vpName can contain variantName split it and check if it fits
    const vp = this.findProject(vpName);

    if (vp) {
      this.log(`Navigate to: ${vp.vpid} ${vp.name} ${vp.variantName}`);
      const queryParams = new VPParams();
      queryParams.variantName = vp.variantName || null;
      if (this.refDate && !visboIsToday(this.refDate)) {
        queryParams.refDate = this.refDate.toISOString();
      }
      this.router.navigate(['vpKeyMetrics/'.concat(vp.vpid)], { queryParams: queryParams });
    } else {
      this.log(`VP not found: ${vpName}`);
    }
  }

  combineName(vpName: string, variantName: string): string {
    let result = vpName || '';
    if (variantName) {
      result = result.concat(' ( ', variantName, ' ) ')
    }
    return result;
  }

  findProject(name: string): VisboProjectVersion {
    // name could not contain a variantPart if it does not end with " ) ", and this is not an allowed vp name
    let result = this.listVPV.find(x => x.name === name);
    if (!result && name.lastIndexOf(" ) ") === name.length - 3) {
      // variant Part at the end
      const index = name.lastIndexOf(" ( ");
      const vpName = name.substring(0, index);
      const variantName = name.substring(index + 3, name.length - 3);
      result = this.listVPV.find(x => x.name === vpName && x.variantName === variantName)
    }
    return result;
  }

  getPreView(): boolean {
    return getPreView();
  }

  getMinAndMaxDate(vpslist: VisboProjectVersion[]): startAndEndDate {

    let minMaxDate = new startAndEndDate();
    let newStartDate = new Date(8640000000000000);
    let newEndDate =  new Date(-8640000000000000);

    if (!vpslist && vpslist.length < 1) {
      return undefined;
    }
    vpslist.forEach( item => {
      var startDate = new Date(item.startDate);
      let endDate = new Date(item.endDate);
      if (visboCmpDate(startDate, new Date(newStartDate))== -1) {
        newStartDate = new Date(startDate);
      }
      if (visboCmpDate( endDate, new Date(newEndDate),) == 1) {
        newEndDate = new Date (endDate);
      }
    })
    minMaxDate.start = newStartDate;
    minMaxDate.end = newEndDate;
    return minMaxDate;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewBoard: ' + message);
  }

}
