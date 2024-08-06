
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

import { visboCmpString, visboCmpDate, convertDate, visboIsToday, getPreView, excelColorToRGBHex, hexToRgb, hexToRgbAverage } from '../../_helpers/visbo.helper';
import * as chroma from 'chroma-js';
import { Milestone, Phase, TimelineProject, TooltipItem } from 'src/app/_chart/portfolio-chart/portfolio-chart.component';
import { select } from 'd3';

interface startAndEndDate {
  start: Date;
  end: Date;
}
class kanbanProjectlist {
  name: string;
  variantName: string;
  bu: string;
  buColor: string;
  strategicFit: number;
  risk: number;
  BAC: number;
  RAC: number;
  EAC: number;
  status: string;
  profit: number;
}
class kanbanIDs {
  EAC: number;
  BAC: number;
  RAC: number;
  Profit: number;
}
class DropDown {
  name: string;
  id: string;
}

class DropDownStatus {
  name: string;
  localName: string;
}
@Component({
  selector: 'app-comp-viewkanbanboard',
  templateUrl: './comp-viewkanbanboard.component.html',
  styleUrls: ['./comp-viewkanbanboard.component.css']
})
export class VisboCompViewKanbanBoardComponent implements OnInit {

  @Input() listVPV: VisboProjectVersion[];
  @Input() customize: VisboSetting;
  @Input() vpf: VisboProject;
  @Input() vcUser: Map<string, VisboUser>;
  @Input() modusStoppedPaused: boolean;

  refDate: Date;
  filter: string;
  filterPH: string;
  dropDownPH: string[];
  filterMS: string;
  dropDownSortType: DropDown[];
  sortMode: string = "alphabetical";
  filterStrategicFit: number;
  filterRisk: number;
  filterBU: string;
  dropDownBU: string[];
  buDefs = [];
  filterVPStatusIndex: number;
  dropDownVPStatus: DropDownStatus[];
  activeID: string; // either VP ID of Portfolio or VC ID
  timeoutID: ReturnType<typeof setTimeout>;

  parentThis = this;

  timelineProjects: TimelineProject[];
  timelineMinAndMaxDate: startAndEndDate;
  currentLang: string;

  initlistVPV: kanbanProjectlist[] = [];
  initlistIDs: kanbanIDs = new kanbanIDs();
  proposedlistVPV: kanbanProjectlist[] = [];
  proposedlistIDs: kanbanIDs = new kanbanIDs();
  orderedlistVPV: kanbanProjectlist[] = [];
  orderedlistIDs: kanbanIDs = new kanbanIDs();
  pausedlistVPV: kanbanProjectlist[] = [];
  pausedlistIDs: kanbanIDs = new kanbanIDs();
  finishedlistVPV: kanbanProjectlist[] = [];
  finishedlistIDs: kanbanIDs = new kanbanIDs();
  stoppedlistVPV: kanbanProjectlist[] = [];
  stoppedlistIDs: kanbanIDs = new kanbanIDs();

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.log(`KanbanBoard Init  ${this.refDate?.toISOString()} `);
    //this.initSetting();
    this.initDropDown();
    this.visboKanbanfilter();
  }

  ngOnChanges(): void {
    this.log(`KanbanBoard Changes  ${this.refDate?.toISOString()}`);
    //this.initSetting();
    this.visboKanbanfilter();
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.visboKanbanfilter();
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
  }

  
  initDropDown(): void {

    this.dropDownSortType = [];
    this.dropDownSortType.push({name: 'alphabetical', id: 'alphabetical'});    
    this.dropDownSortType.push({name: 'businessUnit', id: 'bu'});    
    this.dropDownSortType.push({name: 'strategicFit', id: 'strategicFit'});       
    this.dropDownSortType.push({name: 'risk', id: 'risk'});   
    this.dropDownSortType.push({name: 'Budget', id: 'BAC'});
  }


  visboKanbanfilter(): void { 

    const defaultColor = '#59a19e';
    const headLineColor = '#808080';
    
    for ( let j = 0; j < this.customize?.value?.businessUnitDefinitions?.length; j++) {
      let buColor= this.customize.value.businessUnitDefinitions[j].color;
      this.buDefs[this.customize.value.businessUnitDefinitions[j].name] = buColor ? excelColorToRGBHex(buColor): defaultColor;
    }
   

    this.initlistVPV = [];
    this.initlistIDs = {'BAC': 0, 'RAC': 0, 'EAC': 0, 'Profit': 0};
    this.proposedlistVPV = [];
    this.proposedlistIDs = {'BAC': 0, 'RAC': 0, 'EAC': 0, 'Profit': 0};
    this.orderedlistVPV = [];
    this.orderedlistIDs = {'BAC': 0, 'RAC': 0, 'EAC': 0, 'Profit': 0};
    this.pausedlistVPV = [];
    this.pausedlistIDs = {'BAC': 0, 'RAC': 0, 'EAC': 0, 'Profit': 0};
    this.finishedlistVPV = [];
    this.finishedlistIDs = {'BAC': 0, 'RAC': 0, 'EAC': 0, 'Profit': 0};
    this.stoppedlistVPV = [];
    this.stoppedlistIDs = {'BAC': 0, 'RAC': 0, 'EAC': 0, 'Profit': 0};

    if (!this.listVPV || this.listVPV.length === 0 ) {      
      return;
    }    
     
   
    for (let i = 0; i < this.listVPV.length; i++) {
      if (this.listVPV[i].vp?.vpType != 0) {
        continue;
      }
      const listitem = new kanbanProjectlist();
      const vpStatus =  this.listVPV[i].vp.vpStatus;
      const bu = getCustomFieldString(this.listVPV[i].vp, '_businessUnit')?.value;
      if (bu) {        
        listitem.bu = bu;
        listitem.buColor = this.buDefs[bu] ? this.buDefs[bu] : defaultColor;
      } else {
        listitem.bu = '';
        listitem.buColor = defaultColor;
      }     
      const risk = getCustomFieldDouble(this.listVPV[i].vp, "_risk")?.value;
      listitem.risk = risk; 
      const strategicFit = getCustomFieldDouble(this.listVPV[i].vp, "_strategicFit")?.value;
      listitem.strategicFit = strategicFit;


      listitem.name = this.listVPV[i].name;
      listitem.variantName = this.listVPV[i].variantName;
      listitem.status = vpStatus;
      let RAC = 0;
      let BAC = 0;
      let EAC = 0;
      if (this.listVPV[i].keyMetrics) {
        RAC = this.listVPV[i].keyMetrics.RACCurrent ? this.listVPV[i].keyMetrics.RACCurrent : 0;       
        EAC = this.listVPV[i].keyMetrics.costCurrentTotal ? this.listVPV[i].keyMetrics.costCurrentTotal : 0;       
        BAC = this.listVPV[i].keyMetrics.costBaseLastTotal ? this.listVPV[i].keyMetrics.costBaseLastActual : 0;       
        listitem.profit = RAC - EAC;
      }    
      listitem.RAC = RAC; 
      listitem.EAC = EAC;
      listitem.BAC = BAC;        

      switch (vpStatus) {
        case constSystemVPStatus[0]:{          
          this.initlistVPV.push(listitem);
          this.initlistIDs.BAC+=BAC;
          this.initlistIDs.RAC+=RAC;
          this.initlistIDs.EAC+=EAC;
          this.initlistIDs.Profit+=listitem.profit;
          break;
        }
        case constSystemVPStatus[1]:{
          this.proposedlistVPV.push(listitem);
          this.proposedlistIDs.BAC+=BAC;
          this.proposedlistIDs.RAC+=RAC;
          this.proposedlistIDs.EAC+=EAC;
          this.proposedlistIDs.Profit+=listitem.profit;
          break;
        }
        case constSystemVPStatus[2]:{
          this.orderedlistVPV.push(listitem);
          this.orderedlistIDs.BAC+=BAC;
          this.orderedlistIDs.RAC+=RAC;
          this.orderedlistIDs.EAC+=EAC;
          this.orderedlistIDs.Profit+=listitem.profit;
          break;
        }
        case constSystemVPStatus[3]:{
          this.pausedlistVPV.push(listitem);
          this.pausedlistIDs.BAC+=BAC;
          this.pausedlistIDs.RAC+=RAC;
          this.pausedlistIDs.EAC+=EAC;
          this.pausedlistIDs.Profit+=listitem.profit;
          break;
        }
        case constSystemVPStatus[4]:{
          this.finishedlistVPV.push(listitem);
          this.finishedlistIDs.BAC+=BAC;
          this.finishedlistIDs.RAC+=RAC;
          this.finishedlistIDs.EAC+=EAC;
          this.finishedlistIDs.Profit+=listitem.profit;
          break;
        }
        case constSystemVPStatus[5]:{          
          this.stoppedlistVPV.push(listitem);
          this.stoppedlistIDs.BAC+=BAC;
          this.stoppedlistIDs.RAC+=RAC;
          this.stoppedlistIDs.EAC+=EAC;
          this.stoppedlistIDs.Profit+=listitem.profit;
          break;
        }
        default: {
          this.log('Kanban Board: ${this.listVPV[i].vp.vpStatus} existiert nicht')
          break;
        }
      }      
      this.switchSort(this.initlistVPV);
     
    }
    const a = 0;
  }

  public  getBUColor(hex: string) {
    const rgbColor = hexToRgb(hex);
    return rgbColor;
  }

  public getfontColor(hex: string) {
    const fontColor = (hexToRgbAverage(hex) > 127) ? 'rgb(0,0,0)' : 'rgb(256,256,256)';
    return fontColor;
  }

  switchSort(list: kanbanProjectlist[]): void {
    if (this.sortMode && this.sortMode =='alphabetical') {
      list.sort(function(a, b) {            
        return  visboCmpString(a.name, b.name)
      });
    } 
    if (this.sortMode && this.sortMode =='Profit') {
      list.sort(function(a, b) {            
        return (b.profit - a.profit)
      });
    }
    if (this.sortMode && this.sortMode =='risk') {
      list.sort(function(a, b) {            
        return (b.risk - a.risk)
      });
    }
    if (this.sortMode && this.sortMode =='strategicFit') {
      list.sort(function(a, b) {            
        return (b.strategicFit - a.strategicFit)
      });
    }
    if (this.sortMode && this.sortMode =='bu') {
      list.sort(function(a, b) {            
        return  visboCmpString(b.bu , a.bu)
      });
    } 
    if (this.sortMode && this.sortMode =='BAC') {
      list.sort(function(a, b) {            
        return  (b.BAC - a.BAC)
      });
    }
    
  }
  
  // updateUrlParam(type: string, value: string, history = false): void {
  //   // add parameter to URL
  //   const url = this.route.snapshot.url.join('/');
  //   if (value === undefined) { value = null; }
  //   const queryParams = new VPFParams();
  //   if (type == 'roleID') {
  //     queryParams.roleID = Number(value);
  //   } else if (type == 'from' || type == 'to') {
  //     queryParams.from = this.capacityFrom.toISOString();
  //     queryParams.to = this.capacityTo.toISOString();
  //   } else if (type == 'unit') {
  //     queryParams.unit = value;
  //   } else if (type == 'pfv') {
  //     queryParams.pfv = value;
  //   } else if (type == 'drillDown') {
  //     queryParams.drillDown = value == '0' ? undefined : value;
  //   } if (type == 'filter') {
  //     queryParams.filter = this.filter;
  //     localStorage.setItem('vpfFilter', this.filter || '');
  //     queryParams.filterVPStatus = this.getVPStatus(false);
  //     localStorage.setItem('vpfFilterVPSStatus', this.getVPStatus(false) || '');
  //     queryParams.filterBU = this.filterBU ? this.filterBU : undefined;
  //     localStorage.setItem('vpfFilterBU', this.filterBU || '');
  //     queryParams.filterRisk = this.filterRisk > 0 ? this.filterRisk.toString() : undefined;
  //     localStorage.setItem('vpfFilterRisk', (this.filterRisk || 0).toString());
  //     queryParams.filterStrategicFit = this.filterStrategicFit > 0 ? this.filterStrategicFit.toString() : undefined;
  //     localStorage.setItem('vpfFilterStrategicFit', (this.filterStrategicFit || 0).toString());
  //   }
  //   this.router.navigate([url], {
  //     queryParams: queryParams,
  //     // no navigation back to old status, but to the page before
  //     replaceUrl: !history,
  //     // preserve the existing query params in the route
  //     queryParamsHandling: 'merge'
  //   });
  // }


  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPFParams();
    
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }
  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboKanbanBoard: ' + message);
  }

}