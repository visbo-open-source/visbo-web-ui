import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboProject, CreateProjectProperty, getCustomFieldDate } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';
import { VPFParams } from '../_models/visboportfolio';
import { VisboUser } from '../_models/visbouser';

import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';
import { VisboSetting, VisboOrganisation } from '../_models/visbosetting';

class DropDown {
  name: string;
  id: string;
}

class CustomUserFields {
  uid: string;
  name: string;  
  type: string;
}

@Component({
  selector: 'app-visboprojects',
  styleUrls: ['./visboprojects.component.css'],
  templateUrl: './visboprojects.component.html'
})
export class VisboProjectsComponent implements OnInit {

  visboprojects: VisboProject[];
  visboprojectsAll: VisboProject[];
  vpTemplates: VisboProject[];
  vcSelected: string;
  vcActive: VisboCenter;
  newVP: CreateProjectProperty;
  templateHasCost: Boolean
  dropDownVPType: DropDown[];
  viewMode = 'Default';
  hasOrga = false;
  vcOrga: VisboOrganisation[];
  customize: VisboSetting;
  userCustomfields: CustomUserFields[];

  visboprojectversions: VisboProjectVersion[];
  // vpvList: VisboProjectVersion[];
  vpvWithKM: number;
  vpvRefDate: Date = new Date();
  deleted = false;
  vcUser = new Map<string, VisboUser>();

  sortAscending: boolean;
  sortColumn: number;

  currentLang: string;
  viewCockpit: string;

  combinedPerm: VGPermission = undefined;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private messageService: MessageService,
    private alertService: AlertService,
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private visboprojectService: VisboProjectService,
    private visboprojectversionService: VisboProjectVersionService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;
    this.titleService.setTitle(this.translate.instant('vp.title'));

    this.log(`Init GetVisboProjects ${JSON.stringify(this.route.snapshot.queryParams)}`);
    this.vcSelected = this.route.snapshot.paramMap.get('id');
    const nextView = this.route.snapshot.queryParams['view'];
    this.viewMode = nextView || 'Default'
    const viewCockpit = this.route.snapshot.queryParams['viewCockpit'];
    this.viewCockpit = viewCockpit || 'KeyMetrics';

    this.log(`Init VP View: ${this.dropDownVPType} Cockpit ${this.viewCockpit}`);
    this.getVisboProjects(nextView == 'Deleted');
    if (this.vcSelected) {
      this.getVisboCenterUsers()
    }
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  changeView(nextView: string, filter: string = undefined): void {
    if (nextView === 'Capacity' || nextView === 'KeyMetrics' || nextView === 'ProjectBoard' || nextView === 'List') {
      this.viewCockpit = nextView;
    } else {
      this.viewCockpit = 'KeyMetrics';
    }
    this.updateUrlParam('viewCockpit', this.viewCockpit);

    if (filter) {
      this.updateUrlParam('filter', filter.trim());
    }
  }

  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPFParams();
    if (type == 'filter') {
      queryParams.filter = value;
    } else if (type == 'refDate') {
      queryParams.refDate = value;
    } else if (type == 'view') {
      queryParams.view = value != 'Default' ? value : undefined;
    } else if (type == 'viewCockpit') {
      queryParams.viewCockpit = value != 'KeyMetrics' ? value : undefined;
    }
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  
  getVisboCenterUserCustomFields(): void {
    if (this.vcActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      // check if appearance is available
      this.log(`get VC Setting Customization ${this.vcActive._id}`);
      this.visbosettingService.getVCSettingByName(this.vcActive._id, 'customfields')
        .subscribe(          
          vcsettings => {
            if (vcsettings.length > 0) {
              this.userCustomfields = vcsettings[0]?.value?.liste;
              // this.userCustomfields = this.customfields?.value?.liste;
              // this.initUserCustomfields()
            }
          },
          error => {
            if (error.status === 403) {
              const message = this.translate.instant('vpfVersion.msg.errorPermVP');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }


  getVisboProjectList(vcid: string, sysAdmin: boolean, deleted = false): void {
    this.visboprojectService.getVisboProjects(vcid, sysAdmin, deleted)
      .subscribe(
        visboprojects => {
          this.visboprojectsAll = visboprojects;
          this.updateVPProperties();
          this.filterVP();
          this.initTemplates(visboprojects);
          this.initDropDown();
          this.switchView();
          this.sortVPTable(1);
          if (vcid && this.viewMode == 'Cockpit') { this.getVisboProjectKeyMetrics(); }
        },
        error => {
          this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  getVisboProjects(deleted: boolean): void {
    this.deleted = deleted;
    if (this.vcSelected) {
      this.visbocenterService.getVisboCenter(this.vcSelected)
        .subscribe(
          visbocenters => {
            this.vcActive = visbocenters;
            this.combinedPerm = visbocenters.perm;
            this.titleService.setTitle(this.translate.instant('vp.titleName', {name: this.vcActive.name}));
            this.getVisboCenterCustomization();
            this.getVisboCenterOrga();
            this.getVisboCenterUserCustomFields();
            this.getVisboProjectList(this.vcActive._id, false, this.deleted);
          },
          error => {
            this.log(`get VC failed: error:  ${error.status} message: ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        );
    } else {
      this.vcSelected = null;
      this.vcActive = null;
      this.getVisboProjectList(null, false, deleted);
    }
  }

  filterVP(): void {
    let newVPType: number;
    if (this.deleted) {
      this.visboprojects = this.visboprojectsAll;
      return;
    }
    switch(this.viewMode) {
      case 'Portfolio':
        newVPType = 1;
        break;
      case 'Template':
        newVPType = 2;
        break;
    }
    if (newVPType !== undefined) {
      // show the specific selected type
      this.visboprojects = this.visboprojectsAll.filter(item => item.vpType == newVPType);
    } else {
      // show projects & portfolios, no templates
      this.visboprojects = this.visboprojectsAll.filter(item => item.vpType != 2);
    }
  }

  initDropDown(): void {
    this.dropDownVPType = [];
    this.dropDownVPType.push({name: this.translate.instant('vp.btn.showDefault'), id: 'Default'});
    if (this.vcSelected) {
      this.dropDownVPType.push({name: this.translate.instant('vp.btn.showCockpit'), id: 'KeyMetrics'});
    }
    this.dropDownVPType.push({name: this.translate.instant('vp.btn.showPortfolio'), id: 'Portfolio'});
    if (this.hasVCPerm(this.permVC.Modify + this.permVC.CreateVP)) {
      this.dropDownVPType.push({name: this.translate.instant('vp.btn.showTemplate'), id: 'Template'});
    }
    if (this.hasVPPerm(this.permVP.DeleteVP)) {
      this.dropDownVPType.push({name: this.translate.instant('vp.btn.showDeleted'), id: 'Deleted'});
    }
  }

  getVPManager(vp: VisboProject, withEmail = true): string {
    let fullName = '';
    if (vp.managerId) {
      const user = this.vcUser.get(vp.managerId);
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

  getVPStatus(vp: VisboProject): string {
    if (vp?.vpType != 0) {
      return '';
    }
    let status = vp?.vpStatus
    if (!status) status = 'initialized';
    return this.translate.instant('vpStatus.' + status)
  }

  switchView(): void {
    if (!this.dropDownVPType) {
      return;
    }
    const element = this.dropDownVPType.find(item => item.id === this.viewMode);
    this.log(`switchView to ${this.viewMode} ${element?.name}`);
    if (element) {
      this.viewMode = element.id;
    }
    if (this.viewMode == 'Deleted' && this.deleted == false) {
      this.getVisboProjects(true);
    } else if (this.viewMode != 'Deleted' && this.deleted == true) {
      this.getVisboProjects(false);
    }
    this.filterVP();
    if (this.viewMode === 'KeyMetrics' && !this.visboprojectversions) {
      this.getVisboProjectKeyMetrics();
    }
    this.updateUrlParam('view', this.viewMode);
  }

  switchTemplate(init: Boolean): void {

      let templateID: string;

      // if there are templates, then suggest the  first template in the list as the default template
      if (init) {
        templateID = this.visboprojectsAll?.filter(item => item.vpType == 2)[0]?._id;
      } else {
        templateID = this.visboprojectsAll?.filter(item => item.vpType == 2 && item._id == this.newVP.templateID)[0]?._id;
      }

      // suggest the first of next month as start of Project ...
      // const suggestedStartDate: Date = new Date();
      // suggestedStartDate.setMonth(suggestedStartDate.getMonth() + 1 );
      // suggestedStartDate.setDate(1);
      //
      // const suggestedEndDate: Date = new Date(suggestedStartDate);
      // suggestedEndDate.setFullYear(suggestedEndDate.getFullYear() + 1);

      this.newVP = {
        name: this.newVP?.name || '',
        vcid: this.vcActive?._id,
        vpType: 0,
        // startDate: suggestedStartDate,
        // endDate: suggestedEndDate,
        templateID: templateID
      };
      this.checkTemplateCost(templateID);
  }

  checkTemplateCost(templateID: string): void {
    let vpv: VisboProjectVersion;
    this.templateHasCost = false;
    if (templateID) {
      this.visboprojectversionService.getVisboProjectVersions(templateID, false, '', undefined, true)
        .subscribe(
          visboprojectversions => {
            if (visboprojectversions?.length === 0) {
              this.log(`No Template Versions`);
            } else {
              this.log(`get VPV Template: Get ${visboprojectversions[0].vpid}${visboprojectversions.length} Project Versions`);
              this.templateHasCost = this.hasCost(visboprojectversions[0]);
            }
          },
          error => {
            this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vp.msg.errorPermVC');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  hasCost(vpv: VisboProjectVersion): Boolean {
    let result = false;
    if (vpv) {
      vpv.AllPhases?.forEach(phase => {
        if (phase.AllRoles?.length > 0) {
          result = result || true;
        }
        if (phase.AllCosts?.length > 0) {
          result = result || true;
        }
      });
    }
    this.log(`hasCost: ${vpv?.vpid}: ${result}`);
    return result;
  }

  datesAreInvalid(): boolean {
    // const result = !(this.newVP.startDate < this.newVP.endDate);
    const result = !(this.newVP?.startDate && this.newVP.endDate && (visboCmpDate(this.newVP.startDate, this.newVP.endDate) < 0));
    return result;
  }

  addproject(): void {
    this.newVP.name = this.newVP.name.trim();
    this.log(`Create VP newVP: ${JSON.stringify(this.newVP)}`);
    if (!this.newVP.name) { return; }
    if (this.newVP.vpType != 1 && this.newVP.vpType != 2) { this.newVP.vpType = 0 }
    // dummy code to test additional properties find the first Template and create with start and end date

    // in newVP.templateID there comes the name of the template!!
    //const vpTemplate = this.visboprojectsAll.find(vp => (vp.vpType == 2 && vp.name == this.newVP.templateID));
    //if (vpTemplate) {
      //this.newVP.templateID = vpTemplate._id;
      // const actDate = new Date();
      // actDate.setHours(0, 0, 0, 0);
      // this.newVP.startDate = new Date(actDate);
      // actDate.setMonth(actDate.getMonth() + 14);
      // this.newVP.endDate = actDate;
      // this.newVP.bac = 600;
      // this.newVP.rac = 660;
    //}

    this.visboprojectService.addVisboProject(this.newVP).subscribe(
      vp => {
        this.visboprojects.push(vp);
        this.sortVPTable(undefined);
        const vpType = this.translate.instant('vp.type.vpType'.concat(this.newVP.vpType.toString()));
        const message = this.translate.instant('vp.msg.createSuccess', {name: vp.name, vpType: vpType});
        this.alertService.success(message, true);
        this.gotoClickedRow(vp);
      },
      error => {
        this.log(`add VP failed: error: ${error.status} messages: ${error.error.message}`);
        const vpType = this.translate.instant('vp.type.vpType'.concat(this.newVP.vpType.toString()));
        if (error.status === 403) {
          // const message = this.translate.instant('vp.msg.errorPerm', {name: name});
          const message = this.translate.instant('vp.msg.errorPerm', {name: this.newVP.name, vpType: vpType});
          this.alertService.error(message);
        } else if (error.status === 409) {
          const message = this.translate.instant('vp.msg.errorConflict', {name: this.newVP.name, vpType: vpType});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  getVisboProjectKeyMetrics(): void {
    this.log(`get VC keyMetrics ${this.vcActive.name} ${this.vcActive._id}`);

    this.visboprojectversionService.getVisboCenterProjectVersions(this.vcActive._id, this.vpvRefDate)
      .subscribe(
        visboprojectversions => {
          this.visboprojectversions = visboprojectversions;
          this.calcVPVList();
          this.log(`get VC Key metrics: Get ${visboprojectversions.length} Project Versions`);
          if (this.visboprojectversions.length === 0) {
            // this.chart = false;
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vp.msg.errorPermVC');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  calcVPVList(): void {
    if (!this.visboprojectversions?.length) { return; }
    // this.vpvList = [];
    this.vpvWithKM = 0;
    for (let i = 0; i < this.visboprojectversions.length; i++) {
      const item = this.visboprojectversions[i];
      item.vp = this.visboprojects.find(vp => vp._id == item.vpid);
      // const nextVPV = new VisboProjectVersion();
      // nextVPV.vpid = item.vpid;
      // nextVPV.name = item.name;
      // nextVPV.variantName = item.variantName;
      // nextVPV.timestamp = new Date(this.visboprojectversions[i].timestamp);
      // nextVPV.startDate = this.visboprojectversions[i].startDate;
      item.endDate = item.keyMetrics?.endDateCurrent || item.endDate;
      // nextVPV.VorlagenName = this.visboprojectversions[i].VorlagenName;
      // nextVPV.businessUnit = this.visboprojectversions[i].businessUnit;
      // nextVPV.status = this.visboprojectversions[i].status;
      this.vpvWithKM += this.visboprojectversions[i].keyMetrics ? 1 : 0;
      // this.vpvList.push(nextVPV);
    }
  }

  getVisboCenterCustomization(): void {
    if (this.vcActive && (this.combinedPerm?.vc & this.permVC.View) > 0) {
      // check if appearance is available
      this.log(`get VC Setting Customization ${this.vcActive._id}`);
      this.visbosettingService.getVCSettingByName(this.vcActive._id, 'customization')
        .subscribe(
          vcsettings => {
            if (vcsettings.length > 0) { this.customize = vcsettings[0]; }
          },
          error => {
            if (error.status === 403) {
              const message = this.translate.instant('vp.msg.errorPermVC');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    }
  }

  getVisboCenterOrga(): void {
    if (this.vcActive) {
      if (this.vcOrga == undefined || this.vcOrga.length > 0) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vcActive._id}`);
        this.visbosettingService.getVCOrganisations(this.vcActive._id, false, (new Date()).toISOString(), false, false)
          .subscribe(
            organisation => {
              this.vcOrga = organisation;
              this.hasOrga = organisation.length > 0;
            },
            error => {
              if (error.status === 403) {
                const message = this.translate.instant('vp.msg.errorPermVC');
                this.alertService.error(message);
              } else {
                this.alertService.error(getErrorMessage(error));
              }
          });
      }
    }
  }

  getVisboCenterUsers(): void {
    if (!this.vcSelected) {
      this.vcUser.clear();
      return;
    }
    this.log(`VisboCenter UserList of: ${this.vcSelected} Deleted ${this.deleted}`);
    this.visbocenterService.getVCUser(this.vcSelected, false, this.deleted)
      .subscribe(
        user => {
          user.forEach(user => this.vcUser.set(user._id, user));
          this.updateVPProperties();
          this.log(`fetched Users ${this.vcUser.size}`);
        },
        error => {
          this.log(`Get VC Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  updateVPProperties(): void {
    if (!this.visboprojectsAll || !this.vcUser) {
      return;
    }
    this.visboprojectsAll.forEach(vp => {
      vp.manager = this.vcUser.get(vp.managerId);
      if (vp.vpType == 0) {
        vp.vpStatusLocale = this.translate.instant('vpStatus.' + (vp.vpStatus || 'initialized'))
      }
    });
  }

  gotoClickedRow(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    // MS TODO: use enumerator for Type
    if (visboproject.vpType === 1) {
      this.log(`goto VPF for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpf/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    } else {
      this.log(`goto VPV for VP ${visboproject._id} Deleted ${deleted}`);
      this.router.navigate(['vpKeyMetrics/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
    }
  }

  // get the details of the project
  gotoDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  gotoVCDetail(visbocenter: VisboCenter): void {
    this.router.navigate(['vcDetail/'.concat(visbocenter._id)]);
  }

  sortVPTable(n: number): void {
    if (n !== undefined) {
      if (!this.visboprojects) {
        return;
      }
      if (n !== this.sortColumn) {
        this.sortColumn = n;
        this.sortAscending = undefined;
      }
      if (this.sortAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortAscending = (n === 1 || n === 3) ? true : false;
      } else {
        this.sortAscending = !this.sortAscending;
      }
    }
    if (this.sortColumn === 1) {
      // sort by VP Name
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.visboprojects.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });

    } else if (this.sortColumn === 3) {
      this.visboprojects.sort(function(a, b) {
        return visboCmpString(a.vc.name.toLowerCase(), b.vc.name.toLowerCase());
      });
    } else if (this.sortColumn === 4) {
      // sort by VC vpvCount (a.vpfCount || a.vpvCount)
      this.visboprojects.sort(function(a, b) {
        return (a.vpfCount || a.vpvCount) - (b.vpfCount || b.vpvCount);
      });
    } else if (this.sortColumn === 5) {
      // sort by VP vpType
      this.visboprojects.sort(function(a, b) {
        return a.vpType - b.vpType;
      });
    } else if (this.sortColumn === 6) {
      this.visboprojects.sort(function(a, b) {
        const aDate = getCustomFieldDate(a, '_PMCommit') ? new Date(getCustomFieldDate(a, '_PMCommit').value) : new Date('2001-01-01');
        const bDate = getCustomFieldDate(b, '_PMCommit') ? new Date(getCustomFieldDate(b, '_PMCommit').value) : new Date('2001-01-01');
        return visboCmpDate(aDate, bDate); });
    } else if (this.sortColumn === 7) {
      this.visboprojects.sort(function(a, b) {
        let result = visboCmpString(a.manager?.profile?.lastName.toLowerCase() || '', b.manager?.profile?.lastName.toLowerCase() || '')
          || visboCmpString(a.manager?.profile?.firstName.toLowerCase() || '', b.manager?.profile?.firstName.toLowerCase() || '')
          || visboCmpString(a.manager?.email.toLowerCase() || '', b.manager?.email.toLowerCase() || '');
        if (result == 0) {
          result = visboCmpString(b.name.toLowerCase(), a.name.toLowerCase());
        }
        return result;
      });
    } else if (this.sortColumn === 8) {
      this.visboprojects.sort(function(a, b) {
        let result = visboCmpString(b.vpStatusLocale || '', a.vpStatusLocale || '');
        if (result == 0) {
          result = visboCmpString(b.name.toLowerCase(), a.name.toLowerCase());
        }
        return result
      });
    }
    if (!this.sortAscending) {
      this.visboprojects.reverse();
    }
  }

  initTemplates(vps: VisboProject[]): void {
    this.vpTemplates = vps.filter(item => item.vpType == 2);
    if (this.vpTemplates.length > 0) {
      const vp = new VisboProject();
      delete vp._id;
      vp.name = this.translate.instant('vp.lbl.noTemplate');
      this.vpTemplates.push(vp);
    }
  }

  getCommitDate(vp: VisboProject):Date {
    if (!vp) { return undefined }
    return getCustomFieldDate(vp, '_PMCommit') ? getCustomFieldDate(vp, '_PMCommit').value : undefined;
   }

  isViewWithCommit():boolean {
    return ((this.viewMode != 'Deleted') && (this.viewMode != 'KeyMetrics') && (this.viewMode != 'Template'))
  }

  hasCommitDate():boolean {
    const index = this.visboprojects.findIndex(item => this.getCommitDate(item) != undefined )
    return (index >= 0);
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProject: ' + message);
  }
}
