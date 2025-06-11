import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboSetting, VisboOrganisation, VisboCustomUserFields } from '../_models/visbosetting';

import { VisboProject, VPVariant, VPParams, VPCustomString, VPCustomDouble, VPCustomDate,
          getCustomFieldString, addCustomFieldString, addCustomFieldDouble, getCustomFieldDouble,
          addCustomFieldDate, getCustomFieldDate, constSystemCustomName,
          constSystemVPStatus, constSystemVPStatusFrozen} from '../_models/visboproject';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboProjectVersion, VPVconnection, VPVDblFields, VPVKeyMetrics, VPVStrFields } from '../_models/visboprojectversion';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';

import { VGGroup, VGUserGroup, VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboUser } from '../_models/visbouser';
import { UserService } from '../_services/user.service';

import { getErrorMessage, visboCmpString, visboCmpDate, validateDate, convertDate,
          visboGetShortText, visboIsToday, visboGetBeginOfDay, getPreView } from '../_helpers/visbo.helper';

import {TimeLineOptions} from '../_models/_chart'
import { easeElasticOut } from 'd3';

class DropDown {
  name: string;
  variantName: string;
  vpvCount?: number;
  description?: string;
  email?: string;
  _id?: string;
}

class DropDownStatus {
  name: string;
  localName: string;
}

@Component({
  selector: 'app-visboproject-keymetrics',
  templateUrl: './visboproject-keymetrics.component.html'
})

export class VisboProjectKeyMetricsComponent implements OnInit, OnChanges {

  activeVPVs: VisboProjectVersion[];
  allVPVs: VisboProjectVersion[];
  currentUser: VisboUser;
  dropDown: DropDown[] = [];          // all variants and default variant
  dropDownIndex: number;
  vcCustomize: VisboSetting[];
  vcCustomfields: VisboSetting;
  vcEnableDisable: VisboSetting[];
  vcOrga: VisboOrganisation[];
  timeoutID: ReturnType<typeof setTimeout>;

  vpActive: VisboProject;
  vpvActive: VisboProjectVersion;
  vpvBaseline: VisboProjectVersion;
  vpvBaselineNewestTS: Date;
  variantID: string;
  variantName: string;
  newVariant: VPVariant;
  deleted = false;
  defaultVariant: string;
  pfvVariant: string;
  customURL: string;
  customPredict: string;
  customEdit: string;
  customOpenProject: string;
  calcPredict = false;
  level: number;
  reduceLevel: false;

  customVPModified: boolean;
  customVPAdd: boolean;
  customBU: string;
  dropDownBU: string[];
  customVPStatus: string;
  dropDownVPStatus: DropDownStatus[];
  customStrategicFit: number;
  customRisk: number;
  customerID: string;
  customCommit: Date;
  editCustomFieldString: VPCustomString[];
  editCustomFieldDouble: VPCustomDouble[];
  editCustomFieldDate: VPCustomDate[];
  newCustomFieldString: VPCustomString[];
  newCustomFieldDouble: VPCustomDouble[];
  
  customUserFieldDefinitions: VisboCustomUserFields[];

  newVPV: VisboProjectVersion;
  newVPVstartDate: Date;
  newVPVendDate: Date;
  newVPVscaleStartDate: Date;
  scaleCheckBox: boolean;
  scaleFactor: number;
  changeStatus: boolean;
  newVPVvariantName: string;
  OPVariant: string ='OP';
  newVPVconnection: VPVconnection={tool: '', toolID: ''};
  allVersions: boolean;

  currentView = 'KeyMetrics';
  currentViewKM = false;
  customVPToCommit = false;
  savingCostTotal = undefined;
  savingCostActual = undefined;
  deliveryCompletionActual = undefined;
  timeCompletionActual = undefined;
  savingRAC = undefined;
  refDate: Date;
  refDateStr: string;

  allViews = ['Overview', 'KeyMetrics', 'Costtype', 'Capacity', 'Cost', 'Deadline', 'Delivery', 'All'];
  delayEndDate: number;
  hasOrga = false;
  vpUser = new Map<string, VisboUser>();
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  vpManagerEmail: string;
  vpManagerList: VisboUser[];

  parentThis = this;

  viewVersions = false;
  viewAllVariants = false;
  graphDataTimeline = [];
  graphOptionsTimeline: TimeLineOptions;
  defaultOptionsTimeline: TimeLineOptions = {
      // 'chartArea':{'left':20,'top':0,width:'800','height':'100%'},
      width: '100%',
      height: 150,
      // colors:[],
      tooltip: {
        trigger: 'focus',
        isHtml: true
      },
      hAxis: {
        format: 'dd.MM',
        gridlines: {
          color: '#FFF',
          count: -1
        }
      },
      timeline: {
        showBarLabels: false
      }
      // animation: {startup: true, duration: 200}
    };

  currentLang: string;

  sortAscending = false;
  sortColumn = 1;

  combinedPerm: VGPermission;
  permVC = VGPVC;
  permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private visbosettingService: VisboSettingService,
    private userService: UserService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private sanitizer: DomSanitizer,
    private titleService: Title
  ) { }

  // The ngOnInit method is executed when the component is initialized. 
  // It:
  //    - Initializes default values
  //    - Parses query parameters
  //    - Sets up language preferences
  //    - Maps outdated URLs
  //    - Loads user and project data
  ngOnInit(): void {
    this.customVPToCommit = false;
    this.newVariant = new VPVariant();
    this.currentLang = this.translate.currentLang;
    this.variantID = this.route.snapshot.queryParams['variantID'];
    this.variantName = this.route.snapshot.queryParams['variantName'];
    this.defaultVariant = this.translate.instant('vpKeyMetric.lbl.defaultVariant');
    this.pfvVariant = this.translate.instant('vpKeyMetric.lbl.pfvVariant');
    //this.calcPredict = this.route.snapshot.queryParams['calcPredict'] ? true : false;
    let view = this.route.snapshot.queryParams['view'];
    if (!view) {
      // map old / outdated URLs to common url
      const baseUrl = this.route.snapshot.url[0]
      switch (baseUrl.toString()) {
        case 'vpViewCost': view = 'Cost'; break;
        case 'vpViewDeadlines': view = 'Deadline'; break;
        case 'vpViewDeliveries': view = 'Delivery'; break;
        case 'vpView': view = 'All'; break;
      }
    }
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (this.allViews.find(item => item === view)) {
      this.currentView = view;
    } else {
      this.currentView = this.allViews[0];
    }

    const refDate = this.route.snapshot.queryParams.refDate;
    if (refDate && validateDate(refDate, false)) {
      this.refDate = new Date(refDate);
      this.setRefDateStr(this.refDate);
    } else {
      this.setRefDateStr(new Date());
    }
    this.getVisboProject();
    this.getVisboProjectPermission();
  }

  // The ngOnChanges method is triggered whenever input-bound properties of the component change. 
  // It:
  //    - Logs the detected changes
  //    - Finds the appropriate VPV (Visbo Project Version)
  //    - Initializes custom fields for the active VP
  ngOnChanges(changes: SimpleChanges): void {
    this.log(`VP KeyMetrics Changes ${JSON.stringify(changes)}`);
    this.findVPV(new Date(this.refDate));               
    this.initCustomFields(this.vpActive);
  }

  // The onResized method handles the resizing of the component and triggers a refresh of the VPV (Visbo Project Version) over time view after a short delay.
  onResized(event: ResizedEvent): void {
    this.log('Resize');
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.viewVPVOverTime();
      this.timeoutID = undefined;
    }, 500);
  }

  // The switchViewParent method updates the current view of the component based on new parameters. 
  // It can:
  //    - Change the reference date and update the VPV (Visbo Project Version).
  //    - Switch to a new view.
  //    - Enable the Key Metrics (KM) view and set active VPVs.
  switchViewParent(newParam: VPParams): void {
    if (!newParam) return;
    if (newParam.refDate) {
      this.findVPV(new Date(newParam.refDate));
    }
    if (newParam.view) {
      this.currentView = newParam.view;
    }
    if (newParam.viewKM) {
      this.currentView = newParam.viewKM;
      this.currentViewKM = true;
      this.setActiveVPVs();
    }
  }

  // The hasVCPerm method checks if the user has a specific Visbo Company (VC) permission by performing a bitwise operation on the stored permissions.
  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  // The hasVPPerm method checks if the user has a specific Visbo Project (VP) permission by performing a bitwise operation on the stored permissions.
  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  // The getVisboProjectPermission method retrieves and processes user and group permissions for a Visbo Project based on its VPID from the URL parameters.
  getVisboProjectPermission(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboProject UserGroupPermList of: ${id} Deleted ${this.deleted}`);
    this.visboprojectService.getVPUserGroupPerm(id, false, this.deleted)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.getVisboProjectUsers();
        },
        error => {
          this.log(`Get VP Users Group Perm failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The getVisboProjectUsers method retrieves and processes the list of users associated with a Visbo Project based on its ID from the URL parameters. 
  // It also identifies project administrators and the VP manager.
  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboProject UserList of: ${id} Deleted ${this.deleted}`);
    this.visboprojectService.getVPUser(id, false, this.deleted)
      .subscribe(
        user => {
          user.forEach(user => this.vpUser.set(user._id, user));
          const admins = this.vgUsers.filter(item => item.groupType == 'VP' && item.internal && item.groupName == 'VISBO Project Admin');
          this.vpManagerList = [];
          user.forEach(item => {
            if (admins.find(admin => admin.userId == item._id)) {
              this.vpManagerList.push(item);
            }
          });
          if (this.vpActive?.managerId) {
            const user = this.vpManagerList.find(item => item._id == this.vpActive.managerId);
            this.vpManagerEmail = user?.email;
          }
          this.log(`fetched Users ${this.vpUser.size}`);
        },
        error => {
          this.log(`Get VP Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The getVPManager method retrieves the full name and email of the Visbo Project (VP) manager based on their ID.
  getVPManager(vp: VisboProject, withEmail = true): string {
    let fullName = '';
    if (vp.managerId && this.vpManagerList) {      
        const user = this.vpManagerList.find(item => item._id == vp.managerId);
        //this.vpManagerEmail = user?.email;
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

  // The getFullUserName method retrieves the full name of a user, optionally including their email. 
  // If the user is null, it attempts to find them using the stored VP Manager Email.
  getFullUserName(user: VisboUser, withEmail: boolean): string {
    let fullName = '';
    if (!user && this.vpManagerEmail) {
      user = this.vpManagerList.find(item => item.email == this.vpManagerEmail);
    }
    if (user) {
      if (user.profile) {
        fullName = ''.concat(user.profile.firstName || '', ' ', user.profile.lastName || '')
      }
      if ((!fullName || withEmail) && user.email) {
        fullName = fullName.concat(' (', user.email, ')');
      }
    } else {
      fullName = this.translate.instant('vpDetail.lbl.noManager');
    }
    return fullName;
  }

  // The getVariantInfo method generates a formatted description for a variant dropdown item, including its description and creator's email (if applicable).
  getVariantInfo(item: DropDown): string {
      const result: string[] = []
      if (item.description) { result.push(item.description); }
      if (item.variantName != this.defaultVariant) {
        result.push('(' + item.email + ')');
      }
      return result.join(' ');
  }

  // The createVPVariant method creates a new variant for an active Visbo Project (VP), ensuring that it does not already exist, and updates the UI accordingly.
  createVPVariant(): void {
    this.log(`Create Variant ${this.newVariant?.variantName}`);
    this.newVariant.variantName = (this.newVariant.variantName || '').trim();
    this.newVariant.description =  (this.newVariant.description || '').trim();
    if (!this.newVariant?.variantName) {
      // ignore empty variant
      return;
    } else if (this.vpActive.variant.find(item => item.variantName.toLowerCase() == this.newVariant.variantName.toLowerCase())) {
      this.log(`Variant does already exists ${this.newVariant?.variantName}`);
      return; 
    }
    this.visboprojectService.createVariant(this.newVariant, this.vpActive._id )
      .subscribe(
        variant => {
          // Add Variant to list
          this.vpActive.variant.push(variant);
          this.dropDownInit(variant._id);
          this.newVPVvariantName = variant.variantName;
          const message = this.translate.instant('vpDetail.msg.createVariantSuccess', {'name': variant.variantName});
          this.alertService.success(message);
        },
        error => {
          this.log(`Create Variant error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorCreateVariantPerm');
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpDetail.msg.errorVariantConflict', {'name': this.newVariant.variantName});
            this.alertService.error(message);
          } else if (error.status === 412) {
            const message = this.translate.instant('vpDetail.msg.errorVariantReserved', {'name': this.newVariant.variantName});
            this.alertService.error(message);
          } else {
            this.log(`Error during creating Variant ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The dropDownInit method initializes the variant dropdown list by ensuring 
  // that the correct variant ID and name are set and populating a list of available variants.
  dropDownInit(id:string = undefined): void {
    const dropDown: DropDown[] = []
    if (id) { this.variantID = id; }
    if (this.variantID) {
      // serach for the variant Name
      const index = this.vpActive.variant.findIndex(item => item._id.toString() === this.variantID);
      if (index >= 0) {
        this.variantName = this.vpActive.variant[index].variantName;
      } else {
        this.variantID = undefined;
      }
    } else if (this.variantName) {
      const index = this.vpActive.variant.findIndex(item => item.variantName === this.variantName);
      if (index >= 0) {
        this.variantName = this.vpActive.variant[index].variantName;
        this.variantID = this.vpActive.variant[index]._id;
      } else {
        this.variantName = undefined;
      }
    }
    // this.log(`Init Drop Down List ${this.vpActive.variant.length + 1} Variant ${this.variantID}/${this.variantName}`);
    this.dropDownIndex = undefined;
    this.vpActive.variant.forEach(variant => {
      const name = variant.variantName == 'pfv' ? this.pfvVariant : variant.variantName;
      dropDown.push(
        {
          name: name,
          variantName: variant.variantName,
          vpvCount: variant.vpvCount,
          description: variant.description,
          email: variant.email,
          _id: variant._id
        }
      );
    });
    dropDown.unshift({name: this.defaultVariant, variantName: '', vpvCount: this.vpActive.vpvCount, _id: undefined});
    this.dropDown = dropDown
  }

  // The getDropDown method retrieves information from the currently selected dropdown variant, either returning its description or formatted variant name.
  getDropDown(type: string): string {
    if (!(this.dropDownIndex >= 0 && this.dropDownIndex < this.dropDown.length)) {
      return '';
    }
    const variant = this.dropDown[this.dropDownIndex];
    if (type == 'description') {
      return variant.description;
    } else {
      if (variant.variantName == '') {
        return '';
      } else {
        return '(' + variant.variantName + ')';
      }
    }
  }

// The getDropDownList method filters and returns a list of variants from the dropdown based on:
//    User permissions
//    Variant type
//    Version availability
// Parameters:
//    type: number → Determines which variants to include:
//          0 → Include all variants.
//          1 → Exclude "pfv" (Baseline) variants.
//          2 → Include only variants created by the current user (unless permissions override this restriction).
// withVersions: boolean → If true, excludes variants with zero versions (except the default variant).
  getDropDownList(type: number, withVersions: boolean): DropDown[] {
    type = type || 0;
    const email = this.currentUser?.email;
    if (type == 2) {
      // check the permission of the user
      if (this.isPMO()) {
        type = 0;
      } else if (this.hasVPPerm(this.permVP.Modify)) {
        type = 1
      }
    }
    const result = this.dropDown?.filter(item => {
      let ok = false;
      if (type == 0) {
        ok = true;
      }
      if (type == 1 && item.variantName != 'pfv') {
        ok = true;
      }
      if (type == 2 && item.email == email) {
        ok = true;
      }
      if (ok && withVersions) {
        if (item.vpvCount == 0 && item.variantName != '') {
          ok = false;
        }
      }
      return ok;
    });
    return result;
  }

  // The findVPV method finds the most relevant Visbo Project Version (VPV) based on:
  //    A given reference date (refDate).
  //    An optional variant name (variantName).
  //    If no exact match is found, it defaults to the first available VPV.
  findVPV(refDate: Date, variantName: string = undefined): void {
    if (!variantName) variantName = '';
    let found: VisboProjectVersion;
    this.activeVPVs.forEach(vpv => {
      if (!found && vpv.variantName == variantName) { // still not found and variantName fits
        if (refDate) {
          if (visboCmpDate(refDate, vpv.timestamp) >= 0 && !found) {
            found = vpv;
          }
        } else { // no refDate specified, take the newest/first one
          found = vpv;
        }
      }
    });
    if (!found && this.activeVPVs.length > 0) {
      found = this.activeVPVs[0];
    }
    if (found) {
      this.setVpvActive(found);
      this.findBaseLine(this.vpvActive);
    }
  }

  // The switchView method switches the current view of the Visbo Project UI and optionally with the Key Metrics (KM) view.
  switchView(newView: string, withKM = false): void {
    newView = this.allViews.find(item => item === newView);
    if (!newView) { newView = this.allViews[0]; }
    this.currentView = newView;
    this.currentViewKM  = withKM;
    this.updateUrlParam('view', newView);
  }

  // The switchVariant method switches the currently active variant in the Visbo Project UI. 
  // If a reference date is provided, it updates the selected date and ensures the latest version is shown 
  // if switching between variants.
  switchVariant(name: string, refDate: Date = undefined): void {
    if (this.variantName != name) {
      // if user switches between variants the refDate gets resetted so it shows the latest version
      this.refDate = undefined;
    }
    this.log(`switch Variant ${name} refDate ${refDate}`);
    if (refDate) this.refDate = refDate;
    if (visboIsToday(this.refDate)) this.refDate = undefined;
    this.setRefDateStr(this.refDate);
    const i = this.dropDown.findIndex(item => item.variantName === name);
    if (i <= 0) { // not found or the main variant
      this.dropDownIndex = undefined;
      this.variantName = '';
      this.variantID = undefined;
    } else { // Variant Found
      this.dropDownIndex = i;
      this.variantName = this.dropDown[i].variantName;
      this.variantID = this.dropDown[i]._id;
    }
    this.updateUrlParam('variantID', this.variantID || null);
    this.setActiveVPVs();
    return;
  }

  // The isActiveVariant method checks whether a given variant is currently active.
  isActiveVariant(variantName: string): boolean {
    let result = false;
    if (this.variantName == undefined && variantName == this.defaultVariant) { result = true; }
    if (this.variantName === variantName) { result = true; }
    return result;
  }

  // The getCustomURL method constructs a custom URL for different Visbo Project actions, including editing and data retrieval. It dynamically includes:
  //      The Visbo Project ID (VPID)
  //      The Visbo Project Version ID (VPVID) (either a baseline version or the active version)
  //      An OTT (One-Time Token) parameter
  // Parameters
  //      type: string → Specifies the type of URL to generate:
  //            "edit" → Generates a URL with the "visbo-connect://edit" scheme.
  //            Other values are currently not supported (commented out code suggests future expansion for "visbo-predict://predict").
  //      ott: string → A One-Time Token to be appended to the URL.
  //      baseline: boolean → If true, appends the baseline version's ID; otherwise, appends the active version's ID.
  // Returns
  //      string: The constructed URL with the necessary parameters.
  getCustomURL(type: string, ott: string, baseline: boolean): string {
    let url: string;
    if (type == 'edit') {
      url = 'visbo-connect://'.concat(type);
    }
    // ur: 2022-12-05 prediction cancelled
    // } else {
    //   url = 'visbo-predict://predict';

    let separator = '?';
    if (this.vpActive) {
        url = url.concat(separator, 'vpid:', this.vpActive._id.toString());
        separator = '&'
    }
    if (baseline) {
      if (this.vpvBaseline) {
        url = url.concat(separator, 'vpvid:', this.vpvBaseline._id.toString());
        separator = '&'
      }
    } else {
      if (this.vpvActive) {
        url = url.concat(separator, 'vpvid:', this.vpvActive._id.toString());
        separator = '&'
      }
    }    
    if (ott) {
        url = url.concat(separator, 'ott:', ott);
        separator = '&'
    }
    this.log(`URL: ${url}`);
    return url;
  }

  // The updateUrlParam method updates a specific query parameter in the URL while preserving other existing parameters. 
  // It ensures that:
  //      Variant and view-related parameters are properly updated.
  //      The URL is replaced without adding navigation history.
  //      The reference date is retained in the query parameters.
  updateUrlParam(type: string, value: string): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    if (value === undefined) { value = null; }
    const queryParams = new VPParams();
    if (type == 'variantID') {
      queryParams.variantID = value;
      queryParams.variantName = null;
    } else if (type == 'view') {
      queryParams.view = value;
    }
    queryParams.refDate = this.refDate?.toISOString();
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  // The hasKM method checks if a specific Key Metric (KM) type exists in a given VPVKeyMetrics object. 
  // It evaluates different key metric types (e.g., Cost, Deadline, End Date, Delivery) and determines whether they contain meaningful data.
  hasKM(km: VPVKeyMetrics, type: string): boolean {
    let result = false;
    if (!km || Object.keys(km).length <= 1) {
      // in case of no keyMetric return true and try to show the values, might be they do not exist
      return true;
    }
    if (type == 'Cost') {
      result = km.costCurrentTotal > 0 || km.costBaseLastTotal > 0;
    } else if (type == 'Deadline') {
      result = km.timeCompletionCurrentTotal > 1 || km.timeCompletionBaseLastTotal > 1;
    } else if (type == 'EndDate') {
      result = km.endDateCurrent != undefined || km.endDateBaseLast != undefined;
    } else if (type === 'DeadlineDelay') {
      if (km.timeCompletionCurrentTotal > 1 || km.timeCompletionBaseLastTotal > 1) {
        result = km.timeDelayFinished !== undefined && km.timeDelayUnFinished !== undefined;
      }
    } else if (type == 'Delivery') {
      result = km.deliverableCompletionCurrentTotal > 0 || km.deliverableCompletionBaseLastTotal > 0;
    } else if (type === 'DeliveryDelay') {
      result = km.timeDelayFinished !== undefined && km.timeDelayUnFinished !== undefined;
    }
    return result;
  }

  // The getAllVersionsShort method retrieves all versions of the currently active Visbo Project (VP) and:
  //        Associates them with the active VP.
  //        Sorts them by timestamp (descending order).
  //        Identifies the baseline version (pfv).
  //        Updates the view and logs the retrieved data.
  getAllVersionsShort(): void {
    if (this.vpActive) {
      this.visboprojectversionService.getVisboProjectVersions(this.vpActive._id, this.deleted, undefined, this.calcPredict ? 2 : 1, true)
        .subscribe(
          vpv => {
            this.allVPVs = vpv;
            this.allVPVs.forEach(vpv => {vpv.vp = this.vpActive;})
            this.allVPVs.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
            this.vpvBaseline = this.allVPVs.find(item => item.variantName === 'pfv');
            if (this.vpvBaseline) {
              this.vpvBaselineNewestTS = new Date(this.vpvBaseline.timestamp);
            }
            this.switchVariant(this.variantName);
            this.viewVPVOverTime();
            this.log(`get VPV All Key metrics: Get ${vpv.length} Project Versions`);
          },
          error => {
            this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  // The addVPVtoList method adds a new Visbo Project Version (VPV) to the list of all project versions, 
  // updates the count for the corresponding variant, and initializes the VP status dropdown.
  addVPVtoList(vpv: VisboProjectVersion): void {
    this.allVPVs.unshift(vpv);
    if (this.activeVPVs?.length > 0 && this.activeVPVs[0].variantName == vpv.variantName) {
      this.activeVPVs.unshift(vpv);
    }
    this.updateVPVCount(this.vpActive, vpv.variantName, 1);
    this.initVPStatusDropDown();
  }

  // The viewVPVOverTime method processes and organizes VPV (Visbo Project Version) data over time, 
  // preparing it for visualization in a timeline graph. 
  // It filters, sorts, and structures the data to ensure proper representation of version changes over time.
  viewVPVOverTime(): void {
    let list = this.allVPVs?.filter(vpv => vpv.variantName != 'pfv');
    if (!this.viewAllVariants && this.vpvActive) {
      list = list?.filter(vpv => vpv.variantName == this.vpvActive.variantName);
    }
    if (!list) return;
    list.sort(function(a, b) {
      let result = visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase());
      if (!result) {
        result = visboCmpDate(a.timestamp, b.timestamp)
      }
      return result;
    });
    this.graphDataTimeline = [];
    const graphDataTimeline = [];
    if (!(list?.length > 0)) return;

    // process all except the last one
    let index = 0;
    let validUntil: Date, ts: Date;
    for (; index < list.length - 1; index++) {
      ts = new Date(list[index].timestamp);
      if (list[index].variantName != list[index+1].variantName) {
        validUntil = new Date();
        validUntil = visboGetBeginOfDay(validUntil, 1); // to make it visible it goes 1 day into future
      } else {
        // if (visboIsSameDay(ts, new Date(list[index + 1].timestamp))) {
        //   // skip multiple versions for same day and variant
        //   continue
        // }
        validUntil = new Date(list[index + 1].timestamp);
        const diffMinutes = (validUntil.getTime() - ts.getTime()) / 1000 / 60;
        const diffHours = diffMinutes / 60;
        if (diffHours > 48) {
          validUntil.setHours(validUntil.getHours() - 24);
        } else if (diffHours > 12) {
          validUntil.setHours(validUntil.getHours() - 6);
        } else if (diffHours > 2) {
          validUntil.setHours(validUntil.getHours() - 1);
        } else if (diffMinutes > 1) {
          validUntil.setMinutes(validUntil.getMinutes() - diffMinutes / 2);
        }
      }
      graphDataTimeline.push([
        list[index].variantName || this.defaultVariant,
        list[index].variantName,
        this.createCustomHTMLContent(list[index]),
        ts,
        validUntil
      ]);
    }
    validUntil = visboGetBeginOfDay(new Date(), 1); // to make it visible it goes 1 day into future
    graphDataTimeline.push([
      list[index].variantName || this.defaultVariant,
      list[index].variantName,
      this.createCustomHTMLContent(list[index]),
      new Date(list[index].timestamp),
      validUntil
    ]);
    graphDataTimeline.unshift([
      'variantName',
      'version',
      {type: 'string', role: 'tooltip', 'p': {'html': true}},
      'timestamp',
      'validUntil'
    ]);
    this.graphDataTimeline = graphDataTimeline;

    let rows = 1
    if (this.viewAllVariants) {
      const list = this.vpActive?.variant?.filter(variant => (variant.variantName != 'pfv' && variant.vpvCount > 0));
      rows += list.length;
    }
    this.graphOptionsTimeline = Object.assign({}, this.defaultOptionsTimeline);
    this.graphOptionsTimeline.height = 60 + 40 * rows;
  }

  // The createCustomHTMLContent method generates an HTML tooltip for a given Visbo Project Version (VPV). 
  // This tooltip includes:
  //      The variant name
  //      The formatted timestamp (date and time)
  createCustomHTMLContent(vpv: VisboProjectVersion): string {
    const strTimestamp = this.translate.instant('vpKeyMetric.lbl.timestamp');
    const ts = new Date(vpv.timestamp);
    const tsDate = convertDate(ts, 'fullDate', this.currentLang);
    const tsTime = ts.toLocaleTimeString();

    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + (vpv.variantName || this.defaultVariant)  + '</b></div>' + '<div>' +
      '<table>';

    result = result + '<tr>' + '<td>' + strTimestamp + ':</td>'
                    + '<td align="right"><b>' + tsDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td></td>'
                    + '<td align="right"><b>' + tsTime + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  // The timelineSelectRow method handles the selection of a row in the timeline graph. 
  // When a user clicks on a timeline entry, it:
  //      - Extracts the variant name and reference date from the selected row.
  //      - Switches the project view to the selected variant and date.
  timelineSelectRow(row: number): void {
    // this.log(`timeline Select Row ${row} ${JSON.stringify(this.graphDataTimeline[row + 1])} `);
    let variantName = '';
    const item = this.graphDataTimeline[row + 1];
    if (item[0] != this.defaultVariant) {
      variantName = item[0];
    }
    const refDate = new Date(item[3]);
    // const validUntil = new Date(item[4]);
    this.log(`timeline Goto ${variantName} ${refDate}`);
    this.switchVariant(variantName, refDate);
  }

  // The findBaseLine method identifies the baseline version (pfv) for a given Visbo Project Version (VPV). 
  // It searches through all available VPVs and returns the most recent baseline version that was created before the specified VPV.
  findBaseLine(vpv: VisboProjectVersion): VisboProjectVersion {
    let result: VisboProjectVersion;
    if (this.allVPVs && vpv) {
      result = this.allVPVs.find(item => item.variantName == 'pfv' && visboCmpDate(item.timestamp, vpv.timestamp) == -1)
    }
    this.vpvBaseline = result;
    return result;
  }

  // The checkBaselineVersion method determines whether a given Visbo Project Version (VPV) is valid or obsolete 
  // by checking if a newer baseline version (pfv) exists.
  checkBaselineVersion(vpv: VisboProjectVersion): boolean {
    let result = true;
    if (vpv && this.allVPVs) {
      const latestVPV = this.allVPVs.find(item => item.variantName == vpv.variantName)
      if (latestVPV?._id.toString() == vpv._id.toString()) {
        // check only the latest version if a newer PFV exists
        if (this.vpvBaseline && this.vpvBaselineNewestTS && new Date(vpv.timestamp).getTime() < this.vpvBaselineNewestTS.getTime()){
            result = false
        }
      }
    }
    return result
  }

  // The getVisboProject method fetches details of a Visbo Project using its ID from the URL. 
  // Once retrieved, it:
  //      Stores the project in this.vpActive
  //      Translates custom fields
  //      Retrieves user permissions and settings
  //      Updates the page title dynamically
  //      Initializes dropdown menus
  //      Loads project versions
  //      Fetches organization-related settings
  //      Initializes custom fields
  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.log(`get VP for vpID ${id}`);
    if (id) {
      this.visboprojectService.getVisboProject(id)
        .subscribe(
          vp => {
            this.vpActive = vp;
            this.translateCustomFields(this.vpActive);               
            this.combinedPerm = vp.perm;         
            this.getVisboCenterSettings();
            this.titleService.setTitle(this.translate.instant('vpKeyMetric.titleName', {name: vp.name}));
            this.dropDownInit();
            this.getAllVersionsShort();
            // ur: 30.08.23: CustomFieldsSetting wird in initCustomFields bereits benötigt
            // this.getVisboCenterSettings();
            this.getVisboCenterOrga();
            this.initCustomFields(this.vpActive);
          },
          error => {
            this.log(`get VP failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPerm');
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
        });
    } else {
      this.gotoRoot();
    }
  }

  // The setActiveVPVs method filters and sorts all Visbo Project Versions (VPVs) for the currently selected variant and initializes relevant UI elements.
  setActiveVPVs(): void {
    const variantName = this.variantName || '';
    // MS TODO: calculate the correct variantName from name or id
    this.activeVPVs = this.allVPVs.filter(vpv => vpv.variantName == variantName);
    this.activeVPVs.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
    this.findVPV(this.refDate, variantName);
    this.initVPStatusDropDown();
  }

  // The translateCustomFields method translates the names of custom fields in a given Visbo Project (vp). 
  // It ensures that system-defined field names are properly localized, while user-defined fields retain their original names.
  translateCustomFields(vp: VisboProject): void {
    if (vp?.customFieldString) {
      vp.customFieldString.forEach(item => {
        if (constSystemCustomName.find(element => element == item.name)) {
          item.localName = this.translate.instant('customField.' + item.name);
        } else {
          item.localName = item.name;
        }
      })
    }
    if (vp?.customFieldDouble) {
      vp.customFieldDouble.forEach(item => {
        if (constSystemCustomName.find(element => element == item.name)) {
          item.localName = this.translate.instant('customField.' + item.name);
        } else {
          item.localName = item.name;
        }
      })
    }
  }

  // The initCustomFields method initializes and extracts custom field data for a given Visbo Project (VP). 
  // It processes system-defined and user-defined fields, ensuring they are correctly assigned for further use in the UI.
  initCustomFields(vp: VisboProject): void {
      this.customVPStatus = constSystemVPStatus.find(item => item == vp.vpStatus) || constSystemVPStatus[0];
      const customFieldString = getCustomFieldString(vp, '_businessUnit');
      if (customFieldString) {
        this.customBU = customFieldString.value;
      }
      let customFieldDouble = getCustomFieldDouble(vp, '_strategicFit');
      if (customFieldDouble) {
        this.customStrategicFit = customFieldDouble.value;
      }
      customFieldDouble = getCustomFieldDouble(vp, '_risk');
      if (customFieldDouble) {
        this.customRisk = customFieldDouble.value;
      }
      const customFieldDate = getCustomFieldDate(vp, '_PMCommit');
      if (customFieldDate) {
        this.customCommit = new Date(customFieldDate.value);
      }
      this.customerID = vp.kundennummer;

      // content of customfields-setting
      this.customUserFieldDefinitions = this.vcCustomfields?.value?.liste;
      
      this.editCustomFieldString = this.getCustomFieldListString(true);
      this.editCustomFieldDouble = this.getCustomFieldListDouble(true);
      this.editCustomFieldDate = this.getCustomFieldListDate(true);      
      // ur: 30.08.2023: Preparation for adding new customFields
      this.newCustomFieldString = this.checkEmptyCustomFields(vp, 0);
      this.newCustomFieldDouble = this.checkEmptyCustomFields(vp, 1);
      this.customVPModified = false;
      this.customVPAdd = false;
      this.customVPToCommit = false;
  }

  // The checkVPCustomValues method determines whether the Visbo Project's (VP) custom values require modification or addition.
  // It checks if:
  //      - The VP has modification permissions.
  //      - Required custom fields are missing or undefined.
  //      - New custom fields exist.
  checkVPCustomValues(): boolean {
    let result = false;
    if (!this.customVPAdd && !this.customVPModified && this.hasVPPerm(this.permVP.Modify)) {
      if (this.customBU == undefined || this.customStrategicFit == undefined || this.customRisk == undefined || this.newCustomFieldDouble?.length != 0 || this.newCustomFieldString.length != 0) {
      //if (this.customBU == undefined || this.customStrategicFit == undefined || this.customRisk == undefined ) {
          result = true;
      }
    }
    return result;
  }

  // The addVPCustomValues method determines whether custom values can be added to the active Visbo Project (VP). 
  // It checks:
  //      - If the user has modification permissions.
  //      - If the VP status is not frozen.
  //      - If both conditions are met, it enables editing of custom fields.
  addVPCustomValues(): void {    
    if (this.hasVPPerm(this.permVP.Modify) && !constSystemVPStatusFrozen.includes(this.vpActive.vpStatus)) {         
      this.customVPAdd = true;
    }  
    if (!this.hasVPPerm(this.permVP.Modify)) {
      this.customVPAdd = false;
    }     
    if (constSystemVPStatusFrozen.includes(this.vpActive.vpStatus)) {
      this.customVPAdd = false;
    }
  }

  setModified(): void {
    this.customVPModified = true;
  }
 
  setModifiedVPStatus(): void {
    this.customVPModified = true;
  }

  // Commit-Button pressed
  // The setVPToCommit method prepares the active Visbo Project Version (VPV) for commitment. 
  // It:
  //    - Marks the project as modified and ready to commit.
  //    - Calculates key performance metrics such as:
  //          Saving cost percentage
  //          Delivery completion rate
  //          Deadline completion rate
  //          Saving RAC percentage
  //    - Ensures all calculations handle edge cases to prevent division errors.
  setVPToCommit(): void {
     this.customVPToCommit = true;
     this.customVPModified = true;
     // Calculate Saving Cost in % of Total, limit the results to be between -100 and 100
     this.savingCostTotal = Math.round((1 - (this.vpvActive.keyMetrics.costCurrentTotal || 0)
                  / (this.vpvActive.keyMetrics.costBaseLastTotal || 1)) * 100) || 0;
     this.savingCostActual = Math.round((1 - (this.vpvActive.keyMetrics.costCurrentActual || 0)
                  / (this.vpvActive.keyMetrics.costBaseLastActual || 1)) * 100) || 0;

     // Calculate the Delivery Completion     actual
    if (!this.vpvActive.keyMetrics.deliverableCompletionBaseLastActual) {
      this.deliveryCompletionActual = 100;
    } else {
      this.deliveryCompletionActual = Math.round((this.vpvActive.keyMetrics.deliverableCompletionCurrentActual || 0)
                                                            / this.vpvActive.keyMetrics.deliverableCompletionBaseLastActual * 100);
    }
    // Calculate the Deadline Completion   actual
    if (!this.vpvActive.keyMetrics.timeCompletionBaseLastActual) {
      this.timeCompletionActual = 100;
    } else {
      this.timeCompletionActual = Math.round((this.vpvActive.keyMetrics.timeCompletionCurrentActual || 0)
                                                        / this.vpvActive.keyMetrics.timeCompletionBaseLastActual * 100);
    }
    // Calculate Saving RAC in % of Total, limit the results to be between -100 and 100
    this.savingRAC = Math.round((1 - (this.vpvActive.keyMetrics.RACCurrent || 0)
    / (this.vpvActive.keyMetrics.RACBaseLast || 1)) * 100) || 0;
  }

  // The gotoRoot method redirects the user to the root (/) of the application when a required project ID is missing. 
  // It ensures a smooth navigation experience by preventing access to incomplete or broken pages.
  gotoRoot(): void {
    this.log(`goto Root as no id is specified`);
    this.router.navigate(['/'], {});
  }

  // The getVisboCenterOrga method retrieves the organizational data for the active Visbo Project (vpActive).
  // It ensures that:
  //      - The user has the required permissions (View) to access organizational data.
  //      - The organization data is only fetched if not already available.
  //      - The response is handled properly, including error management.
  getVisboCenterOrga(): void {
    if (this.vpActive && this.hasVCPerm(this.permVC.View)) {
      if (this.vcOrga == undefined) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vpActive.vcid}`);
        this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, (new Date()).toISOString(), false, false)
          .subscribe(
            organisation => {
              this.vcOrga = organisation;
              this.hasOrga = organisation.length > 0;
            },
            error => {
              if (error.status === 403) {
                const message = this.translate.instant('vpKeyMetric.msg.errorPermOrga', {name: this.vpActive.name});
                this.alertService.error(message);
              } else {
                this.alertService.error(getErrorMessage(error));
              }
          });
      }
    }
  }

  // The getVisboCenterSettings method retrieves and processes configuration settings for the active Visbo Project (vpActive). 
  // These settings include:
  //    - Customization settings
  //    - General VC configuration (_VCConfig)
  //    - Custom fields
  //    - Editing settings (CustomEdit)
  //    - Project opening settings (CustomOpenProject)
  // It ensures that the settings are only fetched if they are not already loaded and properly processes them.
  getVisboCenterSettings(): void {
    if (this.vpActive && this.hasVCPerm(this.permVC.View)) {
      if (!this.vcCustomize) {
        // check if appearance is available
        this.log(`get VC Setting ${this.vpActive.vcid}`);
        this.visbosettingService.getVCSettingByType(this.vpActive.vcid, 'customization,_VCConfig,customfields,CustomPredict,CustomEdit,CustomOpenProject')
          .subscribe(
            vcsettings => {
              this.vcCustomize = vcsettings.filter(item => item.type == 'customization');
              this.vcEnableDisable = this.squeezeEnableDisable(vcsettings.filter(item => item.type == '_VCConfig'));
              this.vcCustomfields = vcsettings.find(item=> item.type == 'customfields');
              let customSetting = vcsettings.find(item => item.type == 'CustomPredict');
              if (customSetting) {
                this.customPredict = customSetting.name;
              }
              customSetting = vcsettings.find(item => item.type == 'CustomEdit');
              if (customSetting) {
                this.customEdit = customSetting.name;
              }
              customSetting = vcsettings.find(item => item.type == 'CustomOpenProject');
              if (customSetting) {
                this.customOpenProject = customSetting.name;
              }
              this.initBUDropDown();
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
  }

  // The squeezeEnableDisable method processes and filters Visbo Center (VC) settings to generate a compact, 
  // simplified view of enable/disable configurations for the VC Admin interface. 
  // It:
  //    - Adds new properties (VCEnabled and sysVCLimit) for easier access.
  //    - Ensures logical consistency in system limit configurations.
  //    - Filters out system-limited settings for a cleaner display.
  squeezeEnableDisable(settings: VisboSetting[]): VisboSetting[] {
    if (!settings || settings.length == 0) {
      return [];
    }
    settings.forEach(item => {
      // calculate VCEnabled and sysVCLimit for a compact view in VC Admin
      if (item.value) {
        if (item.value.systemLimit) {
          item.value.VCEnabled = item.value.systemEnabled;
          item.value.sysVCLimit = true;
        } else if (item.value.sysVCLimit) {
          item.value.VCEnabled = item.value.sysVCEnabled;
        } else {
          item.value.VCEnabled = item.value.VCEnabled ? true : false;
        }
      }
    });
    const result = settings.filter(item => item.value?.systemLimit !== true);
    return result;
  }

  // The getEnableDisable method retrieves and processes a specific enable/disable setting based on:
  //    - The name of the setting.
  //    - The level of control (system level, Visbo Center level, or general level).
  //    - Whether the function should consider system limits when determining the result.
  // It ensures that:
  //    - Settings respect system limitations when required.
  //    - The correct enable/disable flag is returned based on the selected level.
  getEnableDisable(name: string, level: number, notLimitOff: boolean): boolean {
    let result = false;
    if (this.vcEnableDisable) {
      const setting = this.vcEnableDisable.find(item => item.name == name);
      if (setting && setting.value) {
        if (level == 0) {
          if (notLimitOff) {
            result = setting.value.systemLimit && setting.value.systemEnabled == false ? false : true;
          } else {
            result = setting.value.systemEnabled == true;
          }
        } else if (level == 1) {
          if (notLimitOff) {
            result = setting.value.sysVCLimit && setting.value.sysVCEnabled == false ? false : true;
          } else {
            result = setting.value.sysVCEnabled == true;
          }
        } else {
          if (notLimitOff) {
            result = setting.value.sysVCLimit && setting.value.sysVCEnabled == false ? false : true;
          } else {
            result = setting.value.VCEnabled == true;
          }
        }
      }
    }
    return result;
  }

  // The initBUDropDown method initializes and populates the Business Unit (BU) dropdown list using customization settings stored in this.vcCustomize. 
  // It:
  //    - Extracts the business unit definitions from customization settings.
  //    - Sorts the dropdown options alphabetically if there are multiple entries.
  //    - Ensures the dropdown is properly initialized or set to undefined if no valid entries exist.
  initBUDropDown(): void {
    if (!this.vcCustomize || this.vcCustomize.length == 0) {
      return
    }
    const listBU = this.vcCustomize[0].value?.businessUnitDefinitions;
    if (!listBU) return;
    this.dropDownBU = [];
    listBU.forEach(item => {
      this.dropDownBU.push(item.name);
    });
    if (this.dropDownBU.length > 1) {
      this.dropDownBU.sort(function(a, b) { return visboCmpString(a.toLowerCase(), b.toLowerCase()); });
    } else {
      this.dropDownBU = undefined;
    }
  }

  // The initVPStatusDropDown method initializes the dropdown list for Visbo Project (VP) statuses. 
  // It ensures that:
  //    - The correct status options are available based on the project’s current state.
  //    - The status 'ordered' is included only if certain conditions are met.
  //    - The translated status names are displayed in the dropdown.
  initVPStatusDropDown(): void {
    let localVPStatus = '';
    this.dropDownVPStatus = [];
    let changeOrdered = false
    const variantPFV = this.vpActive.variant.find(item => item.variantName == 'pfv');
    if (this.vpActive.vpStatus == 'ordered' || variantPFV?.vpvCount > 0 ) {
      changeOrdered = true;
    }
    if (this.vpActive.vpvCount == 0) {
      const status = this.vpActive.vpStatus || 'initialized'
      localVPStatus = this.translate.instant('vpStatus.' + status);
      this.dropDownVPStatus.push({name: status, localName: localVPStatus});
    } else {
      constSystemVPStatus.forEach(item => {
        if (item != 'ordered' || changeOrdered) {
          localVPStatus = this.translate.instant('vpStatus.' + item);
          this.dropDownVPStatus.push({name: item, localName: localVPStatus});
        }
      })
    }
  }

  // The setVpvActive method sets the active Visbo Project Version (VPV) and updates key project
  setVpvActive(vpv: VisboProjectVersion): void {
    const keyMetrics = vpv.keyMetrics;
    let delay = 0;
    if (keyMetrics && keyMetrics.endDateCurrent && keyMetrics.endDateBaseLast) {
      delay = (new Date(keyMetrics.endDateCurrent)).getTime() - (new Date(keyMetrics.endDateBaseLast)).getTime();
    }
    this.delayEndDate = Math.round(delay / 1000 / 60 / 60 / 24) / 7;

    this.vpvActive = vpv;

    if (!this.hasKM(vpv.keyMetrics, 'EndDate')) {
      this.updateUrlParam('view', 'All');
    }
    this.findBaseLine(vpv);
    this.log(`VPV Active: vpv: ${vpv._id} ${vpv.variantName} ${vpv.timestamp}`);
  }

  // The initCustomURL method generates and initializes a custom URL for performing an action (such as editing) on a Visbo Project. 
  // It:
  //      - Requests a One-Time Token (OTT) for secure access.
  //      - Constructs the custom URL using getCustomURL().
  //      - Redirects the user to the generated URL if the action type is 'edit'.
  //      - Handles errors related to OTT retrieval.
  initCustomURL(type: string, baseline: boolean): void {
    this.customURL = undefined;
    // get the One Time Token and set the customURL after getting it
    this.userService.getUserOTT()
      .subscribe(
        ott => {
          this.customURL = this.getCustomURL(type, ott, baseline);
          if (type == 'edit') {
            // opens a new Window with the this.customURL - visbo-connect://edit?...
            window.location.href =this.customURL;
            console.log(window.location.hostname);
          }          
        },
        error => {
          if (error.status === 400) {
            const message = this.translate.instant('vpKeyMetric.msg.errorOTT');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
      });
  }

  // The gotoVPDetail method navigates the user to the detailed view of a specific Visbo Project (visboproject).
  gotoVPDetail(visboproject: VisboProject): void {
    this.router.navigate(['vpDetail/'.concat(visboproject._id)]);
  }

  // The gotoVC method navigates the user to the list of Visbo Projects of the Visbo Center (VC) associated with a given Visbo Project (visboproject).
  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  // The helperDateDiff method calculates the difference between two dates (from and to)
  // in weeks (w), days (d), or seconds. 
  // It converts the difference from milliseconds into the requested time unit.
  helperDateDiff(from: string, to: string, unit: string): number {
    const fromDate: Date = new Date(from);
    const toDate: Date = new Date(to);
    let dateDiff: number = fromDate.getTime() - toDate.getTime();
    if (unit === 'w') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24 / 7;
    } else if (unit === 'd') {
      dateDiff = dateDiff / 1000 / 60 / 60 / 24;
    } else {
      dateDiff = dateDiff / 1000;
    }
    return dateDiff;
  }

  // The getShortText method returns a shortened version of a given text by calling the helper function visboGetShortText(). 
  getShortText(text: string, len: number): string {
    return visboGetShortText(text, len);
  }

  // The getVPStatus method retrieves the localized name of the current Visbo Project (VP) status based on the selected status from the dropdown list.
  getVPStatus(): string {
    const result = this.customVPStatus ? this.dropDownVPStatus?.find(item => item.name == this.customVPStatus) : undefined;

    return result ? result.localName : undefined;
  }

  // The isPMO method determines whether the current user has Portfolio Management (PMO) privileges by checking if they have both:
  //    - Modify permissions at the Visbo Center (VC) level.
  //    - Modify permissions at the Visbo Project (VP) level.
  isPMO(): boolean {
    let result = false;
    if (this.hasVCPerm(this.permVC.Modify) && this.hasVPPerm(this.permVP.Modify)) {
      result = true;
    }
    return result;
  }

  // The isLatestVPV method determines if a given Visbo Project Version (vpv) is the latest version within its variant by:
  isLatestVPV(vpv: VisboProjectVersion): boolean {
    let result = true;
    const latestVPV = this.allVPVs.find(item => item.variantName == vpv.variantName);
    if (latestVPV) {
      result = visboCmpDate(vpv.timestamp, latestVPV.timestamp) >= 0
    }
    return result;
  }

  // The changeRefDate method updates the reference date (refDate) 
  // based on a user-inputted string (refDateStr) 
  // and then switches to the given variant for that date.
  changeRefDate(): void {
    this.log(`changeRefDate ${this.refDateStr} ${this.refDate && this.refDate.toISOString()}`);
    this.refDate = new Date(this.refDateStr);
    this.switchVariant(this.variantName, this.refDate);
  }

  // The setRefDateStr method converts a given Date object into a formatted date string (YYYY-MM-DD) while ensuring that timezone differences are accounted for. 
  // If no date is provided, it defaults to the current date.
  setRefDateStr(refDate: Date): void {
    if (!refDate) refDate = new Date();
    const offset = refDate.getTimezoneOffset()
    const localDate = new Date(refDate.getTime() - (offset*60*1000))
    this.refDateStr = localDate.toISOString().substr(0, 10);
  }

  // The canModify method determines whether the user has permission to modify the currently active Visbo Project (VP). 
  // It checks:
  //    - If the VPV is the latest version.
  //    - If the user has modification permissions for the vp
  //    - If the user can create a variant and modify within it.
  canModify(): boolean {
    let result = false;
    let allowedVariants: DropDown[];
    let variantName = '';
    if (this.dropDown && this.dropDownIndex > 0) {
      variantName = this.dropDown[this.dropDownIndex]?.variantName
    }
    if (!this.isLatestVPV(this.vpvActive)) {
      return false;
    }
    if (this.hasVPPerm(this.permVP.Modify)) {
      result = true;
    } else if (this.hasVPPerm(this.permVP.CreateVariant)) {
      // check if user can copy to a variant
      allowedVariants = this.getDropDownList(2, false);
      return allowedVariants.findIndex(item => item.variantName == variantName) >= 0
    }
    return result;
  }

  // The canModifyDate method determines whether the start date or end date of a Visbo Project Version (VPV) can be modified, based on:
  //    - The VPV's current status (e.g., ordered, paused, stopped, finished).
  //    - Whether actual data exists (actualDataUntil) that conflicts with the modification.
  //    - If the date is in the past and the project has certain statuses.
  canModifyDate(mode: string): boolean {
    let result = true;
    if (!this.newVPV) {
      return false;
    }
    const beginMonth = new Date();
    beginMonth.setDate(1);
    beginMonth.setHours(0, 0, 0, 0);
    const startDate = new Date(this.newVPV.startDate);
    const endDate = new Date(this.newVPV.endDate);
    const actualDataUntil = this.newVPV.actualDataUntil ? new Date(this.newVPV.actualDataUntil) : undefined;

    if (mode == 'startDate') {
      // the reasons not to allow to move startdate:
      // 1. there exists an actualDataUntil, which is after newVPV.startDate
      // 2. startDate is before today and(!) newVPV.status is 'beauftragt' 
      // it have to be allowed to move the startDate even if it is in the past, because otherwise you never can initiate projects
      // which have been proposed, by the time then been rejected but now should be initiated.
      if (actualDataUntil && (startDate.getTime() < actualDataUntil.getTime())) {
        result = false;
      } 
      if (startDate.getTime() < beginMonth.getTime() && (this.newVPV.status == 'ordered')) {
        result = false;
      }      
      if (startDate.getTime() < beginMonth.getTime() && (this.newVPV.status == 'paused')) {
        result = false;
      }      
      if (startDate.getTime() < beginMonth.getTime() && (this.newVPV.status == 'stopped')) {
        result = false;
      }
      if (startDate.getTime() < beginMonth.getTime() && (this.newVPV.status == 'finished')) {
        result = false;
      }

    } else if (mode == 'endDate') {   
     
      if (endDate.getTime() < beginMonth.getTime() && this.newVPV.status == 'paused') {
        result = false;
      }
      if (endDate.getTime() < beginMonth.getTime() && this.newVPV.status == 'stopped') {
        result = false;
      }
      if (endDate.getTime() < beginMonth.getTime() && this.newVPV.status == 'finished') {
        result = false;
      }
    }
    return result;
  }


  // The canCommit method determines whether the active Visbo Project Version (VPV) can be committed by checking:
  //    - If the user has modification permissions or it belongs not to the VPV main variant
  //    - If the active VPV belongs to the main variant, the user has to have modification permissions
  //    - If the VP’s status is not one of the frozen.
  //    - If the active VPV is the latest version.
  canCommit(): boolean {
    if (!this.hasVPPerm(this.permVP.Modify) || this.vpvActive.variantName != "") {
      return false;
    }
    if (constSystemVPStatusFrozen.includes(this.vpActive.vpStatus)) {
      return false;
    }
    if (!this.isLatestVPV(this.vpvActive)) {
      return false;
    }
    return true;
  }

  // The canModifyVPProperties method determines whether the properties of the active Visbo Project (VP) can be modified based on its status. 
  // It ensures that:
  // If the VP's status is a frozen one, modification is not allowed.
  // Otherwise, modification is permitted.
  canModifyVPProperties(): boolean {
    if (constSystemVPStatusFrozen.includes(this.vpActive.vpStatus)) {
      return false;
    }
    return true;
  }

  // The canChangeVPDetails method determines whether a user has permission to modify details of a Visbo Project (VP) based on the following conditions:
  //    - User has the Modify permission for VP.
  //    - If checkPMO is true, the user must be part of the PMO.
  //    - If the user is not in the PMO, VP properties must be modifiable.
  canChangeVPDetails(checkPMO = false): boolean {
    let result = true;
    if (!this.hasVPPerm(this.permVP.Modify)) {
      result = false;
    } else if (checkPMO && !this.isPMO()) {
      result = false;
    } else if (!this.isPMO() && !this.canModifyVPProperties()) {
      result = false;
    }
    return result;
  }

  // The canCopyVersion method determines whether the user is allowed to copy a Visbo Project Version (VPV) 
  // based on the status of the Visbo Project (VP). 
  // It ensures that:
  //    - If the VP's status is a frozen one, copying is not allowed.
  //    - Otherwise, copying is permitted.
  canCopyVersion(): boolean {
    if (constSystemVPStatusFrozen.includes(this.vpActive.vpStatus)) {
      return false;
    }
    return true;
  }

  // The getScaleDate method returns a date value based on the given mode (Min or Max) to determine
  // the minimum or maximum scale reference date for a Visbo Project Version (VPV).
  // If no valid mode is provided, it defaults to the current date.
  getScaleDate(mode: string): Date {
    let result: Date;
    if (mode == 'Min' && this.newVPV) {
      if (this.vpvActive.actualDataUntil) {
        result = new Date(this.newVPV.actualDataUntil);
      } else {
        result = new Date(this.newVPV.startDate);
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
      }
    } else if (mode == 'Max' && this.newVPV) {
      result = new Date(this.newVPV.endDate);
      result.setDate(1);
      result.setMonth(result.getMonth() + 1)
      result.setHours(0, 0, 0, 0);
    } else {
      result = new Date();
    }
    return result;
  }

  // The initNewVPV method initializes a new Visbo Project Version (VPV) based on the given mode. 
  // It allows for:
  //    - Moving ('Move') a VPV → Adjusts the status and resets commit status.
  //    - Copying ('Copy') a VPV → Duplicates the active VPV and assigns a new variant if available.
  initNewVPV(mode: string): void {
    this.newVPV = undefined;
    if (!this.vpvActive) {
      return;
    }
    
    this.changeStatus = false;
    if (mode == 'Move') {      
      this.newVPV = this.vpvActive;        
      this.newVPV.status = this.customVPStatus;        
      this.newVPV.isCommited = false;
      this.newVPVstartDate = new Date(this.newVPV.startDate);
      this.newVPVendDate = new Date(this.newVPV.endDate);      
      this.newVPVscaleStartDate = new Date();
      this.newVPVscaleStartDate.setDate(1);
      this.newVPVscaleStartDate.setHours(0, 0, 0, 0);
      this.scaleCheckBox = false;
      this.scaleFactor = 0;

    } else if (mode == 'Copy') {
      this.newVPV = this.vpvActive;
      this.newVPV.isCommited = false;
      this.newVPV.status = this.customVPStatus;
      const list = this.getDropDownList(2, false);
      this.newVPVvariantName = list.length > 0 ? list[0].variantName : '';
    }
  }

  // The moveVPV method modifies the start and end dates of a Visbo Project Version (VPV), with the option to apply scaling adjustments. 
  // If changes are made, it updates the VPV in the database.
  //    - If the start date, end date, or scale factor changes, the VPV is updated.
  //    - If the VPV is not a Portfolio Version (pfv), it switches to the new variant.
  //    - If the VPV to be moved is a pfv, the active vpv (not pfv) will be copied to reflect changes in Key Metrics.
  moveVPV(): void {
    if (!this.newVPV) {
      return;
    }
    this.log(`Move VPV ${this.newVPV.name}/${this.newVPV.variantName}/${this.newVPV._id} to new start ${this.newVPVstartDate.toISOString()} end ${this.newVPVendDate.toISOString()}`);
    const startDate = new Date(this.newVPV.startDate);
    const endDate = new Date(this.newVPV.endDate);
    let scaleFactor = 1;
    let newVPVscaleStartDate: Date;
    if (this.scaleCheckBox) {
        if (this.newVPVscaleStartDate) { newVPVscaleStartDate = this.newVPVscaleStartDate; }
        if (this.scaleFactor) { scaleFactor = 1 + this.scaleFactor / 100; }
    }

    if (startDate.toISOString() !== this.newVPVstartDate.toISOString()
    || endDate.toISOString() !== this.newVPVendDate.toISOString()
    || scaleFactor !== 1) {
      this.visboprojectversionService.changeVisboProjectVersion(this.newVPV._id, this.newVPVstartDate, this.newVPVendDate, scaleFactor, newVPVscaleStartDate, this.newVPV.isCommited)
        .subscribe(
          vpv => {
            this.addVPVtoList(vpv);
            if (vpv.variantName != 'pfv') {
              this.switchVariant(vpv.variantName);
              const message = this.translate.instant('vpKeyMetric.msg.changeVPVSuccess', {'variantName': vpv.variantName});
              this.alertService.success(message, true);
            } else {
              // make a copy of the vpvActive to reflect the changed pfv in KeyMetrics
              this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.vpvActive.variantName)
                .subscribe(
                  vpv => {
                    this.addVPVtoList(vpv);
                    this.switchVariant(vpv.variantName);
                    const message = this.translate.instant('vpKeyMetric.msg.changePFVSuccess');
                    this.alertService.success(message, true);
                  },
                  error => {
                    this.log(`copy VPV failed: error: ${error.status} message: ${error.error.message}`);
                    if (error.status === 403) {
                      const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                      this.alertService.error(message);
                    } else {
                      this.alertService.error(getErrorMessage(error));
                    }
                  }
                );
            }
          },
          error => {
            this.log(`change VPV failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  // The copyVPV method creates a copy of the currently active Visbo Project Version (VPV) and assigns it to a new variant or level. 
  // If the VPV is a Portfolio Version (pfv), a second copy is created to update Key Metrics.
  copyVPV(): void {
    this.log(`Copy VPV ${this.vpvActive.name} Variant ${this.vpvActive.variantName || this.defaultVariant} to Variant ${this.newVPVvariantName || this.defaultVariant} level ${this.level || 'all'}`);
    this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.newVPVvariantName, this.level)
      .subscribe(
        vpv => {
          this.addVPVtoList(vpv);
          if (vpv.variantName != 'pfv') {
            // no baseline copy, just create one new version
            const message = this.translate.instant('vpKeyMetric.msg.changeVPVSuccess', {'variantName': vpv.variantName});
            this.alertService.success(message, true);
            this.switchVariant(vpv.variantName);
          } else {
            // make a copy of the vpvActive to reflect the changed pfv in KeyMetrics
            this.visboprojectversionService.copyVisboProjectVersion(this.vpvActive._id, this.vpvActive.variantName)
              .subscribe(
                vpv => {
                  this.addVPVtoList(vpv);
                  const message = this.translate.instant('vpKeyMetric.msg.changePFVSuccess');
                  this.alertService.success(message, true);
                  this.switchVariant(vpv.variantName);
                },
                error => {
                  this.log(`copy VPV failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
                    this.alertService.error(message);
                  } else {
                    this.alertService.error(getErrorMessage(error));
                  }
                }
              );
          }
        },
        error => {
          this.log(`change VPV failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The copyVPV_OP method creates a new Visbo Project Version (VPV) as a copy of the active VPV, with:
  //    - A new variant name (newVPVvariantName).
  //    - An updated timestamp.
  //    - A new connection reference (newVPVconnection).
  //    - The ID reset to ensure it's treated as a new version.
  //    - updatedAt and createdAt cleared, as they will be set upon creation.
  // After copying, the method adds the new VPV to the list and switches to the new variant.
  copyVPV_OP(): void {
    this.log(`Copy VPV ${this.vpvActive.name} Variant ${this.vpvActive.variantName || this.defaultVariant} to Variant ${this.newVPVvariantName || this.defaultVariant} level ${this.level || 'all'}`);
    
    this.vpvActive.variantName = this.newVPVvariantName;
    this.vpvActive.timestamp = new Date();
    this.vpvActive.connectedTo = this.newVPVconnection;
    this.vpvActive.updatedAt = undefined;
    this.vpvActive.createdAt = undefined;
    this.vpvActive._id = '';

    this.visboprojectversionService.addVisboProjectVersion(this.vpvActive)
    .subscribe(
      (vpv) => {
        const message = this.translate.instant('vpDetail.msg.updateProjectConnectSuccess', {'name': this.vpActive.name, 'variantName': this.vpvActive.variantName});
        this.addVPVtoList(vpv[0]);
        this.switchVariant(vpv[0].variantName);
        this.alertService.success(message, true);
      },
      error => {
        this.log(`save VPV failed: error: ${error.status} message: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': this.vpvActive.name});
          this.alertService.error(message);
        } else if (error.status === 409) {
          const message = this.translate.instant('vpDetail.msg.errorVPVConflict', {'name': this.vpvActive.name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );  
  }

  // The exportVPVtoOpenProject method exports the active Visbo Project Version (VPV) to OpenProject and, upon success:
  //    - Creates a new variant OPVariant in Visbo to track the OpenProject export.
  //    - Copies the VPV to this new variant.
  //    - If the variant already exists, it reuses the existing one and proceeds with copying the VPV.
  exportORCompareVPVtoOpenProject(): void {

    if (this.vpActive.variant.findIndex(item => item.variantName == this.OPVariant) > 0) {
      this.log(`Export VPV ${this.vpActive.name} Variant ${this.defaultVariant} to OpenProject`);
      this.visboprojectversionService.compareVPVStdAndOPToOpenProj(this.vpActive.vcid, this.vpActive._id)
        .subscribe(
          openProj => {                
                const xxx = openProj;
                if (openProj) {                  
                  const message = this.translate.instant('vpKeyMetric.msg.exportToOpenProjVPVSuccess');
                  this.alertService.success(message, true);          
                }       
          },
          error => {
            this.log(`VPV compare VPV to OpenProject failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              const message = this.translate.instant('vpKeyMetric.msg.visboOpenProjectBridgeRequired');
              this.alertService.error(message);
              //this.alertService.error(getErrorMessage(error));
            }
          }
      );   

    } else {
      this.log(`Export VPV ${this.vpActive.name} Variant ${this.defaultVariant} to OpenProject`);
      this.visboprojectversionService.exportVPVToOpenProj(this.vpActive.vcid, this.vpActive._id, "", this.level)
        .subscribe(
          openProj => {                
                const xxx = openProj;
                if (openProj) {
                  
                  const message = this.translate.instant('vpKeyMetric.msg.exportToOpenProjVPVSuccess');
                  this.alertService.success(message, true);
                  
                  // hier erzeugen einer OP - Variante
                  this.newVariant.variantName = this.OPVariant;
                  this.newVariant.email = "ute...";
                  this.newVariant.description="This Project was exported to OpenProject";
                  this.newVPVconnection.tool = 'OpenProject';
                  this.newVPVconnection.toolID = openProj.identifier;
                  
                  this.visboprojectService.createVariant(this.newVariant, this.vpActive._id )
                    .subscribe(
                      variant => {
                        // Add Variant to list
                        this.vpActive.variant.push(variant);
                        this.newVPVvariantName = variant.variantName;                      
                        this.copyVPV_OP();
                        const message = this.translate.instant('vpDetail.msg.createVariantSuccess', {'name': variant.variantName});
                        this.alertService.success(message);
                      },
                      error => {
                        this.log(`Create Variant error: ${error.error.message}`);
                        if (error.status === 403) {
                          const message = this.translate.instant('vpDetail.msg.errorCreateVariantPerm');
                          this.alertService.error(message);
                        } else if (error.status === 409) {
                          // TODO UR
                          this.newVPVvariantName = this.newVariant.variantName;                      
                          this.copyVPV_OP();
                          const message = this.translate.instant('vpDetail.msg.createVariantSuccess', {'name': this.newVariant.variantName});
                          this.alertService.success(message);
                          //const message = this.translate.instant('vpDetail.msg.errorVariantConflict', {'name': this.newVariant.variantName});
                          //this.alertService.error(message);
                          
                          //TODO UR
                        } else {
                          this.log(`Error during creating Variant ${error.error.message}`); // log to console instead
                          this.alertService.error(getErrorMessage(error));
                        }
                      }
                    );
                }       
          },
          error => {
            this.log(`VPV export to OpenProject failed: error: ${error.status} message: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {
              const message = this.translate.instant('vpKeyMetric.msg.visboOpenProjectBridgeRequired');
              this.alertService.error(message);
              //this.alertService.error(getErrorMessage(error));
            }
          }
      );      
    }

  }

  // The importVPVFromOpenProject method imports a Visbo Project Version (VPV) from OpenProject into Visbo.
  // Upon success, the imported VPV is added to the VPV list and switched to the correct variant.
  // If the import fails, an error message is displayed based on the response status.
  importVPVFromOpenProject(): void {
    this.log(`Import VPV ${this.vpActive.name} Variant ${this.OPVariant} from OpenProject`);
    this.visboprojectversionService.importVPVFromOpenProj(this.vpActive.vcid ,this.vpActive._id, "", true)
      .subscribe(
        data => { 
          if (data && (data.success == false)) {
            this.log(`VPV import from OpenProject failed: error: ${data.status} message: ${data.error.message}`);
            if (data.status === 403) {
              const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else if (data.status === 400 ) {
                const message = data.details.message;
                //const message = this.translate.instant('vpKeyMetric.msg.importVPVFromOpenProjError');
                this.alertService.error(message);            
            } else {
              const message = this.translate.instant('vpKeyMetric.msg.visboOpenProjectBridgeRequired');
              this.alertService.error(message + data.status);
              //this.alertService.error(getErrorMessage(error));
            }
          } else {
            const message = this.translate.instant('vpKeyMetric.msg.importVPVFromOpenProjSuccess');
            this.alertService.success(message, true);
            const vpv = data.vpv;
            this.addVPVtoList(vpv);
            this.switchVariant(vpv.variantName);
          }
        },    
        error => {
          this.log(`VPV import from OpenProject failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpKeyMetric.msg.errorPermVersion', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else if (error.status === 400 ) {
              const message = this.translate.instant('vpKeyMetric.msg.importVPVFromOpenProjError');
              this.alertService.error(message);            
          } else {
            const message = this.translate.instant('vpKeyMetric.msg.visboOpenProjectBridgeRequired');
            this.alertService.error(message + error.status);
          }
        }
      );
  }

  // The vpUpdate method updates the Visbo Project (vpActive) and its related Project Version (vpvActive) by:
  //    - Applying changes to project settings and custom fields.
  //    - Committing the project version if required.
  //    - Saving the changes to the VisboProject database.
  //    - Creating a new version if the VP status allows it.
  //    - Handling errors and providing success messages.
  vpUpdate(): void {
    // project settings changed?!
    if (this.vpActive && this.customVPModified) {
      // set the changed custom customfields
      if (this.customVPStatus) {
        this.vpActive.vpStatus = this.customVPStatus;
      }
      this.vpActive.kundennummer = this.customerID;
        
      const user = this.vpManagerList?.find(user => user.email == this.vpManagerEmail);
      if (user) {
        this.vpActive.managerId = user._id;
      }

      // definition of the customUserFields
      this.customUserFieldDefinitions = this.vcCustomfields?.value?.liste;
      
      let customFieldString = getCustomFieldString(this.vpActive, '_businessUnit');
      if (customFieldString && this.customBU) {
        customFieldString.value = this.customBU;
      } else if (this.customBU) {
        addCustomFieldString(this.vpActive, '_businessUnit', this.customBU);
      }
      let customFieldDouble = getCustomFieldDouble(this.vpActive, '_strategicFit');
      if (customFieldDouble && this.customStrategicFit != undefined) {
        customFieldDouble.value = this.customStrategicFit;
      } else if (this.customStrategicFit) {
        addCustomFieldDouble(this.vpActive, '_strategicFit', this.customStrategicFit);
      }
      customFieldDouble = getCustomFieldDouble(this.vpActive, '_risk');
      if (customFieldDouble && this.customRisk != undefined) {
        customFieldDouble.value = this.customRisk;
      } else if (this.customRisk) {
        addCustomFieldDouble(this.vpActive, '_risk', this.customRisk);
      }
      
      // update changed customFields
      this.vpActive.customFieldString.forEach(item => {
        if (item.type == 'VP') {
          const editField = this.editCustomFieldString.find(element => element.name == item.name);
          if (editField && editField.value) {
            item.value = editField.value;
            // save the customFieldString changes to the vpv
            const userFieldDef = this.customUserFieldDefinitions.find(elem => elem.name == item.name)
            if (userFieldDef ) {              
              const usageIndex = this.vpvActive.customStringFields.findIndex(part => part.strkey == userFieldDef.uid);
              if (usageIndex < 0) {
                const strField = new VPVStrFields();
                strField.strkey = userFieldDef.uid;
                strField.strvalue = item.value;
                this.vpvActive.customStringFields.push(strField);
              } else {
                this.vpvActive.customStringFields[usageIndex].strvalue = item.value;
              }
            }
          }
        }
      });
      this.vpActive.customFieldDouble.forEach(item => {
        if (item.type == 'VP') {
          const editField = this.editCustomFieldDouble.find(element => element.name == item.name);
          if (editField && editField.value !== null) {
            item.value = editField.value;
            // save the customFieldString changes to the vpv
            const userFieldDef = this.customUserFieldDefinitions.find(elem => elem.name == item.name)
            if (userFieldDef ) {              
              const usageIndex = this.vpvActive.customDblFields.findIndex(part => part.str == userFieldDef.uid)
              if (usageIndex < 0) {
                const dblField = new VPVDblFields();
                dblField.str = userFieldDef.uid;
                dblField.dbl = item.value;
                this.vpvActive.customDblFields.push(dblField);
              } else {
                this.vpvActive.customDblFields[usageIndex].dbl = item.value;
              }              
            }
          }
        }
      });
      // add new CustomFields of type VP        
      this.newCustomFieldDouble.forEach(item => {
        if (item.type == 'VP') {
          const newFieldDef= this.customUserFieldDefinitions.find(element => element.name == item.name);
          if (newFieldDef) {    
            const usageIndex = this.vpvActive.customDblFields.findIndex(part => part.str == newFieldDef.uid);
            if (usageIndex < 0) {        
              const dblField = new VPVDblFields();
              dblField.str = newFieldDef.uid;
              dblField.dbl = item.value;
              this.vpvActive.customDblFields.push(dblField);
            }  else {
              this.vpvActive.customDblFields[usageIndex].dbl = item.value;
            }
            customFieldDouble = getCustomFieldDouble(this.vpActive, item.name);
            if (customFieldDouble && item.value != undefined) {
              customFieldDouble.value = item.value;
              customFieldDouble.localName = newFieldDef.name;
              customFieldDouble.type = item.type;
            } else if (item.value) {
              addCustomFieldDouble(this.vpActive, item.name, item.value);
            }
          }
        }     
      });
      

      this.newCustomFieldString.forEach(item => {
        if (item.type == 'VP') {
          const newFieldDef= this.customUserFieldDefinitions.find(element => element.name == item.name);
          if (newFieldDef) { 
            const usageIndex = this.vpvActive.customStringFields.findIndex(part => part.strkey == newFieldDef.uid);
            if (usageIndex < 0) {            
              const strField = new VPVStrFields();
              strField.strkey = newFieldDef.uid;
              strField.strvalue = item.value;
              this.vpvActive.customStringFields.push(strField); 
            } else {
              this.vpvActive.customStringFields[usageIndex].strvalue = item.value;
            }
            customFieldString = getCustomFieldString(this.vpActive, item.name);
            if (customFieldString && item.value != undefined) {
              customFieldString.value = item.value;
              customFieldString.localName = newFieldDef.name;
              customFieldString.type = item.type;
            } else if (item.value) {
              addCustomFieldString(this.vpActive, item.name, item.value);
            }
          }  
        }
      });

    // project version commited
    if (this.vpActive && this.customVPToCommit) {
      this.customCommit = new Date();
      const customFieldDate = getCustomFieldDate(this.vpActive, '_PMCommit');
      if (customFieldDate && this.customCommit != undefined) {
        customFieldDate.value = this.customCommit;
      } else if (this.customCommit) {
        addCustomFieldDate(this.vpActive, '_PMCommit', this.customCommit);
      }     
    }

    if (!this.customVPToCommit) {
      this.log(`update VP  ${this.vpActive._id} bu: ${this.customBU},  strategic fit: ${this.customStrategicFit}, risk: ${this.customRisk}, vpStatus: ${this.customVPStatus}`);
    } else {
      this.log(`update VP  ${this.vpActive._id} commit: ${this.customCommit}`);
    }

    if (this.customCommit && this.customVPToCommit) {
      this.vpvActive.isCommited = true;
    } else {
      this.vpvActive.isCommited = false;
    }

    this.visboprojectService.updateVisboProject(this.vpActive)
      .subscribe(       
        (vp) => { 
          const message = this.translate.instant('vpDetail.msg.updateProjectSuccess', {'name': this.vpActive.name});
          this.alertService.success(message, true);                   
          this.vpActive = vp;

          // only write new vpv, if the vpStatus is initialized or proposed or ordered
          if (this.vpActive.vpStatus == constSystemVPStatus[0] || this.vpActive.vpStatus == constSystemVPStatus[1] || this.vpActive.vpStatus == constSystemVPStatus[2]) {
            this.vpvActive.vp = vp;
            this.vpvActive.timestamp = new Date();
            this.visboprojectversionService.addVisboProjectVersion(this.vpvActive)
              .subscribe(
                (vpv) => {
                  const message = this.translate.instant('vpDetail.msg.updateProjectSuccess', {'name': this.vpActive.name});
                  this.vpvActive = vpv[0];
                  this.addVPVtoList(vpv[0]);
                  this.switchVariant(vpv[0].variantName);
                  this.alertService.success(message, true);
                },
                error => {
                  this.log(`save VPV failed: error: ${error.status} message: ${error.error.message}`);
                  if (error.status === 403) {
                    const message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': this.vpvActive.name});
                    this.alertService.error(message);
                  } else if (error.status === 409) {
                    const message = this.translate.instant('vpDetail.msg.errorVPVConflict', {'name': this.vpvActive.name});
                    this.alertService.error(message);
                  } else {
                    this.alertService.error(getErrorMessage(error));
                  }
                }
              )
          }
        },
        error => {
          this.log(`save VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            if (this.vpActive.kundennummer == "") {
              const message = this.translate.instant('vpDetail.msg.errorVPConflict', {'name': this.vpActive.name});
              this.alertService.error(message);
            } else {    
              const message = error.error.message;          
              //const message = this.translate.instant('vpDetail.msg.errorVPCustIDConflict', {'name': this.visboproject.name, 'kundennummer': this.visboproject.kundennummer});
              this.alertService.error(message);
            }
          } else {
          // } else if (error.status === 409) {
          //   if (this.vpActive.kundennummer == "") {
          //     const message = this.translate.instant('vpDetail.msg.errorVPConflict', {'name': this.vpActive.name});
          //     this.alertService.error(message);
          //   } else {              
          //     const message = this.translate.instant('vpDetail.msg.errorVPCustIDConflict', {'name': this.vpActive.name, 'kundennummer': this.customerID });
          //     this.alertService.error(message);
          //     this.customerID = "";
          //   }
          // } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
    );
  }
}

// The updateVPVCount method updates the VPV (Visbo Project Version) count for a given Visbo Project (vp).
// It modifies either:
//    - A specific variant's VPV count (if variantName is provided).
//    - The overall VPV count (if variantName is not provided).
// After updating, it reinitializes the dropdown menu to reflect changes.
  updateVPVCount(vp: VisboProject, variantName: string, count: number): void {
    if (vp) {
      if (variantName) {
        const variant = vp.variant.find(item => item.variantName === variantName );
        if (variant) {
          variant.vpvCount += (count || 0);
        }
      } else {
        vp.vpvCount += (count || 0);
      }
      this.dropDownInit();
    }
  }

  // The hasVariantChange method checks whether the currently active Visbo Project Version (vpvActive) has changed variants.
  // It determines if a change is needed by comparing:
  //    -  The current variant name (vpvActive.variantName) with → The new selected variant name (newVPVvariantName).
  //    -  Whether the baseline version is still valid (via checkBaselineVersion).
  hasVariantChange(): boolean {
    let result = this.vpvActive?.variantName != this.newVPVvariantName;
    if (!result && !this.checkBaselineVersion(this.vpvActive)) {
      result = true;
    }
    return result;
  }

  // The switchCopyVariant method updates the selected variant name (newVPVvariantName) when a user selects a new variant from a dropdown.
  switchCopyVariant(item: DropDown): void {
    this.newVPVvariantName = item?.variantName;
  }

  // The updateScaleFactor method sets changeStatus to true if the scaleFactor is not zero.
  // This indicates that a scaling change has been applied.
  updateScaleFactor(): void {
    if (this.scaleFactor != 0) {
      this.changeStatus = true;
    }
  }

  // The getVariantName method retrieves a variant's name based on its identifier (variantName).
  getVariantName(variantName: string, all = false): string {
    let result = '';
    if (all) {
      const vpVariant = this.vpActive?.variant?.find(item => item.variantName == variantName);
      result = vpVariant?.variantName || '';
    } else {
      const variant = this.dropDown.find(item => item.variantName == variantName);
      result = variant?.name || '';
    }
    if (result == '') result = this.defaultVariant;
    return result;
  }

  // The updateDateRange method validates and checks if the date range for a Visbo Project Version (VPV) has changed.
  // It sets changeStatus = true if:
  //    - The start and end dates are valid.
  //    - The start date is before the end date.
  //    - Either the start or end date has changed.
  // If no change is detected, changeStatus remains false.
  updateDateRange(): void {
    // this.log(`Update Date Range ${this.newVPVstartDate} ${this.newVPVendDate}`);
    let result = true;
    if (!this.newVPV || !this.newVPV.startDate) {
      this.log(`no VPV Active`);
      result = false;
    } else if (!this.newVPVstartDate || !this.newVPVendDate) {
      this.log(`Dates Empty ${this.newVPVstartDate} ${this.newVPVendDate}`);
      result = false;
    } else if (this.newVPVstartDate.getTime() >= this.newVPVendDate.getTime()) {
      this.log(`Dates start later end ${this.newVPVstartDate} ${this.newVPVendDate}`);
      result = false;
    } else if (this.newVPVstartDate.toISOString() == (new Date(this.newVPV.startDate)).toISOString()) {
      // no change regarding start, verify if end Date has changed
      if (this.newVPVendDate.toISOString() == (new Date(this.newVPV.endDate)).toISOString()) {
        result = false;
      }
    }
    this.changeStatus = result;
  }

  // The parseDate method converts a date string into a JavaScript Date object.
  // It ensures that the time component is set to midnight (00:00:00.000) for consistency.
  parseDate(dateString: string): Date {
     if (dateString) {
       const actDate = new Date(dateString);
       actDate.setHours(0, 0, 0, 0);
       return actDate;
    }
    return null;
  }

  // The getVPType method retrieves a localized name for a given Visbo Project (VP) type.
  // It utilizes a translation service to return the human-readable VP type name.
  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  // The getCustomFieldListString method retrieves a filtered list of custom string fields
  // from an active Visbo Project (vpActive). It optionally filters the fields by type.
  getCustomFieldListString(vpOnly = true): VPCustomString[] {
    let list: VPCustomString[] = [];
    this.editCustomFieldString = [];
    if (vpOnly) {
      list = this.vpActive?.customFieldString?.filter(item => item.type == 'VP');
    } else {
      list = this.vpActive?.customFieldString;
    }
    list?.forEach(item => {
      const fieldString = new VPCustomString();
      const hCFString = this.customUserFieldDefinitions?.findIndex(elem => (item.name == elem.name) && ( elem.type == '0') );         
          if (hCFString > -1 ) {
            fieldString.name = item.name;
            fieldString.type = item.type;
            fieldString.value = item.value;
            this.editCustomFieldString.push(fieldString);
          }      
    });
    return this.editCustomFieldString;
  }
  
  // The getCustomFieldListDouble method retrieves a filtered list of custom numerical (double) fields
  // from an active Visbo Project (vpActive). It optionally filters the fields by type.
  getCustomFieldListDouble(vpOnly = true): VPCustomDouble[] {
    let list: VPCustomDouble[] = [];
    this.editCustomFieldDouble = [];
    if (vpOnly) {
      list = this.vpActive?.customFieldDouble?.filter(item => item.type == 'VP');
    } else {
      list = this.vpActive?.customFieldDouble;
    }
    list?.forEach(item => {
      const fieldString = new VPCustomDouble(); 
      const hCFDouble = this.customUserFieldDefinitions?.findIndex(elem => (item.name == elem.name) && ( elem.type == '1') );         
      if (hCFDouble > -1 ) {
        fieldString.name = item.name;
        fieldString.type = item.type;
        fieldString.value = item.value;
        this.editCustomFieldDouble.push(fieldString);
      }      
    });
    return this.editCustomFieldDouble;
  }

  // The getCustomFieldListDate method retrieves a filtered list of custom date fields
  // from an active Visbo Project (vpActive). It optionally filters the fields by type.
  getCustomFieldListDate(vpOnly = true): VPCustomDate[] {
    let list: VPCustomDate[] = [];
    this.editCustomFieldDate = [];
    if (vpOnly) {
      list = this.vpActive?.customFieldDate?.filter(item => item.type == 'VP');
    } else {
      list = this.vpActive?.customFieldDate;
    }
    list?.forEach(item => {
      const fieldDate = new VPCustomDate();
      fieldDate.name = item.name;
      fieldDate.type = item.type;
      fieldDate.value = item.value;
      this.editCustomFieldDate.push(fieldDate);
    });
    return this.editCustomFieldDate;
  }

  // The checkEmptyCustomFields method identifies missing custom fields in a Visbo Project (vp).
  // It checks string (type 0) and numerical (type 1) custom fields and returns a list of fields
  // that are defined in customUserFieldDefinitions but missing in vp.
  checkEmptyCustomFields(vp:VisboProject, cfType: number):any {
    let result: any = undefined;
    let cfStr: VPCustomString[] = [];
    let cfDbl: VPCustomDouble[] = [];
    //let cfDate: VPCustomDate[];
    if (cfType == 0) {
      this.customUserFieldDefinitions?.forEach(element => {
        if (element.type == '0') {      
          const hCFString = vp.customFieldString?.findIndex(item => item.name == element.name );         
          if (hCFString == -1 ) {
            const hcf = new VPCustomString();
            hcf.name = element.name;
            hcf.type = 'VP';
            hcf.value = '';
            hcf.localName = element.name;
            cfStr.push(hcf);                  
          }
        }
      });
      result = cfStr;
    }

    if (cfType == 1) {
      this.customUserFieldDefinitions?.forEach(element => {
        if (element.type == '1') {
          const hCFDouble = vp.customFieldDouble?.findIndex(item => item.name == element.name );         
          if (hCFDouble == -1 ) { 
            const hcf = new VPCustomDouble();
            hcf.name = element.name;
            hcf.type = 'VP';
            hcf.value = 0;
            hcf.localName = element.name;
            cfDbl.push(hcf);               
          } 
        }      
      });
      result = cfDbl;
    } 
    return result;
  } 

  // The getTimestampTooltip method generates a tooltip text that displays the timestamp of a
  // Visbo Project Version (vpv). If available, it also includes the baseline date.
  getTimestampTooltip(vpv: VisboProjectVersion): string {
    if (!vpv) return '';
    let title = this.translate.instant('vpKeyMetric.lbl.plan')
              + ': '
              + this.datePipe.transform(vpv.timestamp, 'dd.MM.yy HH:mm');
    if (vpv.keyMetrics && vpv.keyMetrics.baselineDate) {
      title = title
            + ', ' + this.translate.instant('vpKeyMetric.lbl.pfvVariant')
            + ': '
            + this.datePipe.transform(vpv.keyMetrics.baselineDate, 'dd.MM.yy HH:mm');
    }
    return title;
  }

  // The getMonthEnd method calculates the last moment of a given month based on the provided date.
  // It does this by:
  //    - Moving to the first day of the next month.
  //    - Subtracting one second to return the last second of the current month.
  getMonthEnd(actual: Date): Date {
    const actualDate = actual ? new Date(actual) : undefined;
    if (actualDate) {
      actualDate.setMonth(actualDate.getMonth() + 1);
      actualDate.setDate(1);
      actualDate.setHours(0, 0, 0, 0);
      actualDate.setSeconds(-1);
    }
    return actualDate;
  }

  // The getPreView method calls another function named getPreView() and returns its result.
  // It acts as a wrapper method, possibly for dependency injection or abstraction.
  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectKeyMetrics: ' + message);
  }

}
