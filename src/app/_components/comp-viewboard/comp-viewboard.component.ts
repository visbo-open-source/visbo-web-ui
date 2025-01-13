import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VPVPhase, VisboProjectVersion } from '../../_models/visboprojectversion';
import { VisboSetting } from '../../_models/visbosetting';
import { VPFParams } from '../../_models/visboportfolio';
import { VisboProject, VPParams, getCustomFieldDouble, getCustomFieldString, constSystemVPStatus } from '../../_models/visboproject';
import { VisboUser } from '../../_models/visbouser';

import { visboCmpString, visboCmpDate, convertDate, visboIsToday, getPreView, excelColorToRGBHex, brightenRGBColor, darkenRGBColor,hexToRgb } from '../../_helpers/visbo.helper';
import * as chroma from 'chroma-js';
import { Milestone, Phase, TimelineProject, TooltipItem } from 'src/app/_chart/portfolio-chart/portfolio-chart.component';

interface startAndEndDate {
  start: Date;
  end: Date;
}

class DropDownStatus {
  name: string;
  localName: string;
}

@Component({
  selector: 'app-comp-viewboard',
  templateUrl: './comp-viewboard.component.html',
  styleUrls: ['./comp-viewboard.component.css']
})
export class VisboCompViewBoardComponent implements OnInit, OnChanges {

  @Input() listVPV: VisboProjectVersion[];
  @Input() customize: VisboSetting;
  @Input() vpf: VisboProject;
  @Input() vcUser: Map<string, VisboUser>;

  refDate: Date;
  filter: string;
  filterPH: string;
  dropDownPH: string[];
  filterMS: string;
  dropDownMS: string[];
  filterStrategicFit: number;
  filterRisk: number;
  filterBU: string;
  dropDownBU: string[];
  filterVPStatusIndex: number;
  dropDownVPStatus: DropDownStatus[];
  activeID: string; // either VP ID of Portfolio or VC ID
  timeoutID: ReturnType<typeof setTimeout>;

  parentThis = this;

  timelineProjects: TimelineProject[];
  timelineMinAndMaxDate: startAndEndDate;

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

  ngOnChanges(): void {
    this.log(`ProjectBoard Changes  ${this.refDate?.toISOString()}`);
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
    const filterPH = this.route.snapshot.queryParams['filterPH'] || undefined;    
    const filterMS = this.route.snapshot.queryParams['filterMS'] || undefined;
    const filterVPStatus = this.route.snapshot.queryParams['filterVPStatus'] || '';
    const filterVPStatusIndex = constSystemVPStatus.findIndex(item => item == filterVPStatus);
    const filterBU = this.route.snapshot.queryParams['filterBU'] || undefined;
    let filterParam = this.route.snapshot.queryParams['filterRisk'];
    const filterRisk = filterParam ? filterParam.valueOf() : undefined;
    filterParam = this.route.snapshot.queryParams['filterStrategicFit'];
    const filterStrategicFit = filterParam ? filterParam.valueOf() : undefined;

    this.refDate = refDate ? new Date(refDate) : new Date();
    this.filter = filter;
    this.filterPH = filterPH?.replace("%20", " ");
    this.filterMS = filterMS?.replace("%20", " ");;
    this.filterBU = filterBU?.replace("%20", " ");;
    this.filterRisk = filterRisk;
    this.filterStrategicFit = filterStrategicFit;
    this.filterVPStatusIndex = filterVPStatusIndex >= 0 ? filterVPStatusIndex + 1: undefined;
    this.initBUDropDown();
    this.initPHDropDown(this.listVPV);
    this.initMSDropDown(this.listVPV);
    this.initVPStateDropDown();
  }

  filterKeyBoardEvent(event: KeyboardEvent): void {
    if (!event) { this.log('No Keyboard Event'); }
    // const keyCode = event ? event.keyCode : 0;
    // if (keyCode == 13) {    // only return key
      // add parameter to URL
      this.updateUrlParam('filter', undefined)
    // }
    this.visboViewBoardOverTime();
  }
 
  filterEventPH(index: number): void {
    if (index <= 0 || index >= this.dropDownPH.length) {
      this.filterPH = undefined;
    } else {
      this.filterPH = this.dropDownPH[index];
    }
    this.updateUrlParam('filter', undefined);
    this.visboViewBoardOverTime();
  }

  filterEventMS(index: number): void {
    if (index <= 0 || index >= this.dropDownMS.length) {
      this.filterMS = undefined;
    } else {
      this.filterMS = this.dropDownMS[index];
    }
    this.updateUrlParam('filter', undefined);
    this.visboViewBoardOverTime();
  }

  filterEventBU(index: number): void {
    if (index <= 0 || index >= this.dropDownBU.length) {
      this.filterBU = undefined;
    } else {
      this.filterBU = this.dropDownBU[index];
    }
    this.updateUrlParam('filter', undefined);
    this.visboViewBoardOverTime();
  }

  filterEventVPStatus(index: number): void {
    if (index <= 0 || index >= this.dropDownVPStatus.length) {
      this.filterVPStatusIndex = 0;
    } else {
      this.filterVPStatusIndex = index;
    }
    this.updateUrlParam('filter', undefined);
    this.visboViewBoardOverTime();
  }

  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPFParams();
    if (type == 'filter') {
      queryParams.filter = this.filter;
      localStorage.setItem('vpfFilter', this.filter || '');
      queryParams.filterVPStatus = this.getVPStatus(false);
      localStorage.setItem('vpfFilterVPSStatus', this.getVPStatus(false) || '');
      queryParams.filterPH = this.filterPH;
      localStorage.setItem('vpfFilterPH', this.filterPH || '');
      queryParams.filterMS = this.filterMS;
      localStorage.setItem('vpfFilterMS', this.filterMS || '');
      queryParams.filterBU = this.filterBU;
      localStorage.setItem('vpfFilterBU', this.filterBU || '');
      queryParams.filterRisk = this.filterRisk > 0 ? this.filterRisk.toString() : undefined;
      localStorage.setItem('vpfFilterRisk', (this.filterRisk || 0).toString());
      queryParams.filterStrategicFit = this.filterStrategicFit > 0 ? this.filterStrategicFit.toString() : undefined;
      localStorage.setItem('vpfFilterStrategicFit', (this.filterStrategicFit || 0).toString());
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  visboViewBoardOverTime(): void {
    const defaultColor = '#59a19e';
    const headLineColor = '#808080';
    const graphDataTimeline = [];   
    this.timelineProjects = [];

    if (!this.listVPV || this.listVPV.length === 0 ) {
      this.graphDataTimeline = [];
      return;
    }
    const buDefs = [];

    for ( let j = 0; j < this.customize?.value?.businessUnitDefinitions?.length; j++) {
      buDefs[this.customize.value.businessUnitDefinitions[j].name] = this.customize.value.businessUnitDefinitions[j].color;
    }

    this.listVPV.sort(function(a, b) {
      const aBusinessUnit = getCustomFieldString(a.vp, '_businessUnit')?.value || "";
      const bBusinessUnit = getCustomFieldString(b.vp, '_businessUnit')?.value || "";
      let result = visboCmpString((bBusinessUnit || '').toLowerCase(), (aBusinessUnit || '').toLowerCase());
      if (result == 0) {
        result = visboCmpDate(b.startDate, a.startDate);
      }
      if (result == 0) {
        result = visboCmpString(b.name.toLowerCase(), a.name.toLowerCase());
      }
      return result;
    });

    
    const filter = this.filter ? this.filter.toLowerCase() : undefined;
    const filterPH = this.filterPH ? this.filterPH.toLowerCase() : undefined;
    const filterMS = this.filterMS ? this.filterMS.toLowerCase() : undefined;
    const minAndMaxDate = this.getMinAndMaxDate(this.listVPV);
    this.timelineMinAndMaxDate = minAndMaxDate;
    this.initFilter(this.listVPV);

    // variables to count the number of sameBu's
    let bu = '';
    let rgbHex = defaultColor;
    const colorArray = [];
    let newlistVPV: VisboProjectVersion[] = [];

    for (let i = 0; i < this.listVPV.length; i++) {
      if (this.listVPV[i].vp?.vpType != 0) {
        continue;
      }
      if (filter
        && !(this.listVPV[i].vp?.name.toLowerCase().indexOf(filter) >= 0
          || (this.listVPV[i].VorlagenName?.toLowerCase().indexOf(filter) >= 0)
          || (this.getVPManager(this.listVPV[i].vp) || '').toLowerCase().indexOf(filter) >= 0
          || (this.listVPV[i].description || '').toLowerCase().indexOf(filter) >= 0
          || (this.listVPV[i].AllPhases.find(x => x.originalName.toLowerCase().indexOf(filter) >= 0))
          || (this.listVPV[i].AllPhases.find(x => x.AllResults.find(ms => ms.originalName.toLowerCase().indexOf(filter) >= 0)))
        )
      ) {
        // ignore projects not matching filter
        continue;
      } else {
          newlistVPV.push(this.listVPV[i]);
      }

      if (filterPH 
        && !(this.listVPV[i].AllPhases.find(x => x.originalName.toLowerCase().indexOf(filterPH) >= 0))) {        
          continue;
        }
      
      if (filterMS
        && !(this.listVPV[i].AllPhases.find(x => x.AllResults.find(ms => ms.originalName.toLowerCase().indexOf(filterMS) >= 0)))){
          continue;
        }      

      if (this.filterBU) {
        const item = getCustomFieldString(this.listVPV[i].vp, '_businessUnit');
        if ((item?.value || '') !== this.filterBU) {
          continue;
        }
      }
      if (this.filterVPStatusIndex > 0) {
        const setting = this.listVPV[i].vp.vpStatus;
        if (setting !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
          continue;
        }
      }
      if (this.filterRisk >= 0) {
        const item = getCustomFieldDouble(this.listVPV[i].vp, '_risk');
        if ((item?.value || 0) < this.filterRisk) {
          continue;
        }
      }
      if (this.filterStrategicFit >= 0) {
        const item = getCustomFieldDouble(this.listVPV[i].vp, '_strategicFit');
        if ((item?.value || 0) < this.filterStrategicFit) {
          continue;
        }
      }
      const startDate = this.listVPV[i].startDate;
      const endDate = this.listVPV[i].endDate;

      if (startDate && endDate && startDate <= endDate) {     
        
        
        this.timelineProjects.push(this.makeTimelineProject(this.listVPV[i], filterPH, filterMS));
        // we have a start & end date for the project, add it to the Timeline

        graphDataTimeline.push([
          (this.listVPV.length - i).toString(),
          this.combineName(this.listVPV[i].name, this.listVPV[i].variantName),
          this.createCustomHTMLContent(this.listVPV[i]),
          new Date(this.listVPV[i].startDate),
          new Date(this.listVPV[i].endDate)
        ]);
        let buColor = 0;
        const item = getCustomFieldString(this.listVPV[i].vp, '_businessUnit');

        bu = item ? item.value : undefined;
        this.log(`BusinessUnit ${bu}`);

        if (bu) {
          buColor = buDefs[bu];
          rgbHex = buColor ? excelColorToRGBHex(buColor): defaultColor;
        } else {
          rgbHex = defaultColor;
        }
        this.log(`BusinessUnit - Color ${rgbHex}`);
        let newColor = undefined;

        if (!this.listVPV[i].vp.vpStatus) {
            newColor = brightenRGBColor(hexToRgb(rgbHex), 20, true);
            //newColor = chroma(rgbHex).brighten(3).hex();
            //newColor = chroma(rgbHex).luminance(0.1);
            colorArray.push(newColor)
        }
        switch (this.listVPV[i].vp.vpStatus) {
          case 'initialized':
            newColor = brightenRGBColor(hexToRgb(rgbHex), 60, true); 
            //newColor = chroma(rgbHex).brighten(3).hex();
            //newColor = chroma(rgbHex).luminance(0.1).hex();
            colorArray.push(newColor)
            break;
          case 'proposed':
            newColor = brightenRGBColor(hexToRgb(rgbHex),30, true); 
            //newColor = chroma(rgbHex).brighten(3).hex();
            //newColor = chroma(rgbHex).luminance(0.5).hex();
            colorArray.push(newColor)
            break;
          case 'ordered':            
            newColor = brightenRGBColor(hexToRgb(rgbHex), 0, true); 
            //newColor = chroma(rgbHex).brighten().hex();
            //newColor = chroma(rgbHex).luminance(0.5).hex();
            colorArray.push(newColor)
            break;
          case 'paused':          
            newColor = darkenRGBColor(hexToRgb(rgbHex), 20, true); 
            //newColor = chroma(rgbHex).darken(1).hex();
            //newColor = chroma(rgbHex).luminance(0.6).hex();
            colorArray.push(newColor)
            break;
          case 'finished': 
            newColor = darkenRGBColor(hexToRgb(rgbHex), 40, true); 
            //newColor = chroma(rgbHex).darken(1).hex();
            //newColor = chroma(rgbHex).luminance(0.8).hex();
            colorArray.push(newColor)
            break;
          case 'stopped':
            newColor = darkenRGBColor(hexToRgb(rgbHex), 60, true); 
            //newColor = chroma(rgbHex).darken(1).hex();
            //newColor = chroma(rgbHex).luminance(0.99).hex();
            colorArray.push(newColor)
            break;
        }
      }      
    }    

    this.initPHDropDown(newlistVPV);
    this.initMSDropDown(newlistVPV);
    
    //colorArray = colorArray.concat(nobuArray);

    this.graphOptionsTimeline.colors = colorArray;

    //last data - projectline to keep the x-axis fix, start and end is the min and max of the portfolio
    if (this.vpf && minAndMaxDate.start && minAndMaxDate.end && minAndMaxDate.start <= minAndMaxDate.end) {
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

    } else if ( minAndMaxDate.start && minAndMaxDate.end && minAndMaxDate.start <= minAndMaxDate.end) {
      const lastlineID = 0;
      // color for the Portfolio-TimeLine
      this.graphOptionsTimeline.colors.push(headLineColor);

      graphDataTimeline.push([
        (lastlineID).toString(),
        this.combineName('xxx', ''),
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

  getVPManager(vp: VisboProject, withEmail = true): string {
    let fullName = '';
    if (vp?.managerId) {
      const user = this.vcUser?.get(vp.managerId);
      if (user) {
        if (user.profile) {
          fullName = user.profile.firstName.concat(' ', user.profile.lastName)
        }
        if (!fullName || withEmail) {
          fullName = fullName.concat(' (', user.email, ')');
        }
      }
    }
    return fullName || '';
  }

  createCustomHTMLContent(vpv: VisboProjectVersion): string {
    const startDate = convertDate(new Date(vpv.startDate), 'fullDate', this.currentLang);
    const endDate = convertDate(new Date(vpv.endDate), 'fullDate', this.currentLang);

    let result = '<div style="padding:5px 5px 5px 5px;">' +
      '<div><b>' + this.combineName(vpv.name, vpv.variantName) + '</b></div>' + '<div>' +
      '<table>';
    const status = this.translate.instant('compViewBoard.lbl.vpStatus')
    const bu = this.translate.instant('compViewBoard.lbl.bu');
    const lead = this.translate.instant('compViewBoard.lbl.manager');
    const template = this.translate.instant('compViewBoard.lbl.template');
    const start = this.translate.instant('compViewBoard.lbl.startDate');
    const end = this.translate.instant('compViewBoard.lbl.endDate');
    // get businessUnit of vp
    const item = getCustomFieldString(vpv.vp, '_businessUnit');
    const businessUnit = item ? item.value : undefined;
    // get localName of vpStatus
    const vpstatus = vpv.vp? vpv.vp.vpStatus : "undefined";
    const VPStatusIndex = constSystemVPStatus.findIndex(item => item == vpstatus)+1;
    const localVPStatus = this.dropDownVPStatus[VPStatusIndex]?.localName || ""
    if (vpstatus) {
      result = result + '<tr>' + '<td>' + status + ':</td>' + '<td><b>' + localVPStatus + '</b></td>' + '</tr>';
    }
     
    if (businessUnit) {
      result = result + '<tr>' + '<td>' + bu + ':</td>' + '<td><b>' + businessUnit + '</b></td>' + '</tr>';
    }
    if (vpv.vp.managerId) {
      result = result + '<tr>' + '<td>' + lead + ':</td>' + '<td><b>' + this.getVPManager(vpv.vp, false) + '</b></td>' + '</tr>';
    }
    if (vpv.VorlagenName) {
      result = result + '<tr>' + '<td>' + template + ':</td>' + '<td><b>' + vpv.VorlagenName + '</b></td>' + '</tr>';
    }
    result = result + '<tr>' + '<td>' + start + ':</td>' + '<td><b>' + startDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + end + ':</td>' + '<td><b>' + endDate + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
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

  
  timelineSelectVPName(vpName: string): void {
    this.log(`timeline Select Project ${vpName} `);    
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

  getVPStatus(local: boolean): string {
    if (!this.dropDownVPStatus) {
      return undefined;
    }
    let result = this.dropDownVPStatus[0];
    if (this.dropDownVPStatus && this.filterVPStatusIndex >= 0 && this.filterVPStatusIndex < this.dropDownVPStatus.length) {
      result = this.dropDownVPStatus[this.filterVPStatusIndex];
    }
    if (local) {
      return result.localName;
    } else {
      return result.name;
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

  initFilter(vpvList: VisboProjectVersion[]): void {
    let lastValueRisk: number = 0;
    let lastValueSF: number = 0;
    let lastValueVPStatus: string;
    let lastValueBU: string = '';
    if (!vpvList && vpvList.length < 1) {
      return;
    }
    vpvList.forEach( item => {
      if (item.vp?.customFieldDouble) {
        if (this.filterStrategicFit === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_strategicFit');
          if (customField) {
            //if ( this.filterStrategicFit == undefined && lastValueSF >= 0 && customField.value != lastValueSF) {
            if ( this.filterStrategicFit == undefined && lastValueSF >= 0 ) {
              this.filterStrategicFit = 0;
            }
            lastValueSF = customField.value
          }
        }
        if (this.filterRisk === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_risk');
          if (customField) {
            // if ( this.filterRisk == undefined && lastValueRisk >= 0 && customField.value != lastValueRisk) {
            if ( this.filterRisk == undefined && lastValueRisk >= 0) {
              this.filterRisk = 0;
            }
            lastValueRisk = customField.value
          }
        }
      }
      if (item.vp?.customFieldString) {
        if (this.filterBU === undefined) {
          const customField = getCustomFieldString(item.vp, '_businessUnit');
          if (customField) {
            // if ( this.filterBU == undefined && lastValueBU && customField.value != lastValueBU) {
            // if ( this.filterBU == undefined && lastValueBU) {
            if ( this.filterBU == undefined ) {
              this.filterBU = '';
            }
            lastValueBU = customField.value
          }
        }
      }
      const vpStatus = item.vp?.vpStatus;
      if (vpStatus) {
        //if ( this.filterVPStatusIndex == undefined && lastValueVPStatus && vpStatus != lastValueVPStatus) {
          if ( this.filterVPStatusIndex == undefined && lastValueVPStatus ) {
          this.filterVPStatusIndex = 0;
        }
        lastValueVPStatus = vpStatus
      }
    });
  }

  initPHDropDown(vpvList: VisboProjectVersion[]): void {
    const listPH = this.getAllPhases(vpvList);
    if (!listPH) return;
    this.dropDownPH = [];
    listPH.forEach(item => {           
      this.dropDownPH.push(item.originalName);   
    });
    if (this.dropDownPH.length > 1) {
      this.dropDownPH.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
      this.dropDownPH.unshift(this.translate.instant('compViewBoard.lbl.all'));
    }   
    if (this.dropDownPH.length == 1) {    
      this.dropDownPH.unshift(this.translate.instant('compViewBoard.lbl.all'));
    } 
    if (this.dropDownPH.length <= 0) {   
      this.dropDownPH = undefined;
    }
  } 

  getAllPhases(vpvList: VisboProjectVersion[]): VPVPhase[] {
    let listPhases: VPVPhase[]= [];
    for (let i=0; i < vpvList.length; i++) {
      for (let j=0; j< vpvList[i].AllPhases.length; j++) {
        // this.log(`Group Graph Sum Chart Element ${graphElement}: ${JSON.stringify(graphSum[graphElement])}`);
        const curPhase = vpvList[i].AllPhases[j];
        const foundPhase = listPhases.find(elem=> elem.originalName == curPhase.originalName);
        if (!foundPhase && curPhase.originalName != ".") {
          listPhases.push(curPhase);
        }
      }
    }    
    console.log( 'alldifferentphases', listPhases);
    return listPhases;
  }

  initMSDropDown(vpvList: VisboProjectVersion[]): void {
    const listMS = this.getAllMilestones(vpvList);
    if (!listMS) return;
    this.dropDownMS = [];
    listMS.forEach(item => {
      this.dropDownMS.push(item.originalName);
    });
    if (this.dropDownMS.length > 1) {
      this.dropDownMS.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
      this.dropDownMS.unshift(this.translate.instant('compViewBoard.lbl.all'));
    } 
    if (this.dropDownMS.length == 1) {    
      this.dropDownMS.unshift(this.translate.instant('compViewBoard.lbl.all'));
    } 
    if (this.dropDownMS.length <= 0) {   
      this.dropDownMS = undefined;
    }
  }

  getAllMilestones(vpvList: VisboProjectVersion[]): any[] {
    let listMS: any[] = [];
    for (let i=0; i < vpvList.length; i++) {      
        const curProj = vpvList[i];
        // this.log(`Group Graph Sum Chart Element ${graphElement}: ${JSON.stringify(graphSum[graphElement])}`);
        curProj.AllPhases.forEach(phase => {
          const results = phase.AllResults;
          results.forEach(item => {
            const foundMS = listMS.find(elem=> elem.originalName == item.originalName);
            if (!foundMS) {
              listMS.push(item);
            }
          })      
      })
    }    
    console.log( 'allDiffMilestones', listMS);
    return listMS;
  }

  initBUDropDown(): void {
    const listBU = this.customize?.value?.businessUnitDefinitions;
    if (!listBU) return;
    this.dropDownBU = [];
    listBU.forEach(item => {
      this.dropDownBU.push(item.name);
    });
    if (this.dropDownBU.length > 1) {
      this.dropDownBU.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
      this.dropDownBU.unshift(this.translate.instant('compViewBoard.lbl.all'));
    } else {
      this.dropDownBU = undefined;
    }
  }

  initVPStateDropDown(): void {
    this.dropDownVPStatus = [];
    constSystemVPStatus.forEach(item => {
      this.dropDownVPStatus.push({name: item, localName: this.translate.instant('vpStatus.' + item)});
    });
    if (this.dropDownVPStatus.length > 1) {
      // this.dropDownVPStatus.sort(function(a, b) { return visboCmpString(a.localName.toLowerCase(), b.localName.toLowerCase()); });
      this.dropDownVPStatus.unshift({name: undefined, localName: this.translate.instant('compViewBoard.lbl.all')});
    } else {
      this.dropDownVPStatus = undefined;
    }
  }

  getMinAndMaxDate(vpvList: VisboProjectVersion[]): startAndEndDate {

    const minMaxDate: startAndEndDate = {start: null, end: null};
    let newStartDate = new Date(8640000000000000);
    let newEndDate =  new Date(-8640000000000000);

    if (!vpvList && vpvList.length < 1) {
      return undefined;
    }
    
    vpvList.forEach( item => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      if (visboCmpDate(startDate, newStartDate)== -1) {
        newStartDate = startDate;
      }
      if (visboCmpDate( endDate, newEndDate) == 1) {
        newEndDate = endDate;
      }
    })
    minMaxDate.start = newStartDate;
    minMaxDate.end = newEndDate;
    return minMaxDate;
  }

  private makeTimelineProject(vpv: VisboProjectVersion, phase: string, milestone: string): TimelineProject {

    let rgbHex:string = undefined;
    const defaultColor = '#59a19e';
    const headLineColor = '#808080';
    
    
    let tooltipItemsList: any[] = [];


    const tag = new Date(vpv.startDate);
    // tag.setDate(tag.getDate())
    const etag = new Date(vpv.endDate);
    // etag.setDate(etag.getDate());

    // get the Phase with name 'filterPH'
    const filteredPhases: Phase[] = [];
    const filteredMilestones: Milestone[] = [];
    if (this.filterPH ) {      
      vpv.AllPhases.forEach ( ph => {
        if (ph.originalName.toLowerCase() == this.filterPH.toLowerCase()) {
          const phStart = new Date(tag);
          phStart.setDate(phStart.getDate() + ph.startOffsetinDays);
          const phEnd = new Date(tag);
          phEnd.setDate(phEnd.getDate() + ph.startOffsetinDays+ ph.dauerInDays - 1);

          let phtooltipList: TooltipItem[] = [];        
          // let phTooltip: TooltipItem = {key: "Phase Name:", value: ph.originalName};
          // phtooltipList.push(phTooltip);

          let phTooltip: TooltipItem = {key: this.translate.instant('compViewBoard.lbl.phaseStart'), value: convertDate(new Date(phStart), "fullDate", this.currentLang)};
          phtooltipList.push(phTooltip);

          phTooltip = {key: this.translate.instant('compViewBoard.lbl.phaseEnd'), value: convertDate(new Date(phEnd), "fullDate", this.currentLang)};
          phtooltipList.push(phTooltip);

          const phase:Phase = {name: ph.originalName, startDate: new Date(phStart), endDate: new Date(phEnd),tooltipItems: phtooltipList};
          filteredPhases.push(phase);
        } 
     })      
    }

    if (this.filterMS ){
      vpv.AllPhases.forEach ( ph => {        
        ph.AllResults.forEach (ms => {
          if (ms.originalName.toLowerCase() == this.filterMS.toLowerCase()) {
            const msDate = new Date(tag);
            msDate.setDate(msDate.getDate() + ph.startOffsetinDays + ms.offset);

            let mstooltipList: TooltipItem[] = []; 
  
            let msTooltip: TooltipItem = {key: this.translate.instant('compViewBoard.lbl.milestoneDate'), value: convertDate(new Date(msDate), "fullDate", this.currentLang)};
            mstooltipList.push(msTooltip);    

            const milestone:Milestone = {name: ms.originalName, date: new Date(msDate),tooltipItems: mstooltipList};
            filteredMilestones.push(milestone);
          }
        })     
      })
    }

    let buColor = 0;
    const item = getCustomFieldString(vpv.vp, '_businessUnit');
    

    const bu = item ? item.value : undefined;    
    const buDefs = [];

    for ( let j = 0; j < this.customize?.value?.businessUnitDefinitions?.length; j++) {
      buDefs[this.customize.value.businessUnitDefinitions[j].name] = this.customize.value.businessUnitDefinitions[j].color;
    }
   
    if (bu) {
      buColor = buDefs[bu];
      rgbHex = buColor ? excelColorToRGBHex(buColor): defaultColor;
    } else {
      rgbHex = defaultColor;
    }
    this.log(`BusinessUnit - Color ${rgbHex}`);
    let newColor:string = undefined;

    if (!vpv.vp.vpStatus) {
        newColor = chroma(rgbHex).brighten(3).hex();
    }
    switch (vpv.vp.vpStatus) {
      case 'initialized':
        newColor = brightenRGBColor(hexToRgb(rgbHex), 60, true); 
        //newColor = chroma(rgbHex).brighten(3).hex();
        break;
      case 'proposed':
        newColor = brightenRGBColor(hexToRgb(rgbHex), 30, true); 
        //newColor = chroma(rgbHex).brighten(10).hex();
        break;
      case 'ordered':
        newColor = brightenRGBColor(hexToRgb(rgbHex), 0, true); 
        //newColor = chroma(rgbHex).brighten().hex();
        break;
      case 'paused':
        newColor = darkenRGBColor(hexToRgb(rgbHex), 20, true); 
        //newColor = chroma(rgbHex).darken(1).hex();
        break;
      case 'finished':
        newColor = darkenRGBColor(hexToRgb(rgbHex), 40, true); 
        //newColor = chroma(rgbHex).darken(1).hex();
        break;
      case 'stopped':
        newColor = darkenRGBColor(hexToRgb(rgbHex), 60, true); 
        //newColor = chroma(rgbHex).darken(1).hex();
        break;
    }

    const status = this.translate.instant('compViewBoard.lbl.vpStatus')
    const vpstatus = vpv.vp? vpv.vp.vpStatus : "undefined";
    const VPStatusIndex = constSystemVPStatus.findIndex(item => item == vpstatus)+1;
    const localVPStatus = this.dropDownVPStatus[VPStatusIndex]?.localName || ""
    if (vpstatus){
      tooltipItemsList.push({key: status, value: localVPStatus});
    }
    // get businessUnit of vp
    const buText = this.translate.instant('compViewBoard.lbl.bu');
    const buitem = getCustomFieldString(vpv.vp, '_businessUnit');
    const businessUnit = buitem ? buitem.value : undefined;
    if (businessUnit) {    
      tooltipItemsList.push({key: buText, value: businessUnit});
    }
    // get Manager of vp
    const lead = this.translate.instant('compViewBoard.lbl.manager');
    if (vpv.vp.managerId) {
      tooltipItemsList.push({key: lead, value: this.getVPManager(vpv.vp, false)});
    }
    // get template of vp
    const template = this.translate.instant('compViewBoard.lbl.template');
    if (vpv.VorlagenName) {   
      tooltipItemsList.push({key: template, value: vpv.VorlagenName});      
    }

    const start = this.translate.instant('compViewBoard.lbl.startDate');
    const end = this.translate.instant('compViewBoard.lbl.endDate');
    tooltipItemsList.push({key: start, value: convertDate(new Date(vpv.startDate), "fullDate", this.currentLang)});    
    tooltipItemsList.push({key: end, value: convertDate(new Date(vpv.endDate), "fullDate", this.currentLang)});
    
    
    
    const timelineProject:TimelineProject = {
      id:vpv._id,
      name:this.combineName(vpv.name, vpv.variantName),
      startDate: vpv.startDate,
      endDate: vpv.endDate,
      color: newColor,
      phases:filteredPhases,
      milestones: filteredMilestones,
      tooltipItems: tooltipItemsList
    };
    return timelineProject;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewBoard: ' + message);
  }

}
