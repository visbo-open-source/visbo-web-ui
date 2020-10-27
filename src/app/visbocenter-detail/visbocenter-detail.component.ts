import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import {TranslateService} from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';

import { VisboUserInvite } from '../_models/visbouser';
import { VGGroup, VGGroupExpanded, VGPermission, VGUserGroup, VGProjectUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';
import { VisboCenter } from '../_models/visbocenter';
import { VisboCenterService } from '../_services/visbocenter.service';
import { VisboSettingService } from '../_services/visbosetting.service';
import { VisboSetting } from '../_models/visbosetting';

import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

class OrganisationItem {
  uid: number;
  pid: number;
  level: number
  name: string;
  parent: string;
  path: string;
  employeeNr: string;
  isExternRole: boolean;
  defaultDayCapa: number;
  defaultKapa: number;
  tagessatz: number;
  entryDate: Date;
  exitDate: Date;
  aliases: string;
}

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

  today: Date;
  sortUserColumn = 1;
  sortUserAscending = true;
  sortVPUserColumn = 1;
  sortVPUserAscending = true;
  sortGroupColumn = 1;
  sortGroupAscending = true;
  sortSettingColumn = 1;
  sortSettingAscending = true;

  constructor(
    private messageService: MessageService,
    private visbocenterService: VisboCenterService,
    private visbosettingService: VisboSettingService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService
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
          this.vcSettings = vcSettings;
          this.sortSettingTable();
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
            this.log(`Error during add VC user ${error.error.message}`); // log to console instead
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
            this.log(`Error during remove VC user ${error.error.message}`); // log to console instead
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
              this.log(`Error during modify VC Group ${error.error.message}`); // log to console instead
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
              this.log(`Error during add VC Group ${error.error.message}`); // log to console instead
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
            this.log(`Error during remove VC user ${error.error.message}`); // log to console instead
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
            this.log(`Error during remove VC setting ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  calcFullPath(uid: number, organisation: OrganisationItem[]): void {
    if (!organisation || !(uid >= 0)) {
      return;
    }
    let path = '';
    let index = uid;
    let level = -1;
    if (organisation[index]) {
      const pid = organisation[index] && organisation[index].pid;
      if (pid >= 0) {
        organisation[index].parent = organisation[pid] && organisation[pid].name;
      }
    }
    while (index >= 0 && organisation[index]) {
      path = '/'.concat(organisation[index].name, path);
      index = organisation[index].pid;
      level += 1;
    }
    organisation[uid].path = path;
    organisation[uid].level = level;
  }

  downloadSetting(): void {
    const setting = this.vcSetting;
    this.log(`Download Setting ${setting.name} ${setting.type} ${setting.updatedAt}`);
    if (setting.type == 'organisation' && setting.value?.allRoles) {
      const organisation: OrganisationItem[] = [];
      for (let i = 0; i < setting.value.allRoles.length; i++) {
        const role = setting.value.allRoles[i];
        if (role.isTeamParent || role.isTeam) {
          // skip team entries for the moment
          continue;
        }
        if (!organisation[role.uid]) {
          organisation[role.uid] = new OrganisationItem()
          organisation[role.uid].uid = role.uid;
          organisation[role.uid].pid = undefined;
        }
        organisation[role.uid].name = role.name;
        organisation[role.uid].isExternRole = role.isExternRole;
        organisation[role.uid].tagessatz = role.tagessatzIntern;
        organisation[role.uid].aliases = role.aliases;

        // this.log(`Add Orga Unit ${role.uid} ${role.name} Children ${role.subRoleIDs.length}`);
        for (let j = 0; j < role.subRoleIDs.length; j++) {
          const index = Number(role.subRoleIDs[j].key);
          if (index < 0) {
            this.log(`Inconsistent Org Structure Role ${role.uid} SubRole ${role.subRoleIDs[j].key}`);
            // something wrong with the numbering
            break;
          }
          if (!organisation[index]) {
            // added by subrole
            organisation[index] = new OrganisationItem();
            organisation[index].uid = index;
          } else {
            this.log(`SubRole already exists ${role.uid} SubRole ${index}`);
          }
          organisation[index].pid = role.uid;
        }
      }
      organisation.forEach(item => this.calcFullPath(item.uid, organisation));

      organisation.sort(function(a, b) { return visboCmpString(a.path, b.path); });
      this.log(`Orga Structure ${JSON.stringify(organisation)}`);

      // export as CSV
      let data = '';
      const separator = '\t';
      data = 'sep=' + separator + '\n';  // to force excel to use the separator
      data = data + 'name' + separator
            + 'uid' + separator
            // + 'pid' + separator
            + 'organisation' + separator
            + 'isExternal' + separator
            // + 'isTeam' + separator
            + 'defaultKapa' + separator
            + 'tagessatz' + separator
            + 'employeeNr' + separator
            + 'defaultDayCapa' + separator
            + 'entryDate' + separator
            + 'exitDate' + separator
            + 'aliases' + '\n';
      for (let i = 0; i < organisation.length; i++) {
        const role = organisation[i];
        if (!role) {
          // organisation could contain holes and they are sorted at the end
          break;
        }
        const lineItem = ''
                    + role.name.padStart(role.name.length + role.level, '_') + separator
                    + role.uid + separator
                    // + (role.pid || '') + separator
                    + (role.parent || '') + separator
                    + (role.isExternRole ? '1' : '0') + separator
                    // + (role.isTeam ? '1' : '0') + separator
                    + (role.defaultKapa || '0') + separator
                    + (role.tagessatz || '0') + separator
                    + (role.employeeNr || '') + separator
                    + (role.defaultDayCapa || '0') + separator
                    + (role.entryDate ? role.entryDate : '') + separator
                    + (role.exitDate ? role.exitDate : '') + separator
                    + (role.aliases || '') + '\n';
        data = data.concat(lineItem);
      }
      this.log(`VC Setting Orga CSV Len ${data.length} `);
      // const blob = new Blob([data], { type: 'text/plain;charset=ISO-8859-1' });
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      this.log(`Open URL ${url}`);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      const timestamp = new Date(setting.timestamp);
      const month = (timestamp.getMonth() + 1).toString();
      const strTimestamp = '' + timestamp.getFullYear() + '-' +  month.padStart(2, "0");

      a.download = `VisboCenterOrganisation_${strTimestamp}.csv`;
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
    this.log(`Sort VP Users Column ${this.sortVPUserColumn} Reverse: ${this.sortVPUserAscending}`); // log to console instead
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
      this.vcSettings.sort(function(a, b) { return visboCmpString(a.name.toLowerCase(), b.name.toLowerCase()); });
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

  /** Log a message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboCenter Details: ' + message);
  }
}
