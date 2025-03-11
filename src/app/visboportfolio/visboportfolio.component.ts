import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { ResizedEvent } from 'angular-resize-event';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { AuthenticationService } from '../_services/authentication.service';

import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboProjectService } from '../_services/visboproject.service';

import { VisboUser } from '../_models/visbouser';
import { VisboProject, VPVariant, getCustomFieldDouble, getCustomFieldString, constSystemVPStatus } from '../_models/visboproject';
import { VisboProjectVersion } from '../_models/visboprojectversion';
import { VisboPortfolioVersion, VPFItem, VPFParams } from '../_models/visboportfolio';
import { VisboProjectVersionService } from '../_services/visboprojectversion.service';
import { VisboCenterService } from '../_services/visbocenter.service';

import { VGPermission, VGPVC, VGPVP } from '../_models/visbogroup';

import { getErrorMessage, visboCmpString, visboCmpDate, visboIsToday, visboGetBeginOfDay,
        convertDate, visboGetShortText, getPreView } from '../_helpers/visbo.helper';
import { VisboSetting, VisboOrganisation } from '../_models/visbosetting';

import {TimeLineOptions} from '../_models/_chart'

class CustomUserFields {
  uid: string;
  name: string;  
  type: string;
}

class DropDown {
  name: string;
  version?: number;
  variantName: string;
  description?: string;
  longDescription?: string;
  timestamp?: Date;
  email?: string;
}

class vpCheckItem {
  isChecked: boolean;
  variantName: string;
  description?: string;
  hasVariants: boolean;
  vp: VisboProject;
}

class DropDownStatus {
  name: string;
  localName: string;
}

@Component({
  selector: 'app-visboportfolio',
  templateUrl: './visboportfolio.component.html',
  styleUrls: ['./visboportfolio.component.css']
})

// 
export class VisboPortfolioVersionsComponent implements OnInit, OnChanges {

    listVPF: VisboPortfolioVersion[];
    listVPV: VisboProjectVersion[];
    listVP: VisboProject[];
    vpvCount: number;

    listVPFVariant: DropDown[] = [];
    activeVPFVariant: DropDown;
    newVPFVariant: DropDown;

    views = ['ProjectBoard', 'KeyMetric', 'KeyMetrics', 'Costtype', 'Capacity', 'List', 'Overview'];

    user: VisboUser;
    vpSelected: string;
    vpActive: VisboProject;
    vpfActive: VisboPortfolioVersion;
    vpvRefDate: Date = new Date();
    vpvRefDateStr: string;
    vpfid: string;
    deleted = false;
    timeoutID: ReturnType<typeof setTimeout>;
    initEnvironment = true;

    defaultVariant: string;
    currentLang: string;
    listCalcVPV: VisboProjectVersion[];
    switchVariantCount: number;
    switchVariant: string;
    newVariant: VPVariant;

    vpCheckListAll: vpCheckItem[] = [];
    vpCheckListFiltered: vpCheckItem[] = [];
    vpFilterIndex: number;
    vpfListFilter: string;
    filterVPStatusIndex: number;
    filterStrategicFit: number;
    filterRisk: number;
    dropDownVPStatus: DropDownStatus[];
    filterBU: string;
    dropDownBU: string[];
    userCustomfields: CustomUserFields[];

    hasOrga = false;
    vcOrga: VisboOrganisation[];
    customize: VisboSetting;
    calcPredict = false;

    pageParams = new VPFParams();
    isGlobalChecked = false;
    vcUser = new Map<string, VisboUser>();

    parentThis = this;

    viewVersions = false;
    viewAllVariants = false;
    graphDataTimeline = [];
    graphOptionsTimeline: TimeLineOptions;
    divTimelineVersions = 'divTimelineVersions';
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

    sortAscending: boolean;
    sortColumn: number;
    combinedPerm: VGPermission = undefined;
    permVC = VGPVC;
    permVP = VGPVP;

  constructor(
    private visboprojectversionService: VisboProjectVersionService,
    private visboprojectService: VisboProjectService,
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private messageService: MessageService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private router: Router,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private titleService: Title
  ) { }

  // The ngOnInit() method in the VisboPortfolioVersionsComponent:
  //    - Initializes essential properties.
  //    - Loads initial data based on URL parameters.
  //    - Sets up the user interface with the correct language, title, and data.
  //    - Ensures a smooth and predictable user experience by clearing old filters and loading the relevant project data immediately.
  // This method is a critical part of the component's lifecycle, enabling it to function correctly and provide the expected project management capabilities 
  // within the VISBO platform.
  ngOnInit(): void {
    this.currentLang = this.translate.currentLang;      // Setting the Current Language
    this.newVariant = new VPVariant();                  // Initializing New Variant Object
    this.user = this.authenticationService.getActiveUser();   // Fetching the Active User
    this.titleService.setTitle(this.translate.instant('vpfVersion.title'));         // Setting the Page Title
    this.defaultVariant = this.translate.instant('vpfVersion.lbl.defaultVariant');  // Setting the Default Variant Name
    this.log(`Init VPF with Transaltion: ${this.translate.instant('vpfVersion.title')}`); // Logging Initialization Message

    localStorage.removeItem('vpfFilter');               // Clearing Filter Settings
    // Reading Query Parameters
    const refDate = this.route.snapshot.queryParams['refDate'];
    this.calcPredict = this.route.snapshot.queryParams['calcPredict'] ? true : false;
    const nextView = this.route.snapshot.queryParams['view'] || this.views[0];
    this.vpfid = this.route.snapshot.queryParams['vpfid'] || undefined;

    // Setting the Reference Date
    this.vpvRefDate = Date.parse(refDate) > 0 ? new Date(refDate) : new Date();
    this.setRefDateStr(this.vpvRefDate);
    // Changing the View
    this.changeView(nextView, undefined, refDate ? this.vpvRefDate : undefined, this.vpfid, false);
    // Initializing Dropdown Options
    this.initVPStateDropDown();
    // Fetching Project Details
    const id = this.route.snapshot.paramMap.get('id');
    this.getVisboProject(id);
  }

  // The ngOnChanges() method:
  //    - Detects and logs changes to input properties.
  //    - Helps in debugging and understanding the component's data flow.
  //    - Provides a foundation for implementing dynamic responses to input changes in future enhancements.
  ngOnChanges(changes: SimpleChanges): void {
    this.log(`Portfolio Changes ${JSON.stringify(changes)}`);
  }

  // The onResized() method is responsible for handling resize events in the Angular component.
  // Purpose: 
  //      To handle the UI or component behavior when the window or a specific element is resized.
  // Use Case:  
  //      Useful when dynamic layout adjustments or data visualizations (like charts) need to be updated on resize.
  onResized(event: ResizedEvent): void {
    this.log('Resize');
    if (!event) { this.log('No event in Resize'); }
    if (this.timeoutID) { clearTimeout(this.timeoutID); }
    this.timeoutID = setTimeout(() => {
      this.viewVPFOverTime();
      this.timeoutID = undefined;
    }, 500);
  }

  // The initVPStateDropDown() method initializes the dropdown list for project status (VP Status) in the Visbo Portfolio management component. 
  // This dropdown allows users to filter or select different project stati within the UI.
  //    - initVPStateDropDown() is essential for dynamically creating a project status filter dropdown.
  //    - Handles translation, edge cases, and initialization of the 'All' option.
  //    - Provides a flexible and user-friendly experience for project status selection in the Visbo platform.
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

  // The getVPManager() method is designed to retrieve and format the name of the manager of a specific VisboProject. 
  // It optionally includes the manager's email address in the returned string.
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

  // The hasVPPerm() method is used to check if the current user has a specific permission for Visbo Projects (VP).
  // It uses bitwise operations to efficiently evaluate permission levels.
  hasVPPerm(perm: number): boolean {
    return (this.combinedPerm?.vp & perm) > 0;
  }

  // The hasVCPerm() method is responsible for checking if the current user has specific permissions related to Visbo Centers (VC). 
  // Similar to the hasVPPerm() method, it uses bitwise operations to determine permission status efficiently.
  hasVCPerm(perm: number): boolean {
    let result = false;
    if ((this.combinedPerm?.vc & perm) > 0) {
      result = true;
    }
    return result;
  }

  // The getVisboProject() method is responsible for fetching a specific Visbo Project by its ID and initializing various related data. 
  // It is a crucial part of loading the project state and setting up the environment for further interactions.
  //    - The getVisboProject() method is central to loading and preparing project-specific data.
  //    - It combines service calls, error handling, and UI initialization effectively.
  //    - The method ensures a responsive and user-friendly experience by managing both data and permissions seamlessly.
  getVisboProject(id): void {
    this.vpSelected = id;
    this.log(`get VP name if ID is used ${id}`);
    // Fetching the Project
    this.visboprojectService.getVisboProject(id)
      .subscribe(
        visboproject => {
          this.vpActive = visboproject;                   // The vpActive variable is set to the fetched project
          this.deleted = visboproject.deletedAt ? true : false; // Determines if the project is marked as deleted.
          this.combinedPerm = visboproject.perm;          // Stores the permissions associated with the project.
          this.titleService.setTitle(this.translate.instant('vpfVersion.titleName', {name: visboproject.name}));
          // Initializing Project Data
          this.initProjectList(this.vpActive);
          this.variantListInit();
          this.getVisboPortfolioVersions();
          // Loading Additional Data
          if (this.initEnvironment) {
            this.getVisboCenterUsers();
            this.getVisboCenterOrga();
            this.getVisboCenterCustomization();
            this.getVisboCenterUserCustomFields();
            this.initEnvironment = false;             // The initEnvironment flag prevents redundant data loading.
          }
        },
        error => {
          this.log(`get Portfolio VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVP');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
      });
  }

  // The getVisboCenterUsers() method is responsible for fetching the list of users associated with a specific Visbo Center. 
  // This is particularly important for displaying user-related data within the project management environment.
  getVisboCenterUsers(): void {
    this.log(`VisboCenter UserList of: ${this.vpActive?.vcid} Deleted ${this.deleted}`);
    if (!this.vpActive?.vcid) { return; }
    this.visbocenterService.getVCUser(this.vpActive.vcid, false, this.deleted)
      .subscribe(
        user => {
          user.forEach(user => this.vcUser.set(user._id, user));
          this.updateVPManager();
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

  // The updateVPManager() method is responsible for updating the manager information of all Visbo Projects (listVP) and the currently
  // active project (vpActive) with the user data stored in vcUser.
  // Additionally, it updates the localized status for each project.
  updateVPManager(): void {
    if (!this.listVP || !this.vcUser) {
      return;
    }
    this.listVP.forEach(vp => {
      vp.manager = this.vcUser.get(vp.managerId);
      vp.vpStatusLocale = this.translate.instant('vpStatus.' + (vp.vpStatus || 'initialized'))
    });

    this.vpActive.manager = this.vcUser.get(this.vpActive.managerId);
  }

  // The initProjectList() method initializes the list of Visbo Projects (listVP) of a specific Visbo Portfolio (vp). 
  // It fetches the relevant projects from the VisboProjectService, updates the manager details, and initializes the Visbo Portfolio Version (VPF).
  initProjectList(vp: VisboProject): void {
    this.vpfListFilter = undefined;
    if (!vp && !vp.vcid) {
      this.log("No Portfolio found");
      return;
    }
    this.visboprojectService.getVisboProjects(vp.vcid, false, false)
      .subscribe(
        visboprojects => {
          this.listVP = visboprojects;
          this.updateVPManager();
          this.initVPF();
        },
        error => {
          this.log(`get VPs failed: error:  ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  // The getVisboCenterOrga() method is responsible for fetching the organizational data related to the active Visbo Portfolio (vpActive). 
  // This data is fetched through the visbosettingService, and the method includes permission checks, logging, and error handling.
  getVisboCenterOrga(): void {
    // Ensures the current user has the necessary permissions to view the organization data.
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      if (this.vcOrga == undefined || this.vcOrga.length > 0) {
        // check if Orga is available
        this.log(`get VC Orga ${this.vpActive.vcid}`);        
        // Retrieves the organizational structure (vcOrga) related to the active Visbo Portfolio (vpActive).
        this.visbosettingService.getVCOrganisations(this.vpActive.vcid, false, (new Date()).toISOString(), false, false)
          .subscribe(
            organisation => {
              this.vcOrga = organisation;
              this.hasOrga = organisation.length > 0 && organisation[0] != null;    // Updates the hasOrga flag to indicate if a valid organization exists.// Ensures the current user has the necessary permissions to view the organization data.
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

  // The getVisboPortfolioVersions() method is responsible for retrieving all versions of a Visbo Portfolio (listVPF) of the active portfolio (vpActive). 
  // It sorts the retrieved data, manages the active portfolio version (vpfActive), and triggers additional data fetches if needed.
  getVisboPortfolioVersions(): void {
    this.log(`get Portfolio Versions ${this.vpActive.name} Perm ${JSON.stringify(this.combinedPerm)}`);
    this.visboprojectversionService.getVisboPortfolioVersions(this.vpActive._id, this.deleted)
      .subscribe(
        listVPF => {
          listVPF.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
          this.listVPF = listVPF;
          let index = -1;
          if (this.vpfActive) {
            // there is already a vpf selected in the UI
            this.vpfid = this.vpfActive._id;
            index = listVPF.findIndex(item => item._id.toString() === this.vpfActive._id);
          } else if (index < 0 && this.vpfid ) {
            // vpfid as url parameter defined
            index = listVPF.findIndex(item => item._id.toString() === this.vpfid);
          }
          if (index < 0) {
            // nothing defined -  use the latest from standard variant
            index = listVPF.findIndex(item => item.variantName === '');
          }

          if (listVPF.length > 0) {
            this.vpfActive = listVPF[index];
            this.switchVariantByName(this.vpfActive.variantName);
            this.viewVPFOverTime();
            this.getVisboPortfolioKeyMetrics();
            // this.log(`get VPF Length ${this.listVPF.length}`);
          } else if (this.hasVPPerm(this.permVP.Modify)) {
            // initiate the edit if user has permission
            document.getElementById("editVPFList").click();
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVersion', {'name': this.vpActive.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The viewVPFOverTime() method is responsible for generating the timeline visualization of portfolio versions (VisboPortfolioVersion). 
  // It constructs the graphDataTimeline array, which is then used to display a timeline chart showing the duration 
  // and sequence of each portfolio version over time.
  // The viewVPFOverTime() method effectively manages the creation of a dynamic timeline visualization for portfolio versions. 
  // It handles:
  //    - Data Filtering & Sorting.
  //    - Generating Timeline Data (graphDataTimeline).
  //    - Configuring Chart Options (graphOptionsTimeline).
  //    - Visual Consistency: Ensures versions are displayed with correct duration and tooltips.
  // This method is a critical part of providing historical and variant-specific insights to the user through the timeline chart.
  viewVPFOverTime(): void {
    let list = this.listVPF?.filter(vpv => vpv.variantName != 'pfv');
    if (!this.viewAllVariants && this.vpfActive) {
      list = list?.filter(vpv => vpv.variantName == this.vpfActive.variantName);
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
    let validUntil: Date, ts:Date;
    for (; index < list.length - 1; index++) {
      ts = new Date(list[index].timestamp);
      if (list[index].variantName != list[index+1].variantName) {
        validUntil = new Date();
        validUntil = visboGetBeginOfDay(validUntil, 1); // to make it visible it goes 1 day into future
      } else {
        // if (visboIsSameDay(new Date(list[index].timestamp), new Date(list[index + 1].timestamp))) {
        //   // skip multiple versions for same day and variant
        //   continue
        // }
        validUntil = new Date(list[index + 1].timestamp);
        const diffHours = (validUntil.getTime() - ts.getTime()) / 1000 / 60 / 60;
        if (diffHours > 48) {
          validUntil.setHours(validUntil.getHours() - 24);
        } else if (diffHours > 12) {
          validUntil.setHours(validUntil.getHours() - 6);
        } else if (diffHours > 2) {
          validUntil.setHours(validUntil.getHours() - 1);
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
      const list = this.vpActive?.variant?.filter(variant => (variant.variantName != 'pfv' && variant.vpfCount > 0));
      rows += list.length;
    }
    this.graphOptionsTimeline = Object.assign({}, this.defaultOptionsTimeline);
    this.graphOptionsTimeline.height = 60 + 40 * rows;
  }

  // The createCustomHTMLContent method is responsible for generating a custom HTML tooltip for displaying detailed information 
  // about a VisboPortfolioVersion (vpf) when the user hovers over an item in the timeline chart.
  createCustomHTMLContent(vpf: VisboPortfolioVersion): string {
    const strTimestamp = this.translate.instant('vpfVersion.lbl.timestamp');
    const ts = new Date(vpf.timestamp);
    const tsDate = convertDate(ts, 'fullDate', this.currentLang);
    const tsTime = ts.toLocaleTimeString();

    let result = '<div style="padding:5px 5px 5px 5px;color:black;width:180px;">' +
      '<div><b>' + (vpf.variantName || this.defaultVariant)  + '</b></div>' + '<div>' +
      '<table>';

    result = result + '<tr>' + '<td>' + strTimestamp + ':</td>'
                    + '<td align="right"><b>' + tsDate + '</b></td>' + '</tr>';
    result = result + '<tr>' + '<td></td>'
                    + '<td align="right"><b>' + tsTime + '</b></td>' + '</tr>';
    result = result + '</table>' + '</div>' + '</div>';
    return result;
  }

  // The timelineSelectRow method is responsible for handling the selection of a row in the timeline chart. 
  // When a user clicks on a specific timeline entry, this method extracts the relevant data and 
  // triggers the switch to the appropriate portfolio version.
  timelineSelectRow(row: number): void {
    let variantName = '';
    const item = this.graphDataTimeline[row + 1];
    if (item[0] != this.defaultVariant) {
      variantName = item[0];
    }

    const ts = new Date(item[3]);
    this.log(`timeline Goto ${variantName} ${ts}`);
    this.switchPFVersion(variantName, ts);
  }
  // The getVisboPortfolioKeyMetrics method is responsible for fetching the key metrics related to the active Visbo Portfolio Version (vpfActive). 
  // This method interacts with a service to retrieve data, processes it, and updates the relevant components of the application.
  // The getVisboPortfolioKeyMetrics method:
  //    - Retrieves key metrics for the active portfolio version.
  //    - Updates the local state with the fetched data.
  //    - Calls helper methods to process and filter this data.
  //    - Provides robust error handling and logging.
  //    - Ensures the UI is updated with the latest portfolio metrics.
  getVisboPortfolioKeyMetrics(): void {
    this.log(`get VPF keyMetrics ${this.vpfActive.name} ${this.vpfActive._id}`);

    this.visboprojectversionService.getVisboPortfolioKeyMetrics(this.vpfActive._id, this.vpvRefDate, false, this.calcPredict, this.vpActive.vcid)
      .subscribe(
        listVPV => {
          this.listVPV = listVPV;
          this.calcVPVList();
          this.initFilter(this.listVPV);
          this.log(`get VPF Key metrics: Get ${listVPV.length} Project Versions`);
          if (listVPV.length > 0) {
            this.log(`First VPV: ${listVPV[0]._id} ${listVPV[0].timestamp} ${listVPV[0].keyMetrics?.endDateCurrent} `);
          }
        },
        error => {
          this.log(`get VPVs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPermVP');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The changeRefDate method is responsible for updating the reference date (vpvRefDate) used to filter or display key metrics related to a Visbo Portfolio. 
  // This method ensures that when the reference date changes, the relevant data and the UI are updated accordingly.
  changeRefDate(): void {
    this.log(`changeRefDate ${this.vpvRefDateStr} ${this.vpvRefDate.toISOString()}`);
    this.vpvRefDate = new Date(this.vpvRefDateStr);
    this.changeView(undefined, undefined, this.vpvRefDate);
    this.getVisboPortfolioKeyMetrics();
  }

  // The getVisboCenterCustomization method is responsible for fetching the customization settings for the Visbo Center of the currently active portfolio (vpActive). 
  // These settings influence how the portfolio is displayed and configured in the user interface.
  getVisboCenterCustomization(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      // check if appearance is available
      this.log(`get VC Setting Customization ${this.vpActive.vcid}`);
      this.visbosettingService.getVCSettingByName(this.vpActive.vcid, 'customization')
        .subscribe(          
          vcsettings => {
            if (vcsettings.length > 0) {
              this.customize = vcsettings[0];
              this.initBUDropDown();
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
  // The getVisboCenterUserCustomFields method is responsible for fetching custom fields defined for users within the currently active Visbo Center. 
  // These custom fields provide additional metadata that can be used for filtering, display, or analytics in the application.
  // The getVisboCenterUserCustomFields method:
  //    - Fetches user-specific custom fields from the Visbo Center settings.
  //    - Applies permission checks before making the request.
  //    - Handles errors gracefully, providing specific feedback for permission issues.
  //    - Enables dynamic customization of the application based on these fetched fields.
  getVisboCenterUserCustomFields(): void {
    if (this.vpActive && this.combinedPerm && (this.combinedPerm.vc & this.permVC.View) > 0) {
      // check if appearance is available
      this.log(`get VC Setting Customization ${this.vpActive.vcid}`);
      this.visbosettingService.getVCSettingByName(this.vpActive.vcid, 'customfields')
        .subscribe(          
          vcsettings => {
            if (vcsettings.length > 0) {
              this.userCustomfields = vcsettings[0]?.value?.liste;
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

  initVPF(): void {
    this.switchVariantByName(this.vpfActive?.variantName || '');
    this.initFilter(this.listVPV);
    this.isGlobalChecked = false;
    this.vpCheckListAll = [];
    this.listVP?.forEach(item => {
      if (item.vpType == 0) {
        const entry = new vpCheckItem();
        const vpfMember = this.getVPFMember(item);
        if (vpfMember) {
          entry.isChecked = true;
          entry.variantName = vpfMember.variantName;
          if (entry.variantName) {
            entry.description = item.variant.find(element => element.variantName == entry.variantName).description;
          }
        } else {
          entry.isChecked = false;
          entry.variantName = '';
        }
        entry.vp = item;
        if (this.getVariants(item).length > 0) {
          entry.hasVariants = true;
        }
        this.vpCheckListAll.push(entry);
      }
    });
    this.vpCheckListAll.sort(function(a, b) {
      return visboCmpString(a.vp.name.toLowerCase(), b.vp.name.toLowerCase());
    });
    this.filterVPList();
  }

  // The initVPF and initFilter methods are crucial components of the VisboPortfolioVersionsComponent in an Angular application. 
  // These methods are responsible for initializing the view of project portfolio versions (VPF) and setting up the filtering criteria based on project attributes.
  initFilter(list: VisboProjectVersion[]): void {
    let lastValueRisk: number;
    let lastValueSF: number;
    let lastValueVPStatus: string;
    let lastValueBU: string;
    this.filterBU = undefined;
    this.filterRisk = undefined;
    this.filterStrategicFit = undefined;
    this.filterVPStatusIndex = undefined;
    if (!list || list.length < 1) {
      return;
    }
    list.forEach( item => {
      if (item.vp?.customFieldDouble) {
        if (this.filterStrategicFit === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_strategicFit');
          if (customField) {
            if ( this.filterStrategicFit == undefined && lastValueSF >= 0 && customField.value != lastValueSF) {
              this.filterStrategicFit = 0;
            }
            lastValueSF = customField.value
          }
        }
        if (this.filterRisk === undefined) {
          const customField = getCustomFieldDouble(item.vp, '_risk');
          if (customField) {
            if ( this.filterRisk == undefined && lastValueRisk >= 0 && customField.value != lastValueRisk) {
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
            if ( this.filterBU == undefined && lastValueBU && customField.value != lastValueBU) {
              this.filterBU = '';
            }
            lastValueBU = customField.value
          }
        }
      }
      const vpStatus = item.vp?.vpStatus;
      if (vpStatus) {
        if ( this.filterVPStatusIndex == undefined && lastValueVPStatus && vpStatus != lastValueVPStatus) {
          this.filterVPStatusIndex = 0;
        }
        lastValueVPStatus = vpStatus
      }
    });
  }

  // The getVariants method is a utility function in the VisboPortfolioVersionsComponent of an Angular application. 
  // It retrieves a filtered and sorted list of variants associated with a specific project (VisboProject).
  getVariants(vp: VisboProject): VPVariant[] {
    const result: VPVariant[] = [];
    if (vp && vp.variant) {
      vp.variant.forEach(item => {
        if (item.variantName != 'pfv' && item.vpvCount > 0) {
          result.push(item);
        }
      });
      result.sort(function (a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase()); });
    }
    return result;
  }

  // The getVPFVariantList method is a simple yet crucial method in the VisboPortfolioVersionsComponent of an Angular application. 
  // It filters and returns a list of available portfolio variants (VPFVariant) that have a version count greater than zero.
  getVPFVariantList(): DropDown[] {
    return this.listVPFVariant?.filter(item => item.version > 0);
  }

  // The getVariantName method is a utility function in the VisboPortfolioVersionsComponent that formats and returns the active variant's name in a specific string format. 
  // It is particularly useful for displaying the currently selected variant name within the user interface.
  getVariantName(): string {
    if (this.activeVPFVariant?.variantName) {
      return '('.concat(this.activeVPFVariant.variantName, ')');
    }
    return '';
  }

  // The getVPFMember method is designed to retrieve a specific VPFItem that corresponds to a given VisboProject. 
  // This method plays a crucial role in mapping portfolio data (VisboProject) to its associated portfolio version item (VPFItem) within the vpfActive object.
  getVPFMember(vp: VisboProject): VPFItem {
    let result: VPFItem;
    if (this.vpfActive && this.vpfActive.allItems) {
      result = this.vpfActive.allItems.find(item => item.vpid.toString() == vp._id.toString());
    }
    return result;
  }

  // The getVPDouble method is designed to retrieve a numeric value (number) from a custom field of a VisboProject. 
  // This method is particularly useful when you need to extract specific double-type custom fields by their key.
  getVPDouble(vp: VisboProject, key: string): number {
    const property = getCustomFieldDouble(vp, key);
    return property?.value;
  }

  // The globalChecked method provides a mechanism to toggle the selection state of all items in the vpCheckListFiltered array.
  // This method is often associated with a "Select All" checkbox in a user interface, allowing users
  // to quickly check or uncheck all items at once.
  globalChecked(): void {
    this.log(`Switch Global Check ${this.isGlobalChecked}`);
    this.vpCheckListFiltered.forEach(item => {
      item.isChecked = this.isGlobalChecked;
    });
  }

  // The filterKeyBoardEvent method is designed to handle keyboard events and trigger 
  // filtering of the project list. 
  // This method is particularly useful when the user types in a search or filter input field, 
  // allowing for dynamic and responsive updates to the displayed data.
  filterKeyBoardEvent(event: KeyboardEvent): void {
    if (!event) { this.log('No Keyboard Event'); }
    this.filterVPList();
  }

  // The filterVPList method is responsible for filtering the list of project versions (vpCheckListAll) based on various criteria, 
  // including text search, status, business unit, strategic fit, and risk. 
  // It then updates the vpCheckListFiltered with the filtered results.
  filterVPList(clear = false): void {
    if (clear) { this.vpfListFilter = undefined; }
    let allOn = true;
    const list = [];
    const vpfListFilter = this.vpfListFilter ? this.vpfListFilter.toLowerCase() : undefined;
    this.vpCheckListAll.forEach( item => {
      if (vpfListFilter
      && !(item.vp.name.toLowerCase().indexOf(vpfListFilter) >= 0
      || item.vp.variant.findIndex(variant => variant.variantName.toLowerCase().indexOf(vpfListFilter) >= 0) >= 0
      || this.getVPManager(item.vp, true).toLowerCase().indexOf(vpfListFilter) >= 0
      )) {
        return;
      }
      if (this.filterVPStatusIndex > 0
      && item.vp.vpStatus !== this.dropDownVPStatus[this.filterVPStatusIndex].name) {
        return;
      }
      if (this.filterBU) {
        const fieldBU = getCustomFieldString(item.vp, '_businessUnit');
        if ((fieldBU?.value || '') !== this.filterBU) {
          return;
        }
      }
      if (this.filterStrategicFit >= 0) {
        const fieldSF = getCustomFieldDouble(item.vp, '_strategicFit');
        if ((fieldSF?.value || 0) < this.filterStrategicFit) {
          return;
        }
      }
      if (this.filterRisk >= 0) {
        const fieldSF = getCustomFieldDouble(item.vp, '_risk');
        if ((fieldSF?.value || 0) < this.filterRisk) {
          return;
        }
      }
      if (!item.isChecked) { allOn = false; }
      list.push(item);
    });
    this.vpCheckListFiltered = list;
    this.isGlobalChecked = allOn;
  }

  // The filterEventVPStatus method is responsible for updating the selected status filter and applying it to the list of project versions. 
  // It is typically called when a user selects a status from a dropdown menu.
  filterEventVPStatus(index: number): void {
    if (index <= 0 || index >= this.dropDownVPStatus.length) {
      this.filterVPStatusIndex = 0;
    } else {
      this.filterVPStatusIndex = index;
    }
    this.filterVPList(true);
  }

  // The filterEventBU method is responsible for updating the filter for the "Business Unit" (BU) based on the selected index from a dropdown menu. 
  // Once the selection is made, it triggers a re-filtering of the visible project versions.
  filterEventBU(index: number): void {
    if (index <= 0 || index >= this.dropDownBU.length) {
      this.filterBU = undefined;
    } else {
      this.filterBU = this.dropDownBU[index];
    }
    this.filterVPList(true);
  }

  // The initVariantChange method is responsible for initializing the process of changing the variant of a Visbo project 
  // within the list of filtered project versions (vpCheckListFiltered). 
  // It sets up necessary variables and counts the number of projects associated with the selected variant.
  initVariantChange(index: number): void {
    this.log(`init Change Variant of VPs ${index}`);
    if (index >= 0 && index < this.vpCheckListFiltered.length) {
      const element = this.vpCheckListFiltered[index];
      this.vpFilterIndex = index;
      this.log(`Found VP ${element.vp.name} Variant Selected ${element.variantName}`);
      this.switchVariantCount = 0;
      this.switchVariant = element.variantName || '';
      if (element.variantName) {
        // count the number of projects who have this Variant
        this.vpCheckListFiltered.forEach(item => {
          if (item.vp && item.vp.variant && item.vp.variant.length > 0) {
            item.vp.variant.forEach(variant => {
              if (variant.variantName == element.variantName && variant.vpvCount > 0) {
                  this.switchVariantCount += 1;
              }
            })
          }
        });
        this.log(`Change to Variant ${element.variantName} for count ${this.switchVariantCount} VPs`);
      } else {
        // count the number of projects who have a Variant
        this.vpCheckListFiltered.forEach(item => {
          if (item.variantName) {
            this.switchVariantCount += 1;
          }
        });
        this.log(`Change to Standard for count ${this.switchVariantCount} VPs`);
      }
    }
  }

  // The initBUDropDown method is responsible for initializing and populating the dropdown list 
  // for Business Units (BU) in the Visbo Project-Portfolio Management interface.
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
  
  // The changeVPVariant method is responsible for changing the variant of Visbo Projects (VP) in the filtered list based on the selected variant. 
  // This method is a part of the Visbo Project-Portfolio Management system, allowing users to switch between project variants 
  // or reset them to the default ("Standard").
  changeVPVariant(): void {
    this.log(`Change Variant ${this.switchVariant || 'Standard'} of ${this.switchVariantCount} VPs`);
    if (this.switchVariant) {
      this.vpCheckListFiltered.forEach(item => {
        if (item.vp && item.vp.variant && item.vp.variant.length > 0) {
          item.vp.variant.forEach(variant => {
            if (variant.variantName == this.switchVariant) {
                item.variantName = this.switchVariant;
            }
          })
        }
      });
    } else {
      // reset to Standard
      this.vpCheckListFiltered.forEach(item => {
        if (item.variantName) {
          item.variantName = '';
        }
      });
    }
  }

  checkUpdateVPF(): boolean {
    let result = false;
    if (this.vpfActive
    && this.vpfActive.variantName == this.activeVPFVariant?.variantName
    && visboIsToday(new Date(this.vpfActive.timestamp))) {
      if (this.hasVPPerm(this.permVP.Modify)) {
        result = true;
      } else if (this.hasVPPerm(this.permVP.CreateVariant)
      && this.user._id == this.vpfActive.updatedFrom?.userId) {
        result = true;
      }
    }
    return result;
  }

  // The checkUpdateVPF method is a utility function used to determine whether the currently active Visbo Portfolio Version (vpfActive) 
  // can be updated by the user. The method evaluates multiple conditions including permissions, variant matching
  checkCreateVPF(): boolean {
    let result = false;
    if (this.hasVPPerm(this.permVP.Modify)) {
      result = true;
    } else if (this.hasVPPerm(this.permVP.CreateVariant)
    && this.user.email == this.newVPFVariant?.email) {
      result = true;
    }
    return result;
  }

  // The initCreateVPF method initializes the variables and state needed to create a new Visbo Portfolio Version (VPF). 
  // This method sets the active variant and ensures that all necessary objects are properly instantiated.
  initCreateVPF(): void {
    this.newVPFVariant = this.activeVPFVariant
    if (!this.newVPFVariant) {
      this.newVPFVariant = new DropDown();
      this.newVPFVariant.variantName = '';
      this.newVPFVariant.name = this.defaultVariant;
    }
    if (!this.vpfActive) {
      this.vpfActive = new VisboPortfolioVersion();
      this.vpfActive.variantName = '';
    }
  }

  // The createVPVariant method is responsible for creating a new variant of a Visbo project portfolio. 
  // It validates the input, interacts with the visboprojectService, and updates the UI accordingly.
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
          this.variantListInit(variant.variantName);
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
          } else {
            this.log(`Error during creating Variant ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The updateVPF method is responsible for updating the Visbo Portfolio Version (VPF) with the latest set of selected items and their respective variants. 
  // It constructs a new VisboPortfolioVersion object, fills it with selected data, and triggers an API call to update the portfolio version on the server.
  updateVPF(): void {
    this.log(`init VPF Item List for Update`);
    const newVPF = new VisboPortfolioVersion();
    newVPF.allItems = [new VPFItem()];
    newVPF.allItems.pop();
    let zeile = 0;
    this.vpCheckListAll.forEach(item => {
      if (item.isChecked) {
        const entry = new VPFItem();
        entry.vpid = item.vp._id;
        entry.name = item.vp.name;
        entry.variantName = item.variantName;
        entry.show = true;
        entry.zeile = ++zeile;
        newVPF.allItems.push(entry);
      }
    });
    newVPF.variantName = this.activeVPFVariant?.variantName || '';
    this.log(`update VPF List ${this.vpCheckListAll.length}`);
    newVPF._id = this.vpfActive._id;
    this.visboprojectversionService.updateVisboPortfolioVersion(this.vpActive, newVPF).subscribe(
      vpf => {
        this.log(`update VPF ${vpf.name} with ID ${vpf._id}, VPF Len ${vpf.allItems.length}`);
        const message = this.translate.instant('vpfVersion.msg.createVPFSuccess', {name: this.vpActive.name});
        this.alertService.success(message, true);
        // Update VPF List
        if (this.listVPF.findIndex(item => item._id == vpf._id) >= 0) {
          this.vpfActive = vpf;
          this.getVisboPortfolioKeyMetrics();
        }
      },
      error => {
        this.log(`add VPF failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vpfVersion.msg.errorVPFPerm', {name: name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  // The createVPF method is responsible for creating a new Visbo Portfolio Version (VPF) 
  // by gathering all selected projects, packaging them into a VisboPortfolioVersion object, and sending a request to the server to create the new version.
  createVPF(): void {
    this.log(`init VPF Item List cor CreateVPF`);
    const newVPF = new VisboPortfolioVersion();
    newVPF.allItems = [new VPFItem()];
    newVPF.allItems.pop();
    let zeile = 0;
    this.vpCheckListAll.forEach(item => {
      if (item.isChecked) {
        const entry = new VPFItem();
        entry.vpid = item.vp._id;
        entry.name = item.vp.name;
        entry.variantName = item.variantName;
        entry.show = true;
        entry.zeile = ++zeile;
        newVPF.allItems.push(entry);
      }
    });
    newVPF.variantName = this.newVPFVariant?.variantName || '';
    this.log(`create VPF List ${this.vpCheckListAll.length}`);
    this.visboprojectversionService.addVisboPortfolioVersion(this.vpActive, newVPF).subscribe(
      vpf => {
        this.log(`add VPF ${vpf.name} with ID ${vpf._id}, VPF Len ${vpf.allItems.length}`);
        const message = this.translate.instant('vpfVersion.msg.createVPFSuccess', {name: this.vpActive.name});
        this.alertService.success(message, true);
        this.incrementVPFCount(this.vpActive, vpf.variantName, 1);
        this.switchVPF(vpf);
        this.getVisboProject(this.vpActive._id);
      },
      error => {
        this.log(`add VPF failed: error: ${error.status} messages: ${error.error.message}`);
        if (error.status === 403) {
          const message = this.translate.instant('vpfVersion.msg.errorVPFPerm', {name: name});
          this.alertService.error(message);
        } else {
          this.alertService.error(getErrorMessage(error));
        }
      }
    );
  }

  // The incrementVPFCount method is responsible for updating the count of Visbo Portfolio Versions (VPF) for a given project (VisboProject). 
  // It either increments the default VPF count or updates the specific count of a named variant.
  incrementVPFCount(vp: VisboProject, variantName: string, inc: number): void {
    if (vp) {
      if (!variantName) {
        vp.vpfCount += inc;
      } else {
        const variant = vp.variant.find(item => item.variantName == variantName);
        if (variant) {
          variant.vpfCount += inc;
        }
      }
    }
  }

  // The deleteVPF method is responsible for deleting a specific VisboPortfolioVersion (VPF) from the VISBO project portfolio and updating the UI accordingly. 
  // It handles the API call for deletion, updates the internal state and the count, and manages the UI state to ensure a smooth user experience.
  deleteVPF(vpf: VisboPortfolioVersion): void {
    this.log(`Remove VisboPortfolioVersion: ${vpf.name} from:  ${vpf.timestamp}`);
    this.visboprojectversionService.deleteVisboPortfolioVersion(vpf)
      .subscribe(
        () => {
          const from = this.datePipe.transform(vpf.timestamp, 'dd.MM.yy');
          // const from = vpf.timestamp.toISOString();
          const message = this.translate.instant('vpfVersion.msg.removeVPFSuccess', {'name': vpf.name, 'from': from });
          const index = this.listVPF.findIndex(item => item._id == vpf._id);
          this.listVPF.splice(index, 1);
          this.incrementVPFCount(this.vpActive, vpf.variantName, -1);
          // serach a VPF from same variant, if none available fall back to main
          let newVPF = this.listVPF.find(item => item.variantName == vpf.variantName);
          if (!newVPF) {
            newVPF = this.listVPF.find(item => item.variantName == '') || this.listVPF.find(() => true);
          }
          this.switchVPF(newVPF || this.listVPF[0]);
          this.getVisboProject(this.vpActive._id);
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboPortfolioVersion error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpfVersion.msg.errorPerm', {'name': vpf.name});
            this.alertService.error(message);
          } else {
            this.log(`Error during VisboPortfolioVersion ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  // The changeView method is responsible for changing the view of the portolio and managing URL parameters for seamless navigation and state persistence.
  // It handles view switching, setting filter parameters, and updating the browser's URL without reloading the page unless needed.
  changeView(nextView: string, detailView: string = undefined, refDate: Date = undefined, vpfid:string = undefined, refreshPage = true): void {
    if (nextView) {
      if (this.views.findIndex(item => item === nextView) < 0) {
        nextView = this.views[0];
      }
      this.pageParams.view = nextView;
      if (nextView == 'KeyMetric') {
        this.pageParams.metricX = detailView || 'Cost';
      }
    }
    this.pageParams.filter = localStorage.getItem('vpfFilter') || undefined;
    if (refDate) {
      if (visboIsToday(refDate)) {
        this.pageParams.refDate = undefined;
      } else {
        this.pageParams.refDate = refDate.toISOString();
      }
    }
    if (vpfid || vpfid == null) {
      this.pageParams.vpfid = vpfid;
    }
    if (refreshPage) { this.updateUrlParam(); }
  }

  // The updateUrlParam method is responsible for updating the browser's URL with the current state of the application's parameters
  // without causing a full page reload. 
  // It leverages Angular's Router to manage the query parameters seamlessly.
  updateUrlParam(): void {
    // add parameter to URL
    const url = this.route.snapshot.url.join('/');
    const queryParams = new VPFParams();
    queryParams.filter = this.pageParams.filter || null;
    queryParams.vpfid = this.pageParams.vpfid || null;
    queryParams.refDate = this.pageParams.refDate || null;
    if (this.pageParams.metricX) {
      queryParams.metricX = this.pageParams.metricX;
    }
    queryParams.view = this.pageParams.view || null;
    this.router.navigate([url], {
      queryParams: queryParams,
      // no navigation back to old status, but to the page before
      replaceUrl: true,
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
    });
  }

  // The getKM method is responsible for determining if there esists a vpv with key metrics for a specific VisboProject. 
  // The method evaluates whether a project has associated versions and key metrics, and returns a status code accordingly.
  // Returns:
  //  number - An integer representing the status of the key metrics:
  //      0: No version of the project exists or no permission to view it.
  //      1: A version exists with key metrics available.
  //      2: A version exists but lacks key metrics due to a missing baseline.
  getKM(vp: VisboProject): number {
    const vpv = this.listVPV?.find(item => item.vpid.toString() == vp._id.toString())
    // we only know if there is a version, if it contains already to the portfolio list and we have fetched the related versions
    // RESULT 0: no Version of the VP either because no version or no permission, 1 vpv with keyMetrics available, 2: no keyMetrics because of missing baseline
    const isStored = this.vpfActive?.allItems?.find(item => item.vpid.toString() == vp._id.toString());
    let result = isStored ? 0 : 1;
    if (vpv) {
      result = vpv.keyMetrics ? 1 : 2;
    }
    return result;
  }

  // The isVersionMismatch method is designed to detect discrepancies between the expected and actual number of project versions (VPFItems) 
  // in the active portfolio (vpfActive). 
  // It provides a boolean result indicating whether a mismatch exists.
  isVersionMismatch(): boolean {
    let result = false;
    if (!this.listCalcVPV || !this.vpfActive || !this.vpfActive.allItems) {
      return result;
    }

    if (this.vpfActive.allItems.length !== this.vpvCount) {
      result = true;
    }
    return result;
  }

  // The calcVPVList method is responsible for preparing a calculated list of project versions (VPV) based on the active portfolio (vpfActive). 
  // It establishes connections between the VisboProjectVersion (vpv) objects 
  // and their corresponding VisboProject (vp) entities, then calculates the relevant project versions for the active portfolio.
  calcVPVList(): void {
    this.listVPV.forEach(vpv => {
        vpv.vp = this.listVP.find(vp => vp._id == vpv.vpid);
    });
    if (!this.vpfActive && !this.vpfActive.allItems) { return; }
    this.listCalcVPV = [];
    this.vpvCount = 0;
    for (let i = 0; i < this.vpfActive.allItems.length; i++) {
      const item = this.vpfActive.allItems[i];
      const nextVPV = this.listVPV.find(vpvItem => vpvItem.vpid === item.vpid);
      if (nextVPV) {
        this.vpvCount += 1;
        this.listCalcVPV.push(nextVPV);
      }
    }
  }

  // The gotoVPDetail method is responsible for navigating to the detailed view of a specific VisboProject. 
  // It utilizes Angular's Router service to change the route and pass necessary query parameters.
  gotoVPDetail(visboproject: VisboProject): void {
    const deleted = visboproject.deletedAt ? true : false;
    this.log(`goto Detail for VP ${visboproject._id}`);
    this.router.navigate(['vpDetail/'.concat(visboproject._id)], deleted ? { queryParams: { deleted: deleted }} : {});
  }

  // The gotoVC method is designed to navigate to the Visbo Center (VC) view associated with a specific VisboProject. 
  // It uses Angular's Router service to change the route seamlessly.
  gotoVC(visboproject: VisboProject): void {
    this.router.navigate(['vp/'.concat(visboproject.vcid)]);
  }

  // The gotoCompareVPF method is designed to navigate to the comparison view for a specific Visbo Portfolio Version (VPF). 
  // It utilizes Angular's Router service to create a smooth transition to the comparison page with relevant query parameters.
  gotoCompareVPF(): void {
    this.log(`goto Compare for VPF ${this.vpActive._id} ${this.vpfActive._id}`);
    this.router.navigate(
      ['vpfcmp/'.concat(this.vpActive._id)],
      { queryParams: { vpfid: this.vpfActive._id },
      // preserve the existing query params in the route
      queryParamsHandling: 'merge'
      }
    );
  }

  // The variantListInit method is responsible for initializing and setting up the dropdown list of available portfolio variants in the Visbo Project. 
  // It populates listVPFVariant with relevant variant data, sorts the list, and sets the default and active variant states.
  variantListInit(variantName: string = undefined): void {
    this.log(`Init Drop Down List ${this.vpActive?.variant?.length}`);
    this.listVPFVariant = [];

    this.vpActive?.variant?.forEach(variant => {
      if (variant.variantName != 'pfv') {
        this.listVPFVariant.push({name: variant.variantName, version: variant.vpfCount, variantName: variant.variantName, description: variant.description, email: variant.email });
      }
    });
    this.listVPFVariant.sort(function (a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase())});
    this.listVPFVariant.unshift({name: this.defaultVariant, version: this.vpActive.vpfCount, variantName: '', description: '', email: '' });
    if (variantName) {
      this.newVPFVariant = this.listVPFVariant.find(item => item.variantName == variantName);
    }
    this.activeVPFVariant = this.listVPFVariant[0];
  }

  // The checkVPFActive method is a simple utility function used to verify whether a given portfolio variant (item) is currently active. 
  // It compares the variantName of the provided item with the variantName of the active Visbo Portfolio Version (vpfActive).
  checkVPFActive(item: DropDown): boolean {
    return this.vpfActive?.variantName == item.variantName;
  }

  // The switchVariantByName method is designed to switch the currently active or new portfolio variant based on the provided variantName. 
  // It ensures that the correct variant is set in either the activeVPFVariant or newVPFVariant property.
  switchVariantByName(name: string, newVariant = false): void {
    this.log(`SwitchVariantByName: ${name}, ${newVariant}`)
    let variant = this.listVPFVariant.find(variant => variant.variantName == name);
    if (!variant) {
      variant = this.listVPFVariant[0];
    }
    if (newVariant) {
      this.newVPFVariant = variant;
    } else {
      this.activeVPFVariant = variant;
    }
  }

  // The switchPFVersion method is designed to change the active portfolio version based on the specified variant name and an optional timestamp (ts). 
  // It filters the portfolio versions (listVPF) to find the relevant version and switches to the latest version matching the criteria.
  switchPFVersion(variantName: string, ts: Date = undefined): void {
    this.log(`Change Drop Down ${variantName} `);
    // MS TODO: select the correct version for this variant
    const versionList = this.listVPF?.filter(vpf => vpf.variantName == variantName && (!ts || visboCmpDate(ts, vpf.timestamp) == 0));
    versionList.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); })

    this.switchVPF(versionList[0]);
  }

  // The switchVPF method is responsible for updating the active portfolio version (vpfActive) and managing related state and view changes. 
  // It handles both setting a new active version and clearing the state if no valid version is provided.
  switchVPF(vpf: VisboPortfolioVersion): void {
    this.log(`SwitchVPF: ${vpf._id}, ${vpf.variantName}`);
    if (vpf) {
      this.vpfActive = vpf;
      this.switchVariantByName(this.vpfActive.variantName);
      if (this.vpfActive.variantName == '' && this.isLatestVPF(this.vpfActive)) {
        this.changeView(undefined, undefined, undefined, null);
      } else {
        this.changeView(undefined, undefined, undefined, this.vpfActive._id);
      }
      this.getVisboPortfolioKeyMetrics();
    } else {
      this.vpfActive = undefined;
      this.listVPV = undefined;
    }
    this.updateUrlParam();
  }

  // The isLatestVPF method checks whether the given VisboPortfolioVersion (vpf) is the most recent version for its specified variant.
  isLatestVPF(vpf: VisboPortfolioVersion): boolean {
    let result = true;
    const latestVPF = this.listVPF.find(item => item.variantName == vpf.variantName);
    if (latestVPF) {
      result = visboCmpDate(vpf.timestamp, latestVPF.timestamp) >= 0
    }
    return result;
  }

  // The getVPStatus method fetches the status of a Visbo project, either in a localized (translated) form or its original name.
  getVPStatus(local: boolean, original: string = undefined): string {
    if (!this.dropDownVPStatus) {
      return undefined;
    }
    let result = this.dropDownVPStatus[this.filterVPStatusIndex || 0];
    if (original) {
      result = this.dropDownVPStatus.find(item => item.name == original) || result;
    }
    if (local) {
      return result.localName;
    } else {
      return result.name;
    }
  }

  // The setRefDateStr method is designed to convert a given Date object (refDate) into a formatted string (vpvRefDateStr) 
  // that represents the date in the local timezone, adhering to the ISO format (YYYY-MM-DD).
  setRefDateStr(refDate: Date): void {
    const offset = refDate.getTimezoneOffset()
    const localDate = new Date(refDate.getTime() - (offset*60*1000))
    this.vpvRefDateStr = localDate.toISOString().substr(0, 10);
  }

  // The parseDate method is designed to convert a date string (dateString) into a Date object with the time set to the start of the day (00:00:00.000).
  parseDate(dateString: string): Date {
     if (dateString) {
       const actDate = new Date(dateString);
       actDate.setHours(0, 0, 0, 0);
       return actDate;
    }
    return null;
  }

  // The getShortText method is a simple utility that leverages an existing helper function (visboGetShortText) 
  // to truncate a given string (text) to a specified length (len). 
  // It also optionally allows specifying the truncation strategy through the position parameter.
  getShortText(text: string, len: number, position?: string): string {
    return visboGetShortText(text, len, position);
  }

  // The sortVPTable method is responsible for sorting the vpCheckListFiltered array based on a specified column (n). 
  // The method dynamically handles sorting in ascending or descending order, depending on the current state of the sortAscending flag.
  sortVPTable(n: number): void {
    if (n !== undefined) {
      if (!this.vpCheckListAll) {
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
      this.vpCheckListFiltered.sort(function(a, b) {
        return visboCmpString(a.vp.name.toLowerCase(), b.vp.name.toLowerCase());
      });
    } else if (this.sortColumn === 2) {
      this.vpCheckListFiltered.sort(function(a, b) { return visboCmpDate(a.vp.updatedAt, b.vp.updatedAt); });
    } else if (this.sortColumn === 3) {
      this.vpCheckListFiltered.sort(function(a, b) { return (a.isChecked ? 0 : 1) - (b.isChecked ? 0 : 1); });
    } else if (this.sortColumn === 4) {
      this.vpCheckListFiltered.sort(function(a, b) {
        // combine the two fields hasVariants and Variant Name to get them sorted as a block (all projects together with a variant separated from the ones without)
        const aVariant = (a.hasVariants ? '1' : '0') + (a.variantName || '');
        const bVariant = (b.hasVariants ? '1' : '0') + (b.variantName || '');
        return visboCmpString(aVariant.toLowerCase(), bVariant.toLowerCase());
      });
    } else if (this.sortColumn === 5) {
      this.vpCheckListFiltered.sort(function(a, b) {
        const aRiskItem = getCustomFieldDouble(a.vp, '_risk');
        const aRisk = aRiskItem ? aRiskItem.value || 0 : 0;
        const bRiskItem = getCustomFieldDouble(b.vp, '_risk');
        const bRisk = bRiskItem ? bRiskItem.value || 0 : 0;
        return bRisk - aRisk;
      });
    } else if (this.sortColumn === 6) {
      this.vpCheckListFiltered.sort(function(a, b) {
        const aStrategicFitItem = getCustomFieldDouble(a.vp, '_strategicFit');
        const aStrategicFit = aStrategicFitItem ? aStrategicFitItem.value || 0 : 0;
        const bStrategicFitItem = getCustomFieldDouble(b.vp, '_strategicFit');
        const bStrategicFit = bStrategicFitItem ? bStrategicFitItem.value || 0 : 0;
        return aStrategicFit - bStrategicFit;
      });
    } else if (this.sortColumn === 7) {
      // sort by VP Status
      this.vpCheckListFiltered.sort(function(a, b) {
        return visboCmpString(b.vp.vpStatusLocale, a.vp.vpStatusLocale);
      });
    }
    if (!this.sortAscending) {
      this.vpCheckListFiltered.reverse();
    }
  }

  // The getPreView method is a simple utility function that returns a boolean indicating whether the application is in "Preview" mode.
  getPreView(): boolean {
    return getPreView();
  }

  /** Log a message with the MessageService */
  private log(message: string): void {
    this.messageService.add('VisboPortfolioVersion: ' + message);
  }
}
