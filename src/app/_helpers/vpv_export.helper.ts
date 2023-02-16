import { VPVKeyMetricsCalc, ExportKeyMetric } from '../_models/visboprojectversion';
import { getCustomFieldDouble, getCustomFieldString, getCustomFieldDate } from '../_models/visboproject';
import { VisboUser } from '../_models/visbouser';

export function copyKeyMetrics(vpv: VPVKeyMetricsCalc, type: string, vcUser: Map<string, VisboUser>): ExportKeyMetric {
  const element = new ExportKeyMetric();
  element.project = vpv.name;
  element.variant = vpv.variantName;
  if (type == 'Project') {
    element.timestamp = new Date(vpv.timestamp);
    if (vpv.keyMetrics?.baselineDate) {
      element.baselineDate = new Date(vpv.keyMetrics.baselineDate);
    }
    element.trafficlight = vpv.ampelStatus;
    element.trafficlightDesc = vpv.ampelErlaeuterung;
    if (vpv.vp) {
      element.vpStatus = vpv.vp.vpStatus;
      let itemDouble = getCustomFieldDouble(vpv.vp, '_strategicFit');
      element._strategicFit = itemDouble?.value;
      itemDouble = getCustomFieldDouble(vpv.vp, '_risk');
      element._risk = itemDouble?.value;
      const itemString = getCustomFieldString(vpv.vp, '_businessUnit');
      element._businessUnit = itemString?.value || '';
      const itemDate = getCustomFieldDate(vpv.vp, '_PMCommit');
      element._PMCommit = itemDate ? new Date(itemDate.value) : undefined;
      if (vpv.vp.managerId) {
        const user = vcUser?.get(vpv.vp.managerId);
        element.lead = user?.email;
      }
    }
  }
  if (vpv.keyMetrics) {
    if (type == 'Cost') {      
      if (vpv.keyMetrics.RACBaseLast) element.racBaseLast = vpv.keyMetrics.RACBaseLast && Math.round(vpv.keyMetrics.RACBaseLast * 1000);
      
      if (vpv.keyMetrics.RACCurrent) {
        element.racCurrent = vpv.keyMetrics.RACCurrent && Math.round(vpv.keyMetrics.RACCurrent * 1000);
      } else {
        element.racCurrent = vpv.Erloes;
      }
      element.costCurrentActual = vpv.keyMetrics.costCurrentActual && Math.round(vpv.keyMetrics.costCurrentActual * 1000);
      element.costCurrentTotal = vpv.keyMetrics.costCurrentTotal && Math.round(vpv.keyMetrics.costCurrentTotal * 1000);
      if (vpv.keyMetrics.costCurrentTotalPredict) element.costCurrentTotalPredict = Math.round(vpv.keyMetrics.costCurrentTotalPredict * 1000);
      element.costBaseLastActual = vpv.keyMetrics.costBaseLastActual && Math.round(vpv.keyMetrics.costBaseLastActual * 1000);
      element.costBaseLastTotal = vpv.keyMetrics.costBaseLastTotal && Math.round(vpv.keyMetrics.costBaseLastTotal * 1000);
      element.savingCostTotal = Math.round((vpv.savingCostTotal || 0) * 1000);
      element.savingCostActual = Math.round((vpv.savingCostActual || 0) * 1000);
      if (vpv.savingCostTotalPredict) element.savingCostTotalPredict = Math.round(vpv.savingCostTotalPredict * 1000);
    }
    if (type == 'Deadline') {
      element.startDate = new Date(vpv.startDate);
      element.endDateCurrent = new Date(vpv.keyMetrics.endDateCurrent);
      element.endDateBaseLast = new Date(vpv.keyMetrics.endDateBaseLast);
      element.timeCompletionCurrentActual = vpv.keyMetrics.timeCompletionCurrentActual && Math.round(vpv.keyMetrics.timeCompletionCurrentActual * 10) / 10;
      element.timeCompletionCurrentTotal = vpv.keyMetrics.timeCompletionCurrentTotal;
      element.timeCompletionBaseLastActual = vpv.keyMetrics.timeCompletionBaseLastActual && Math.round(vpv.keyMetrics.timeCompletionBaseLastActual * 10) / 10;
      element.timeCompletionBaseLastTotal = vpv.keyMetrics.timeCompletionBaseLastTotal;
      element.timeDelayFinished = vpv.keyMetrics.timeDelayFinished && Math.round(vpv.keyMetrics.timeDelayFinished * 10) / 10;
      element.timeDelayUnFinished = vpv.keyMetrics.timeDelayUnFinished && Math.round(vpv.keyMetrics.timeDelayUnFinished * 10) / 10;
    }
    if (type == 'Delivery') {
      element.deliverableCompletionCurrentActual = vpv.keyMetrics.deliverableCompletionCurrentActual && Math.round(vpv.keyMetrics.deliverableCompletionCurrentActual * 10) / 10;
      element.deliverableCompletionCurrentTotal = vpv.keyMetrics.deliverableCompletionCurrentTotal;
      element.deliverableCompletionBaseLastActual = vpv.keyMetrics.deliverableCompletionBaseLastActual && Math.round(vpv.keyMetrics.deliverableCompletionBaseLastActual * 10) / 10;
      element.deliverableCompletionBaseLastTotal = vpv.keyMetrics.deliverableCompletionBaseLastTotal;
      element.deliverableDelayFinished = vpv.keyMetrics.deliverableDelayFinished && Math.round(vpv.keyMetrics.deliverableDelayFinished * 10) / 10;
      element.deliverableDelayUnFinished = vpv.keyMetrics.deliverableDelayUnFinished && Math.round(vpv.keyMetrics.deliverableDelayUnFinished * 10) / 10;
    }
  }
  if (type == 'Deadline') {
    element.savingEndDate = vpv.savingEndDate && Math.round(vpv.savingEndDate);
    element.timeCompletionActual = vpv.timeCompletionActual && Math.round(vpv.timeCompletionActual);
  }
  if (type == 'Delivery') {
    element.deliveryCompletionActual = vpv.deliveryCompletionActual && Math.round(vpv.deliveryCompletionActual * 100) / 100;
  }

  return element;
}
