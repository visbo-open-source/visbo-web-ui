import { Component, Input, OnInit, OnChanges } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../../_services/message.service';
import { AlertService } from '../../_services/alert.service';

import { VisboProjectVersion, VPVCost } from '../../_models/visboprojectversion';
import { VisboProjectVersionService } from '../../_services/visboprojectversion.service';

import { VGPermission, VGPVC, VGPVP } from '../../_models/visbogroup';

import { convertDate, getErrorMessage, visboGetShortText } from '../../_helpers/visbo.helper';

import * as XLSX from 'xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

class exportCost {
  name: string;
  vpStatus: string;
  strategicFit: number;
  risk: number;
  variantName: string;
  ampelStatus: number;
  ampelErlaeuterung: string;
  vpid: string;
  month: Date;
  baseLineCost: number;
  actualCost: number;
  plannedCost: number;
  cost: number;
  baseLineInvoice: number;
  actualInvoice: number;
  plannedInvoice: number;
  invoice: number;
  cumulatedCost: number;
  cumulatedInvoice: number;
}

@Component({
  selector: 'app-comp-viewcost',
  templateUrl: './comp-viewcost.component.html'
})
export class VisboCompViewCostComponent implements OnInit, OnChanges {

  @Input() vpvActive: VisboProjectVersion;
  @Input() combinedPerm: VGPermission;

  currentVpvId: string;
  vpvCost: VPVCost[];
  vpvActualDataUntil: Date;

  vpvTotalCostBaseLine: number;
  vpvTotalCostCurrent: number;

  parentThis = this;
  timeoutID: number;

  colors = ['#F7941E', '#BDBDBD', '#458CCB'];

  chartActive: Date;
  graphDataComboChart = [];
  graphOptionsComboChart = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      title: 'Monthly Cost comparison: plan-to-date vs. baseline',
      animation: {startup: true, duration: 200},
      legend: {position: 'top'},
      explorer: {actions: ['dragToZoom', 'rightClickToReset'], maxZoomIn: .01},
      // curveType: 'function',
      colors: this.colors,
      seriesType: 'bars',
      series: {0: {type: 'line', lineWidth: 4, pointSize: 0}},
      isStacked: true,
      tooltip: {
        isHtml: true
      },
      vAxis: {
        title: 'Monthly Cost',
        format: "# T\u20AC",
        minorGridlines: {count: 0, color: 'none'}
      },
      hAxis: {
        format: 'MMM yy',
        gridlines: {
          color: '#FFF',
          count: -1
        },
        minorGridlines: {count: 0, color: '#FFF'},
        slantedText: true,
        slantedTextAngle: 90
      },
    };
  currentLang: string;

  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.visboCostCalc();
  }

  ngOnChanges(): void {
    this.log(`Cost Changes  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.chartActive = undefined;
    if (this.currentVpvId !== undefined && this.vpvActive._id !== this.currentVpvId) {
      this.visboCostCalc();
    }
  }

  onResized(event: ResizedEvent): void {
    if (!event) { this.log('No event in Resize'); }
    let diff = 0;
    if (this.chartActive) {
      diff = (new Date()).getTime() - this.chartActive.getTime()
    }
    if (diff < 1000) {
      return;
    }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
      this.timeoutID = setTimeout(() => {
      this.visboCostCalc();
      this.timeoutID = undefined;
    }, 500);
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  visboCostCalc(): void {
    if (!this.vpvActive) {
      return;
    }
    this.currentVpvId = this.vpvActive._id;

    this.log(`Cost Calc for Version  ${this.vpvActive._id} ${this.vpvActive.timestamp}`);
    this.visboprojectversionService.getCost(this.vpvActive._id)
      .subscribe(
        visboprojectversions => {
          this.log(`get VPV Calc: Get ${visboprojectversions.length} vpvs with ${visboprojectversions[0].cost.length} cost entries`);
          if (visboprojectversions.length !== 1 || !visboprojectversions[0].cost) {
            this.log(`get VPV Calc: Reset Cost to empty `);
            // this.vpvCost[visboprojectversions[0]._id] = [];
            this.vpvCost = [];
          } else {
            this.log(`Store Cost for ${visboprojectversions[0]._id} Len ${visboprojectversions[0].cost.length} Actual ${visboprojectversions[0].actualDataUntil}`);
            this.vpvCost = visboprojectversions[0].cost;
            this.vpvActualDataUntil = new Date(visboprojectversions[0].actualDataUntil);
          }
          this.visboViewCostOverTime();
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('compViewCost.msg.errorPermVersion', {'name': this.vpvActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  visboViewCostOverTime(): void {
    this.graphOptionsComboChart.title = this.translate.instant('keyMetrics.chart.titleCostOverTime');
    this.graphOptionsComboChart.vAxis.title = this.translate.instant('keyMetrics.chart.yAxisCostOverTime');
    const graphDataCost = [];
    if (!this.vpvCost) {
      return;
    }

    const cost = this.vpvCost;
    const actualDataUntilTime = this.vpvActualDataUntil.getTime();

    this.log(`ViewCostOverTime Actual Until ${this.vpvActualDataUntil}`);

    if (cost.length === 0) {
      return;
    }

    this.vpvTotalCostBaseLine = 0;
    this.vpvTotalCostCurrent = 0;

    for (let i = 0; i < cost.length; i++) {
      const currentDate = new Date(cost[i].currentDate);
      // this.log(`ViewCostOverTime Push  ${cost[i].currentDate}`);
      if (currentDate.getTime() < actualDataUntilTime) {
        graphDataCost.push([
          new Date(cost[i].currentDate),
          Math.round(cost[i].baseLineCost * 10) / 10 || 0,
          this.createCustomHTMLContent(cost[i], true),
          Math.round(cost[i].currentCost * 10) / 10  || 0,
          this.createCustomHTMLContent(cost[i], true),
          0,
          ''
        ]);
      } else {
        graphDataCost.push([
          new Date(cost[i].currentDate),
          Math.round(cost[i].baseLineCost * 10) / 10 || 0,
          this.createCustomHTMLContent(cost[i], false),
          0,
          '',
          Math.round(cost[i].currentCost * 10) / 10  || 0,
          this.createCustomHTMLContent(cost[i], false)
        ]);
      }
      this.vpvTotalCostBaseLine += cost[i].baseLineCost || 0;
      this.vpvTotalCostCurrent += cost[i].currentCost || 0;
    }
    if (graphDataCost.length === 0) {
      this.log(`ViewCostOverTime Result empty`);
      graphDataCost.push([new Date(), 0, undefined, 0, '', 0, undefined]);
    }
    // graphDataCost.sort(function(a, b) { return a[0].getTime() - b[0].getTime(); });
    // we need at least 2 items for Line Chart and show the current status for today
    const len = graphDataCost.length;
    // this.log(`ViewCostOverTime len ${len} ${JSON.stringify(graphDataCost[len - 1])}`);
    if (len < 1 ) {
      this.log(`ViewCostOverTime Empty`);
    }
    if (len === 1) {
      // add an additional month as one month could not be displayed, but do not deliver values for it
      const currentDate = new Date(graphDataCost[0][0]);
      currentDate.setMonth(currentDate.getMonth() + 1);
      graphDataCost.push([
        currentDate, undefined, undefined, undefined, undefined, undefined, undefined
      ]);
    }
    // header will be written in the array at the beginning
    graphDataCost.unshift([
      'Timestamp',
      this.translate.instant('keyMetrics.baselinePV'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.planAC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      this.translate.instant('keyMetrics.planETC'),
      {type: 'string', role: 'tooltip', 'p': {'html': true}}
    ]);
    // graphDataCost.reverse();
    // this.log(`view Cost VP cost budget  ${JSON.stringify(graphDataCost)}`);
    this.graphDataComboChart = graphDataCost;
    this.chartActive = new Date();
  }

  chartSelectRow(row: number, label: string, value: number): void {
    this.log(`chart Select Row ${row} ${label} ${value} `);
  }

  createCustomHTMLContent(cost: VPVCost, actualData: boolean): string {
    const currentDate = convertDate(new Date(cost.currentDate), 'shortDate', this.currentLang);
    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + currentDate + '</b></div>' + '<div>' +
      '<table>';

    const baselinePV = this.translate.instant('keyMetrics.baselinePV');
    const planAC = this.translate.instant('keyMetrics.planAC');
    const planETC = this.translate.instant('keyMetrics.planETC');

    result = result + '<tr>' + '<td>' + baselinePV + ':</td>'
                    + '<td align="right"><b>' + Math.round(cost.baseLineCost * 10) / 10 + ' T\u20AC</b></td>' + '</tr>';
    result = result + '<tr>' + '<td>' + (actualData ? planAC : planETC)
                    + ':</td align="right">' + '<td><b>' + Math.round(cost.currentCost * 10) / 10 + ' T\u20AC</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  copyCost(cost: VPVCost, name: string, cumulate: exportCost): exportCost {
    const copy = new exportCost();
    const actualDataUntilTime = this.vpvActualDataUntil.getTime();
    const currentTime = (new Date()).getTime();

    copy.name = name;
    copy.month = new Date(cost.currentDate);
    // copy.variantName = cost.variantName;

    copy.baseLineCost = Math.round(cost.baseLineCost * 1000);
    if (copy.month.getTime() < actualDataUntilTime) {
      copy.actualCost = Math.round(cost.currentCost * 1000);
      copy.plannedCost = 0;
    } else {
      copy.actualCost = 0;
      copy.plannedCost = Math.round(cost.currentCost * 1000);
    }
    copy.cost = copy.actualCost + copy.plannedCost;
    copy.baseLineInvoice = Math.round(cost.baseLineInvoice * 1000);
    if (copy.month.getTime() < currentTime) {
      copy.actualInvoice = Math.round(cost.currentInvoice * 1000);
      copy.plannedInvoice = 0;
    } else {
      copy.actualInvoice = 0;
      copy.plannedInvoice = Math.round(cost.currentInvoice * 1000);
    }
    copy.invoice = copy.actualInvoice + copy.plannedInvoice;
    cumulate.cumulatedCost += copy.cost;
    cumulate.cumulatedInvoice += copy.invoice;
    copy.cumulatedCost = cumulate.cumulatedCost;
    copy.cumulatedInvoice = cumulate.cumulatedInvoice;
    return copy;
  }

  exportExcel(): void {
    this.log(`Export Cost to Excel ${this.vpvCost?.length}`);
    // convert list to matix

    const excel: exportCost[] = [];

    let name = '';
    let urlWeb = ''
    const listURL: string[] = [];
    const tooltip = this.translate.instant('compViewCost.msg.viewWeb');
    if (this.vpvActive) {
      name = this.vpvActive.name;
      urlWeb = window.location.origin.concat('/vpKeyMetrics/', this.vpvActive.vpid, '?view=Cost');
    }
    const cumulate = new exportCost();
    cumulate.cumulatedCost = 0;
    cumulate.cumulatedInvoice = 0;
    this.vpvCost?.forEach(element => {
      excel.push(this.copyCost(element, name, cumulate));
      listURL.push(urlWeb);
    });

    const len = excel.length;
    const width = Object.keys(excel[0]).length;
    this.log(`Export Data to Excel ${excel.length}`);
    // Add Localised header to excel
    // eslint-disable-next-line
    const header: any = {};
    let colName: number, colIndex = 0;
    for (const element in excel[0]) {
      // this.log(`Processing Header ${element}`);
      if (element == 'name') {
        colName = colIndex;
      }
      colIndex++;
      header[element] = this.translate.instant('compViewCost.lbl.'.concat(element))
    }
    excel.unshift(header);
    // this.log(`Header for Excel: ${JSON.stringify(header)}`)

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excel, {skipHeader: true});
    for (let index = 1; index <= len; index++) {
      const address = XLSX.utils.encode_cell({r: index, c: colName});
      const url = listURL[index - 1];
      worksheet[address].l = { Target: url, Tooltip: tooltip };
    }
    const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
    worksheet['!autofilter'] = { ref: matrix };
    // eslint-disable-next-line
    const sheets: any = {};
    const sheetName = visboGetShortText(name, 30);
    sheets[sheetName] = worksheet;
    const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [sheetName] };
    // eslint-disable-next-line
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const actDate = new Date();
    const fileName = ''.concat(
      actDate.getFullYear().toString(),
      '_',
      (actDate.getMonth() + 1).toString().padStart(2, "0"),
      '_',
      actDate.getDate().toString().padStart(2, "0"),
      '_Cost ',
      (name || '')
    );

    const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName.concat(EXCEL_EXTENSION);
    this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getLevel(plan: number, baseline: number): number {
    let percentCalc = 1
    if (baseline) {
      percentCalc = plan/baseline;
    }
    if (percentCalc <= 1) return 1;
    else if (percentCalc <= 1.05) return 2;
    else return 3;
  }

  vpHasCost(type: string): boolean {
    let result = false;
    if (!this.vpvActive) {
      return result
    }
    if (type == 'keyMetric') {
      result = this.vpvActive.keyMetrics &&
                (this.vpvActive.keyMetrics.costBaseLastTotal > 0 || this.vpvActive.keyMetrics.costCurrentTotal > 0)
    } else {
      if (this.vpvCost && this.vpvCost.length > 0) {     // vpv contains cost data
        result = true;
      }
    }
    return result;
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('CompVisboViewCost: ' + message);
  }

}
