import { Component, OnInit, Input } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { TranslateService } from '@ngx-translate/core';
import * as XLSX from 'xlsx';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboUserInvite } from '../_models/visbouser';
import { VGGroup, VGGroupExpanded, VGPermission, VGUserGroup, VGProjectUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboSetting, VisboReducedOrgaItem, VisboOrganisation, VisboRole } from '../_models/visbosetting';

import { getErrorMessage, visboCmpString, visboCmpDate, getJsDateFromExcel } from '../_helpers/visbo.helper';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';
const JSON_EXTENSION = '.json';

@Component({
  selector: 'app-visbocenter-detail',
  templateUrl: './visbocenter-detail.component.html',
  styleUrls: ['./visbocenter-detail.component.css']
})
export class VisbocenterDetailComponent implements OnInit {

  @Input() visbocenter: VisboCenter;
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  vgVPUsers: VGProjectUserGroup[];
  newUserInvite = new VisboUserInvite();
  actGroup: VGGroupExpanded;
  vcSettings: VisboSetting[];
  vcSetting: VisboSetting;

  confirm: string;
  userIndex: number;
  groupIndex: number;
  settingIndex: number;
  showList = 'Users';

  combinedPerm: VGPermission;
  combinedUserPerm: VGPermission;
  permVC = VGPVC;
  permVP = VGPVP;

  vcSettingsEnableDisable: VisboSetting[];
  indexEnableDisable: number;

  newFile: any;
  newOrgaName: string;
  newOrgaList: VisboReducedOrgaItem[];
  orgaSaveMode: string;
  vcOrganisation: VisboSetting[];
  currentOrgaTimestamp: Date;
  newOrgaTimestamp: Date;
  minOrgaTimestamp: Date;
  errorList: string[] = [];
  isOrgaSaved: boolean;

  today: Date;
  sortUserColumn = 1;
  sortUserAscending = true;
  sortVPUserColumn = 1;
  sortVPUserAscending = true;
  sortGroupColumn = 1;
  sortGroupAscending = true;
  sortSettingColumn = 1;
  sortSettingAscending = true;
  sortEnableDisableAscending: boolean;
  sortEnableDisableColumn: number;

  constructor(
    private messageService: MessageService,
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.getVisboCenter();
    this.getVisboCenterUsers();
  }

  getVisboCenter(): void {
    const id = this.route.snapshot.paramMap.get('id');

    // this.log(`VisboCenter Detail of: ${id}`);
    // this.log(`VisboCenter Detail of: ${id} permVCDef ${this.permVC["2"]} ${this.permVC.ViewAudit}`);
    this.visbocenterService.getVisboCenter(id)
      .subscribe(
        visbocenter => {
          this.visbocenter = visbocenter;
          this.combinedPerm = visbocenter.perm;
          this.titleService.setTitle(this.translate.instant('vcDetail.titleName', {name: visbocenter.name}));
          this.log(`VisboCenter initialised ${this.visbocenter._id} Perm ${JSON.stringify(this.combinedPerm)} `);
        },
        error => {
          this.log(`Get VC failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

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

  showEnableDisable(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboCenter Settings Enable/Disable of: ' + id);
    this.visbosettingService.getVCSettingByType(id, '_VCConfig', false)
      .subscribe(
        vcSettings => {
          this.log(`fetched VC Settings ${vcSettings.length}`);
          this.vcSettingsEnableDisable = this.squeezeEnableDisable(vcSettings);
          if (vcSettings.length > 0) {
            this.indexEnableDisable = 0;
          }
          this.switchView('SettingEnableDisable')
          // this.sortSettingTable();
        },
        error => {
          this.log(`Get VC Settings failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            this.alertService.error(`Permission Denied`);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  editEnableDisable(index: number): void {
    if (index >= 0 && index < this.vcSettingsEnableDisable.length) {
      this.indexEnableDisable = index;
    }
  }

  updateConfig(setting: VisboSetting): void {
    if (!setting) return;
    this.log(`Update Config VC ${JSON.stringify(setting)}`);
    this.visbosettingService.updateVCSetting(setting.vcid, setting, false)
      .subscribe(
        data => {
          this.log(`set sysVC Config success ${JSON.stringify(data)}`);
          this.alertService.success(`Successfully changed Setting ${setting.name}`, true);
          const index = this.vcSettingsEnableDisable.findIndex(item => item.name == setting.name);
          if (index >= 0) {
            this.vcSettingsEnableDisable[index] = data;
          }
        },
        error => {
          this.log(`set System Config failed: error: ${error.status} message: ${error.error.message}`);
          this.alertService.error(getErrorMessage(error));
        }
      );
  }

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  getVCPerm(): number {
    if (this.combinedPerm === undefined) {
      return 0;
    }
    return this.combinedPerm.vc;
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasUserVCPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    return (this.combinedUserPerm.vc & perm) > 0;
  }

  hasUserVPPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    return (this.combinedUserPerm.vp & perm) > 0;
  }

  getVisboCenterUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboCenter UserList of: ' + id);
    this.visbocenterService.getVCUsers(id)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.vgVPUsers = mix.vpusers;
          this.log(`fetched Users ${this.vgUsers.length}, Groups ${this.vgGroups.length} Project Users ${this.vgVPUsers.length}`);
          this.sortUserTable();
          this.sortGroupTable();
        },
        error => {
          this.log(`Get VC Users failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  gotoVCAudit(visbocenter: VisboCenter): void {
    this.router.navigate(['vcAudit/'.concat(visbocenter._id)]);
  }

  goBack(): void {
    // this.log(`VC Details go Back ${JSON.stringify(this.location)}`)
    this.location.back();
  }

  gotoVPList(visbocenter: VisboCenter): void {
    this.router.navigate(['vp/'.concat(visbocenter._id)]);
  }

  gotoVPDetail(vpid: string): void {
    this.router.navigate(['vpDetail/'.concat(vpid)]);
  }

  save(): void {
    this.visbocenterService.updateVisboCenter(this.visbocenter)
      .subscribe(
        vc => {
          const message = this.translate.instant('vcDetail.msg.updateVCSuccess', {'name': vc.name});
          this.alertService.success(message, true);
          this.goBack();
        },
        error => {
          this.log(`save VC failed: error: ${error.status} message: ${error.error.message} `);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorPermVC', {'name': this.visbocenter.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vcDetail.msg.errorVCConflict', {'name': this.visbocenter.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  switchView(newView: string): void {
    this.showList = newView;
    this.log('VisboCenter new View: ' + newView);
  }

  showSetting(): void {
    this.showList = 'Settings';
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboCenter Settings of: ' + id);
    this.visbosettingService.getVCSettings(id)
      .subscribe(
        vcSettings => {
          this.log(`fetched VC Settings ${vcSettings.length}`);
          this.vcSettings = vcSettings.filter(item => item.type != '_VCConfig');
          this.sortSettingTable();
          this.vcOrganisation = vcSettings.filter(item => item.type == 'organisation');
          this.vcOrganisation.sort(function(a, b) { return visboCmpDate(b.timestamp, a.timestamp); });
        },
        error => {
          this.log(`Get VC Settings failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  addNewVCUser(): void {
    const email = this.newUserInvite.email.trim();
    const groupName = this.newUserInvite.groupName.trim();
    const inviteGroup = this.vgGroups.filter(group => group.name === groupName)[0];
    const groupId = inviteGroup._id;
    let inviteMessage = '';
    if (this.newUserInvite.inviteMessage) {
      inviteMessage = this.newUserInvite.inviteMessage.trim();
    }
    const vcid = this.visbocenter._id;
    this.log(`Add VisboCenter User: ${email} Group: ${groupName}/${groupId} VC: ${vcid}`);
    if (!email || !groupId) { return; }
    this.visbocenterService.addVCUser(email, groupId, inviteMessage, vcid )
      .subscribe(
        group => {
          // Add User to User & Group list
          const newUserGroup = new VGUserGroup();
          newUserGroup.userId = group.users.filter(user => user.email === email)[0].userId;
          newUserGroup.email = email;
          newUserGroup.groupId = group._id;
          newUserGroup.groupName = group.name;
          newUserGroup.groupType = inviteGroup.groupType;
          newUserGroup.internal = inviteGroup.internal;
          this.log(`Add VisboCenter User Push: ${JSON.stringify(newUserGroup)}`);
          this.vgUsers.push(newUserGroup);
          this.sortUserTable();
          for (let i = 0; i < this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id === group._id) {
              this.vgGroups[i] = group;
              break;
            }
          }
          const message = this.translate.instant('vcDetail.msg.addUserSuccess', {'name': email});
          this.alertService.success(message);
        },
        error => {
          this.log(`Add VisboCenter User error: ${JSON.stringify(error)}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorAddUserPerm', {'name': this.visbocenter.name});
            this.alertService.error(message);
          } else if (error.error) {
            this.log(`Error during add VC user ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  helperUserIndex(memberIndex: number): void {
    this.userIndex = memberIndex;
  }

  helperSettingIndex(index: number): void {
    this.settingIndex = index;
  }

  calcCombinedPerm(memberIndex: number): void {
    this.userIndex = memberIndex;
    this.combinedUserPerm = {system: 0, vc: 0, vp: 0};
    this.vgUsers.forEach(this.addUserPerm, this);
    this.log(`Combined Permission for ${this.vgUsers[memberIndex].email}  ${JSON.stringify(this.combinedUserPerm)}`);
  }

  addUserPerm(listUser: VGUserGroup): void {
    if (listUser.email !== this.vgUsers[this.userIndex].email) {
      return;
    }
    this.log(`Add User Permission for ${listUser.groupName}`);

    const indexGroup = this.vgGroups.findIndex(x => x.name === listUser.groupName);
    if (indexGroup >= 0) {
      if (this.vgGroups[indexGroup].permission) {
        this.combinedUserPerm.system = this.combinedUserPerm.system | (this.vgGroups[indexGroup].permission.system || 0);
        this.combinedUserPerm.vc = this.combinedUserPerm.vc | (this.vgGroups[indexGroup].permission.vc || 0);
        this.combinedUserPerm.vp = this.combinedUserPerm.vp | (this.vgGroups[indexGroup].permission.vp || 0);
      } else {
        this.log(`Permission for Group not set ${listUser.groupName}`);
      }
    } else {
      this.log(`Group not found ${listUser.groupName}`);
    }
  }

  helperRemoveGroup(memberIndex: number): void {
    this.groupIndex = memberIndex;
  }

  helperUsersPerGroup(groupName: string): number {
    const group = this.vgGroups && this.vgGroups.find(x => x.name === groupName);
    if (group) {
      return group.users.length;
    }
    return 0;
  }

  removeVCUser(user: VGUserGroup, vcid: string): void {
    this.log(`Remove VisboCenter User: ${user.email}/${user.userId} Group: ${user.groupName} VC: ${vcid}`);
    this.visbocenterService.deleteVCUser(user, vcid)
      .subscribe(
        () => {
          // this.log(`Remove VisboCenter User result: ${JSON.stringify(result)}`);
          // this.visbocenter.users = users;
          // filter user from vgUsers
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser !== user);
          // filter user from vgGroups
          for (let i = 0; i < this.vgGroups.length; i++) {
            if (this.vgGroups[i]._id === user.groupId) {
              for (let j = 0; j < this.vgGroups[i].users.length; j++) {
                if (this.vgGroups[i].users[j].userId === user.userId) {
                  this.vgGroups[i].users.splice(j, 1); // remove item from array
                  break;
                }
              }
              break;
            }
          }
          const message = this.translate.instant('vcDetail.msg.removeUserSuccess', {'name': user.email});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboCenter User error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorRemoveUserPerm', {'name': user.email});
            this.alertService.error(message);
          } else {
            this.log(`Error during remove VC user ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  helperVCPerm(newGroup: VGGroupExpanded): number {
    let perm = 0;
    if (newGroup.checkedView) { perm += this.permVC.View; }
    if (newGroup.checkedViewAudit) { perm += this.permVC.ViewAudit; }
    if (newGroup.checkedModify) { perm += this.permVC.Modify; }
    if (newGroup.checkedCreateVP) { perm += this.permVC.CreateVP; }
    if (newGroup.checkedManagePerm) { perm += this.permVC.ManagePerm; }

    return perm;
  }

  helperVPPerm(newGroup: VGGroupExpanded): number {
    let perm = 0;
    if (newGroup.checkedVPView) { perm += this.permVP.View; }
    if (newGroup.checkedVPViewAudit) { perm += this.permVP.ViewAudit; }
    if (newGroup.checkedVPModify) { perm += this.permVP.Modify; }
    if (newGroup.checkedCreateVariant) { perm += this.permVP.CreateVariant; }
    if (newGroup.checkedVPManagePerm) { perm += this.permVP.ManagePerm; }
    if (newGroup.checkedVPDelete) { perm += this.permVP.DeleteVP; }

    return perm;
  }

  activateGroup(userGroup: VGUserGroup): void {
    this.log(`Activate Group : ${userGroup.groupName}`);
    const group = this.vgGroups.find(item => item.name == userGroup.groupName);
    this.initGroup(group);
  }

  activateUser(userGroup: VGUserGroup): void {
    this.log(`Activate User : ${userGroup.email}`);
    const memberIndex = this.vgUsers.findIndex(item => item.email == userGroup.email)
    if (memberIndex >= 0) {
      this.calcCombinedPerm(memberIndex);
    }
  }

  initGroup(curGroup: VGGroup): void {
    this.actGroup = new VGGroupExpanded();
    if (curGroup) {
      this.confirm = (curGroup.groupType === 'VC') ? this.translate.instant('vcDetail.btn.save') : this.translate.instant('vcDetail.btn.view');
      this.actGroup._id = curGroup._id;
      this.log(`Init Group Set GroupID : ${this.actGroup._id} ID ${curGroup._id}`);
      this.actGroup.name = curGroup.name;
      this.actGroup.groupType = curGroup.groupType;
      this.actGroup.internal = curGroup.internal;
      this.actGroup.global = curGroup.global;
      this.actGroup.checkedView = (curGroup.permission.vc & this.permVC.View) > 0;
      this.actGroup.checkedViewAudit = (curGroup.permission.vc & this.permVC.ViewAudit) > 0;
      this.actGroup.checkedModify = (curGroup.permission.vc & this.permVC.Modify) > 0;
      this.actGroup.checkedCreateVP = (curGroup.permission.vc & this.permVC.CreateVP) > 0;
      this.actGroup.checkedManagePerm = (curGroup.permission.vc & this.permVC.ManagePerm) > 0;

      this.actGroup.checkedVPView = (curGroup.permission.vp & this.permVP.View) > 0;
      this.actGroup.checkedVPViewAudit = (curGroup.permission.vp & this.permVP.ViewAudit) > 0;
      this.actGroup.checkedVPModify = (curGroup.permission.vp & this.permVP.Modify) > 0;
      this.actGroup.checkedCreateVariant = (curGroup.permission.vp & this.permVP.CreateVariant) > 0;
      this.actGroup.checkedVPManagePerm = (curGroup.permission.vp & this.permVP.ManagePerm) > 0;
      this.actGroup.checkedVPDelete = (curGroup.permission.vp & this.permVP.DeleteVP) > 0;
    } else {
      this.confirm = this.translate.instant('vcDetail.btn.addGroup');
      this.actGroup._id = undefined;
      this.actGroup.name = '';
      this.actGroup.groupType = 'VC';
      this.actGroup.internal = false;
      this.actGroup.global = false;
      this.actGroup.checkedView = true;
    }
    this.log(`Init Group for Creation / Modification: ${this.actGroup.name} ID ${this.actGroup._id} Action ${this.confirm} `);
  }

  addModifyVCGroup(): void {
    const newGroup = new VGGroup;

    newGroup.name = this.actGroup.name.trim();
    newGroup.global = this.actGroup.global;
    newGroup.vcid = this.visbocenter._id;
    newGroup.permission = new VGPermission;
    newGroup.permission.vc = this.helperVCPerm(this.actGroup);
    newGroup.permission.vp = this.helperVPPerm(this.actGroup);

    this.log(`Add/Modify VisboCenter Group: Group: ${newGroup.name} New/Modify ${this.actGroup._id}`);

    if (this.actGroup._id) {
      // modify existing Group
      this.log(`Modify VisboCenter Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: vc ${newGroup.permission.vc} vp ${newGroup.permission.vp}`);
      newGroup._id = this.actGroup._id;
      this.visbocenterService.modifyVCGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Modify VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup._id !== newGroup._id);
            this.vgGroups.push(group);
            // update User List to reflect new Group Name & ID
            for (let i = 0; i < this.vgUsers.length; i++) {
              if (this.vgUsers[i].groupId === newGroup._id) {
                this.vgUsers[i].groupName = group.name;
              }
            }
            this.sortUserTable();
            this.sortGroupTable();
            const message = this.translate.instant('vcDetail.msg.changeGroupSuccess', {'name': group.name});
            this.alertService.success(message);
          },
          error => {
            this.log(`Modify VisboCenter Group error: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vcDetail.msg.errorChangeGroupPerm', {'name': newGroup.name});
              this.alertService.error(message);
            } else {
              this.log(`Error during modify VC Group ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    } else {
      // create new Group
      this.log(`Add VisboCenter Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: vc ${newGroup.permission.vc} vp ${newGroup.permission.vp}`);
      this.visbocenterService.addVCGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Add VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vgGroups.push(group);
            const message = this.translate.instant('vcDetail.msg.createGroupSuccess', {'name': newGroup.name});
            this.alertService.success(message);
          },
          error => {
            this.log(`Add VisboCenter Group error: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vcDetail.msg.errorCreateGroupPerm', {'name': newGroup.name});
              this.alertService.error(message);
            } else {
              this.log(`Error during add VC Group ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  removeVCGroup(group: VGGroup ): void {
    this.log(`Remove VisboCenter Group: ${group.name}/${group._id} VC: ${group.vcid}`);
    this.visbocenterService.deleteVCGroup(group)
      .subscribe(
        response => {
          this.log(`Remove VisboCenter Group result: ${JSON.stringify(response)}`);
          // filter user from vgUsers
          this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup !== group);
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser.groupId !== group._id);
          const message = this.translate.instant('vcDetail.msg.removeGroupSuccess', {'name': group.name});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboCenter Group error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorRemoveGroupPerm', {'name': group.name});
            this.alertService.error(message);
          } else {
            this.log(`Error during remove VC user ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  initSetting(index: number): void {
    this.vcSetting = this.vcSettings[index];
  }

  removeVCSetting(setting: VisboSetting ): void {
    this.log(`Remove VisboCenter Setting: ${setting.name}/${setting.type} Timestamp: ${setting.timestamp}`);
    this.visbosettingService.deleteVCSetting(setting)
      .subscribe(
        response => {
          this.log(`Remove VisboCenter Setting result: ${JSON.stringify(response)}`);
          // filter user from vgUsers
          this.vcSettings = this.vcSettings.filter(vcSetting => vcSetting !== setting)
          const message = this.translate.instant('vcDetail.msg.removeSettingSuccess', {'name': setting.name});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboCenter Setting error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vcDetail.msg.errorRemoveSettingPerm', {'name': setting.name});
            this.alertService.error(message);
          } else {
            this.log(`Error during remove VC setting ${error.error.message}`);
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  onFileSelected(event: any): void {
      let file = event?.target?.files?.[0];
      if (file?.name) {
        this.newFile = file;
      }
  }

  initOrganisation(): void {
    this.errorList = [];
    this.isOrgaSaved = false;
  }

  addSetting(): void {
    if (!this.isValidSetting()) {
      this.log(`Add Setting no valid file ${this.newFile?.name}`);
      return;
    }
    this.resetError();
    this.newOrgaName = 'Organisation';
    this.orgaSaveMode = 'new';
    this.isOrgaSaved = false;
    let beginningOfMonth = new Date();
    beginningOfMonth.setDate(1);
    beginningOfMonth.setHours(0, 0, 0, 0);
    if (this.vcOrganisation) {
      // set currentOrgaTimestamp to the newest Orga TS
      // set newOrgaTimestamp to either the next month or to the beginning of current month
      this.currentOrgaTimestamp = this.vcOrganisation[0].timestamp;
      this.newOrgaTimestamp = new Date(this.currentOrgaTimestamp);
      this.newOrgaTimestamp.setMonth(this.newOrgaTimestamp.getMonth() + 1);
      if (this.newOrgaTimestamp < beginningOfMonth) {
        this.newOrgaTimestamp = beginningOfMonth;
      }
      this.minOrgaTimestamp = new Date(this.newOrgaTimestamp);
    } else {
      this.newOrgaTimestamp = beginningOfMonth;
      this.minOrgaTimestamp = new Date(this.newOrgaTimestamp);
      this.minOrgaTimestamp.setMonth(0);
      this.minOrgaTimestamp.setFullYear(this.minOrgaTimestamp.getFullYear() - 1);
    }
    let isExcel = this.newFile?.name.slice(-EXCEL_EXTENSION.length) == EXCEL_EXTENSION;

    let fileReader = new FileReader();
    if (isExcel) {
      // fileReader.readAsArrayBuffer(this.newFile);
      fileReader.readAsArrayBuffer(this.newFile);
    } else {
      fileReader.readAsText(this.newFile);
    }
    fileReader.onloadend = (e) => {
      console.log("File uploaded Length", fileReader.result.toString().length, this.newFile.size, "type", typeof fileReader.result);
      let jsonSetting: string;
      if (isExcel) {
        let workbook = XLSX.read(e.target.result);
        const first_sheet_name = workbook.SheetNames[0];
        /* Get worksheet */
        let worksheet = workbook.Sheets[first_sheet_name];
        let listOrga = XLSX.utils.sheet_to_json(worksheet);
        this.log(`Add Setting of XLSX Files not implemented ${this.newFile?.name} Sheet ${first_sheet_name} OrgaList Len: ${listOrga?.length}`);
        this.newOrgaList = [];
        listOrga.forEach(item => {this.newOrgaList.push(this.initItem(item))});
        this.log(`Converted to ListOrga OrgaList Len: ${this.newOrgaList.length} First: ${JSON.stringify(this.newOrgaList[0])}`);
      } else {
        let jsonString = fileReader.result.toString();
        try {
          jsonSetting = JSON.parse(jsonString);
        }
        catch (e) {
          const message = this.translate.instant('vcDetail.msg.errorJSONFormat');
          this.alertService.error(message, true);
        }
        this.log(`Add Setting of JSON Files not implemented ${this.newFile?.name}`);
      }
    }
  }

  saveOrganisation(): void {
    this.log(`Save organisation ${this.newOrgaList.length}  ${this.orgaSaveMode}`);
    const vcid = this.visbocenter._id;
    const organisation = new VisboOrganisation();
    organisation.name = this.newOrgaName.trim() || 'Organisation';
    // organisation.allUnits = [];
    // this.newOrgaList.forEach(item => organisation.allUnits.push(item));
    organisation.allUnits = this.newOrgaList;

    this.isOrgaSaved = true;
    if (this.orgaSaveMode == 'new') {
      organisation.timestamp = this.newOrgaTimestamp;
      this.visbosettingService.createVCOrganisation(vcid, false, organisation)
        .subscribe(
          orga => {
            const message = this.translate.instant('vcDetail.msg.saveOrgaSuccess');
            this.alertService.success(message);
            // add orga to the list of settings and to the list of orgs
            let newSetting = new VisboSetting();
            newSetting._id = orga._id;
            newSetting.vcid = this.visbocenter._id;
            newSetting.name = orga.name;
            newSetting.timestamp = orga.timestamp;
            newSetting.updatedAt = orga.updatedAt;

            newSetting.type = 'organisation';
            newSetting.value = {allUnits: orga.allUnits, validFrom: orga.timestamp};
            this.vcOrganisation.unshift(newSetting);
            this.vcSettings.unshift(newSetting);
          },
          error => {
            this.log(`Save VisboCenter Orga error: ${JSON.stringify(error)}`);
            if (error.status === 403) {
              const message = this.translate.instant('vcDetail.msg.errorPermVC', {'name': this.visbocenter.name});
              this.alertService.error(message);
            } else if (error.status === 400) {
              const message = this.translate.instant('vcDetail.msg.invalidOrgaStructure');
              this.errorList = error.error && error.error.error
              this.alertService.error(message);
            } else if (error.error) {
              this.log(`Error during save VC Orga ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    } else {
      const orgaid = this.vcOrganisation[0]?._id;
      this.visbosettingService.updateVCOrganisation(vcid, orgaid, false, organisation)
        .subscribe(
          orga => {
            const message = this.translate.instant('vcDetail.msg.saveOrgaSuccess');
            this.vcOrganisation[0].updatedAt = orga.updatedAt;
            this.alertService.success(message);
          },
          error => {
            this.log(`Update VisboCenter Orga error: ${JSON.stringify(error)}`);
            if (error.status === 403) {
              const message = this.translate.instant('vcDetail.msg.errorPermVC', {'name': this.visbocenter.name});
              this.alertService.error(message);
            } else if (error.status === 400) {
              const message = this.translate.instant('vcDetail.msg.invalidOrgaStructure');
              this.errorList = error.error && error.error.error
              this.alertService.error(message);
            } else if (error.error) {
              this.log(`Error during update VC Orga ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  resetError(): void {
    this.errorList = [];
  }

  getCurrentOrgaLength(): number {
    let result = 0;
    const currentOrga = this.vcOrganisation && this.vcOrganisation[0];
    if (currentOrga?.value) {
      result = (currentOrga.value.allRoles?.length || 0)
              + (currentOrga.value.allCosts?.length || 0)
              + (currentOrga.value.allUnits?.length || 0);
    }
    return result;
  }

  // eslint-disable-next-line
  initItem(item: any): VisboReducedOrgaItem {
    let result = new VisboReducedOrgaItem();
    result.uid = item.uid;
    result.path = item.path?.trim();
    result.name = item.name?.trim();
    result.type = item.type;
    if (item.employeeNr) result.employeeNr = item.employeeNr;
    result.isExternRole = item.isExternRole;
    if (item.entryDate) {
      result.entryDate = getJsDateFromExcel(item.entryDate);
    }
    if (item.exitDate) {
      result.exitDate = getJsDateFromExcel(item.exitDate);
    }
    result.defaultDayCapa = item.defaultDayCapa;
    result.defaultKapa = item.defaultKapa;
    result.tagessatz = item.tagessatz;
    if (item.alias) {
      result.aliases = item.alias.split('#');
      delete result.alias
    }
    result.isSummaryRole = item.isSummaryRole ? '1' : undefined;
    result.isAggregationRole = item.isAggregationRole ? '1' : undefined;
    return result;
  }

  isValidSetting(): boolean {
    return this.newFile ? true : false;
  }

  calcFullPath(id: number, organisation: VisboReducedOrgaItem[]): void {
    if (!organisation || !(id >= 0)) {
      return;
    }
    let path = '';
    let index = organisation[id].pid;
    let level = -1;
    while (index >= 0 && organisation[index]) {
      path = '/'.concat(organisation[index].name, path);
      index = organisation[index].pid;
      level += 1;
    }
    organisation[id].path = path;
    organisation[id].level = level;
  }

  downloadSetting(): void {
    const setting = this.vcSetting;
    this.log(`Download Setting ${setting.name} ${setting.type} ${setting.updatedAt}`);
    if (setting.type == 'organisation' && setting.value?.allRoles) {
      let organisation: VisboReducedOrgaItem[] = [];
      for (let i = 0; i < setting.value.allRoles?.length; i++) {
        const role = setting.value.allRoles[i];
        const id = role.uid;
        if (!organisation[id]) {
          organisation[id] = new VisboReducedOrgaItem()
          organisation[id].uid = id;
          organisation[id].calcid = id;
          organisation[id].pid = undefined;
        }
        organisation[id].name = role.name;
        organisation[id].isExternRole = role.isExternRole?'1': '';
        organisation[id].defaultKapa = role.defaultKapa;
        organisation[id].tagessatz = role.tagessatz;
        organisation[id].employeeNr = role.employeeNr;
        organisation[id].defaultDayCapa = role.defaultDayCapa;
        if (role.entryDate > "0001-01-01T00:00:00Z") {
          organisation[id].entryDate = role.entryDate;
        }
        if (role.exitDate < "2200-11-30T23:00:00Z") {
          organisation[id].exitDate = role.exitDate;
        }
        if (role.aliases?.length) organisation[id].alias = role.aliases.join('#');
        // this.log(`Add Orga Unit ${id} ${role.name} Children ${role.subRoleIDs.length}`);
        if (role.isTeam) {
          // this.log("Skip Handling of Team Members");
          organisation[id].type = 2;
        } else {
          organisation[id].type = 1;
        }
        for (let j = 0; j < role.subRoleIDs?.length; j++) {
          const index = Number(role.subRoleIDs[j].key);
          if (index < 0) {
            this.log(`Inconsistent Org Structure Role ${id} SubRole ${role.subRoleIDs[j].key}`);
            // something wrong with the numbering
            break;
          }
          if (!organisation[index]) {
            // added by subrole
            organisation[index] = new VisboReducedOrgaItem();
            organisation[index].uid = index;
            organisation[index].calcid = index;
          } else {
            // this.log(`SubRole already exists ${id} SubRole ${index}`);
          }
          if (!organisation[index].pid) {
            organisation[index].pid = id;
          }
        }
        organisation[id].isAggregationRole = role.isAggregationRole? '1' : '';
        organisation[id].isSummaryRole = role.isSummaryRole? '1' : '';
        // organisation[id].isActDataRelevant = role.isActDataRelevant?'1': '';
      }

      // build team members Information by duplicating users with their team parents
      let maxid = 0;
      setting.value.allRoles.forEach(element => { if (element.uid > maxid) maxid = element.uid; } );
      this.log(`MaxID ${maxid}`);
      for (let i = 0; i < setting.value.allRoles.length; i++) {
        const role = setting.value.allRoles[i];
        if (role.type == 2 && role.subRoleIDs?.length > 0) {
          for (let j = 0; j < role.subRoleIDs.length; j++) {
            const index = role.subRoleIDs[j].key;
            if (!organisation[index] || organisation[index].type == 2) {
              // group in group: nothing to do
              continue;
            }
            const userRole = organisation[index];
            // now it is a user, add a new entry to the team
            maxid += 1;
            organisation[maxid] = new VisboReducedOrgaItem();
            organisation[maxid].uid = index;
            organisation[maxid].calcid = maxid;
            organisation[maxid].type = 2;
            organisation[maxid].pid = role.uid;
            organisation[maxid].name = userRole.name;
            // if (userRole.employeeNr) { organisation[maxid].employeeNr = userRole.employeeNr; }
            if (userRole.isExternRole) { organisation[maxid].isExternRole = userRole.isExternRole }
            // if (userRole.defaultDayCapa >= 0) { organisation[maxid].defaultDayCapa = userRole.defaultDayCapa; }
            // if (userRole.defaultKapa >= 0) { organisation[maxid].defaultKapa = userRole.defaultKapa; }
            // if (userRole.tagessatz >= 0) { organisation[maxid].tagessatz = userRole.tagessatz; }
            // if (userRole.entryDate) { organisation[maxid].entryDate = userRole.entryDate; }
            // if (userRole.exitDate) { organisation[maxid].exitDate = userRole.exitDate; }
            if (userRole.isSummaryRole) { organisation[maxid].isSummaryRole = userRole.isSummaryRole }
          }
        }
      }
      organisation.forEach(item => this.calcFullPath(item.calcid, organisation));
      organisation = organisation.filter(item => item.calcid !== undefined);
      organisation.sort(function(a, b) {
        if (a.type != b.type) {
          return a.type - b.type;
        } else {
          return visboCmpString(a.path.concat('/', a.name), b.path.concat('/', b.name));
        }
      });

      // build cost Information hierarchy
      let listCost: VisboReducedOrgaItem[] = [];
      for (let i = 0; setting.value.allCosts && i < setting.value.allCosts.length; i++) {
        const cost = setting.value.allCosts[i];
        const id = cost.uid;
        if (!listCost[id]) {
          listCost[id] = new VisboReducedOrgaItem()
          listCost[id].uid = id;
          listCost[id].calcid = id;
          listCost[id].pid = undefined;
        }
        listCost[id].name = cost.name;

        listCost[id].type = 3;
        for (let j = 0; cost.subCostIDs && j < cost.subCostIDs.length; j++) {
          const index = Number(cost.subCostIDs[j].key);
          if (index < 0) {
            this.log(`Inconsistent Org Structure Cost ${id} SubCost ${cost.subCostIDs[j].key}`);
            // something wrong with the numbering
            break;
          }
          if (!listCost[index]) {
            // added by subCost
            listCost[index] = new VisboReducedOrgaItem();
            listCost[index].uid = index;
            listCost[index].calcid = index;
          } else {
            this.log(`listCost already exists ${id} listCost ${index}`);
          }
          listCost[index].pid = id;
        }
      }

      listCost.forEach(item => this.calcFullPath(item.calcid, listCost));
      listCost = listCost.filter(item => item.calcid !== undefined);
      listCost.sort(function(a, b) {
        if (a.type != b.type) {
          return a.type - b.type;
        } else {
          return visboCmpString(a.path.concat('/', a.name), b.path.concat('/', b.name));
        }
      });
      // add the list to the orga list
      listCost.forEach(item => organisation.push(item));

      // this.log(`Orga Structure ${JSON.stringify(organisation)}`);
      // cleanup unnecessary fields
      let cleanupEmployeeNr = true;
      let cleanupAliases = true;
      if (organisation.find(item => item?.employeeNr != undefined)) {
          cleanupEmployeeNr = false;
      }
      if (organisation.find(item => item.alias)) {
          cleanupAliases = false;
      }
      organisation.forEach(item => {
        delete item.calcid;
        delete item.aliases;
        delete item.pid;
        cleanupEmployeeNr && delete item.employeeNr;
        if (cleanupAliases) delete item.alias;
        if (item.entryDate) { item.entryDate = new Date(item.entryDate); }
        if (item.exitDate) { item.exitDate = new Date(item.exitDate); }
        item.name = item.name.padStart(item.name.length + item.level, '  ');
        delete item.level;
      });

      // export to Excel
      const len = organisation.length;
      const width = 13;
      const matrix = 'A1:' + XLSX.utils.encode_cell({r: len, c: width});
      const timestamp = new Date(setting.timestamp);
      const month = (timestamp.getMonth() + 1).toString();
      const strTimestamp = '' + timestamp.getFullYear() + '-' +  month.padStart(2, "0");
      const name = 'VisboCenterOrganisation_' + strTimestamp;

      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(organisation, {header:['name', 'uid', 'path', 'tagessatz', 'defaultKapa', 'defaultDayCapa', 'entryDate', 'exitDate', 'employeeNr', 'isExternRole', 'alias']});
      worksheet['!autofilter'] = { ref: matrix };
      // eslint-disable-next-line
      const sheets: any = {};
      sheets[name] = worksheet;
      const workbook: XLSX.WorkBook = { Sheets: sheets, SheetNames: [name] };
      // eslint-disable-next-line
      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data: Blob = new Blob([excelBuffer], {type: EXCEL_TYPE});
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.download = name.concat(EXCEL_EXTENSION);
      this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // export as JSON/Text
      const data = JSON.stringify(setting.value);
      this.log(`VC Setting JSON Len ${data.length} `);
      const blob = new Blob([data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      this.log(`Open URL ${url}`);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.download = `VisboCenterSetting_${setting.name}.json`;
      this.log(`Open URL ${url} doc ${JSON.stringify(a)}`);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  sortUserTable(n?: number): void {
    if (!this.vgUsers) { return; }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortUserColumn === undefined) {
      if (n !== this.sortUserColumn) {
        this.sortUserColumn = n;
        this.sortUserAscending = undefined;
      }
      if (this.sortUserAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortUserAscending = (n === 1 || n === 2) ? true : false;
      } else {
        this.sortUserAscending = !this.sortUserAscending;
      }
    }
    if (this.sortUserColumn === 1) {
      this.vgUsers.sort(function(a, b) { return visboCmpString(a.email, b.email); });
    } else if (this.sortUserColumn === 2) {
      this.vgUsers.sort(function(a, b) { return visboCmpString(a.groupName.toLowerCase(), b.groupName.toLowerCase()); });
    }
    if (!this.sortUserAscending) {
      this.vgUsers.reverse();
    }
  }

  sortVPUserTable(n?: number): void {
    if (!this.vgVPUsers) {
      return;
    }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortVPUserColumn === undefined) {
      if (n !== this.sortVPUserColumn) {
        this.sortVPUserColumn = n;
        this.sortVPUserAscending = undefined;
      }
      if (this.sortVPUserAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortVPUserAscending = (n === 1 || n === 2) ? true : false;
      } else {
        this.sortVPUserAscending = !this.sortVPUserAscending;
      }
    }
    if (this.sortVPUserColumn === 1) {
      this.vgVPUsers.sort(function(a, b) { return visboCmpString(a.users.email, b.users.email); });
    } else if (this.sortVPUserColumn === 2) {
      this.vgVPUsers.sort(function(a, b) { return visboCmpString(a.vp.name.toLowerCase(), b.vp.name.toLowerCase()); });
    }
    this.log(`Sort VP Users Column ${this.sortVPUserColumn} Reverse: ${this.sortVPUserAscending}`);
    if (!this.sortVPUserAscending) {
      this.vgVPUsers.reverse();
    }
  }

  sortGroupTable(n?: number): void {
    if (!this.vgGroups) { return; }
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortGroupColumn === undefined) {
      if (n !== this.sortGroupColumn) {
        this.sortGroupColumn = n;
        this.sortGroupAscending = undefined;
      }
      if (this.sortGroupAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortGroupAscending = (n === 1) ? true : false;
      } else {
        this.sortGroupAscending = !this.sortGroupAscending;
      }
    }
    if (this.sortGroupColumn === 1) {
      this.vgGroups.sort(function(a, b) { return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
    } else if (this.sortGroupColumn === 2) {
      this.vgGroups.sort(function(a, b) { return b.users.length - a.users.length; });
    }
    if (!this.sortGroupAscending) {
      this.vgGroups.reverse();
    }
  }

  sortSettingTable(n?: number): void {
    if (!this.vcSettings) { return; }
    if (n !== undefined || this.sortSettingColumn === undefined) {
      if (n !== this.sortSettingColumn) {
        this.sortSettingColumn = n;
        this.sortSettingAscending = undefined;
      }
      if (this.sortSettingAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortSettingAscending = (n === 1) ? true : false;
      } else {
        this.sortSettingAscending = !this.sortSettingAscending;
      }
    }
    if (this.sortSettingColumn === 1) {
      this.vcSettings.sort(function(a, b) {
        let result = visboCmpString(a.name.toLowerCase(), b.name.toLowerCase());
        if (result == 0) {
          result = visboCmpDate(b.timestamp, a.timestamp);
        }
        return result;
      });
    } else if (this.sortSettingColumn === 2) {
      this.vcSettings.sort(function(a, b) { return visboCmpDate(a.timestamp, b.timestamp); });
    } else if (this.sortSettingColumn === 3) {
      this.vcSettings.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    }
    if (!this.sortSettingAscending) {
      this.vcSettings.reverse();
    }
  }

  isToday(checkDate: string): boolean {
    if (!this.today) {
      this.today = new Date();
      this.today.setHours(0, 0, 0, 0);
    }
    // this.log(`Check Date ${checkDate} ${this.today.toISOString()}`);
    return new Date(checkDate) >= this.today;
  }

  parseDate(dateString: string, beginningOfMonth = false): Date {
     if (dateString) {
       const actDate = new Date(dateString);
       actDate.setHours(0, 0, 0, 0);
       if (beginningOfMonth) actDate.setDate(1);
       return actDate;
    }
    return null;
  }

  sortSettingEnabledDisabled(n?: number): void {
    if (!this.vcSettingsEnableDisable) {
      return;
    }
    if (n !== undefined || this.sortEnableDisableColumn === undefined) {
      if (n !== this.sortEnableDisableColumn) {
        this.sortEnableDisableColumn = n;
        this.sortEnableDisableAscending = undefined;
      }
      if (this.sortEnableDisableAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortEnableDisableAscending = ( n === 1 ) ? true : false;
      } else {
        this.sortEnableDisableAscending = !this.sortEnableDisableAscending;
      }
    }
    if (this.sortEnableDisableColumn === 1) {
      this.vcSettingsEnableDisable.sort(function(a, b) { return visboCmpString(a.name, b.name); });
    } else if (this.sortEnableDisableColumn === 2) {
      this.vcSettingsEnableDisable.sort(function(a, b) { return (a.value.systemEnabled ? 1 : 0) - (b.value.systemEnabled ? 1 : 0); });
    } else if (this.sortEnableDisableColumn === 3) {
      this.vcSettingsEnableDisable.sort(function(a, b) { return (a.value.systemLimit ? 1 : 0) - (b.value.systemLimit ? 1 : 0); });
    } else if (this.sortEnableDisableColumn === 4) {
      this.vcSettingsEnableDisable.sort(function(a, b) { return (a.value.systemLimit ? -10 : (a.value.sysVCEnabled ? 1 : 0)) - (b.value.systemLimit ? -10 : (b.value.sysVCEnabled ? 1 : 0)); });
    } else if (this.sortEnableDisableColumn === 5) {
      this.vcSettingsEnableDisable.sort(function(a, b) { return (a.value.systemLimit ? -10 : (a.value.sysVCLimit ? 1 : 0)) - (b.value.systemLimit ? -10 : (b.value.sysVCLimit ? 1 : 0)); });
    } else if (this.sortEnableDisableColumn === 10) {
      this.vcSettingsEnableDisable.sort(function(a, b) { return visboCmpDate(a.updatedAt, b.updatedAt); });
    }

    if (!this.sortEnableDisableAscending) {
      this.vcSettingsEnableDisable.reverse();
    }
  }

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenter Details: ' + message);
    console.log('VisboCenter Details: ' + message);
  }
}
