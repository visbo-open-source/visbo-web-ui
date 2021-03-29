import { Component, OnInit, Input } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { TranslateService } from '@ngx-translate/core';

import { MessageService } from '../_services/message.service';
import { AlertService } from '../_services/alert.service';
import { VisboProjectService } from '../_services/visboproject.service';
import { VisboUser, VisboUserInvite } from '../_models/visbouser';
import { VisboProject, VPVariant, VPTYPE, constSystemCustomName } from '../_models/visboproject';
import { VGGroup, VGGroupExpanded, VGPermission, VGUserGroup, VGPVC, VGPVP } from '../_models/visbogroup';
import { getErrorMessage, visboCmpString, visboCmpDate } from '../_helpers/visbo.helper';

@Component({
  selector: 'app-visboproject-detail',
  templateUrl: './visboproject-detail.component.html',
  styleUrls: ['./visboproject-detail.component.css']
})
export class VisboprojectDetailComponent implements OnInit {

  @Input() visboproject: VisboProject;
  newUserInvite = new VisboUserInvite();
  newVariant: VPVariant;
  vgUsers: VGUserGroup[];
  vgGroups: VGGroup[];
  vgGroupsInvite: VGGroup[];
  actGroup = new VGGroupExpanded();
  confirm: string;
  userIndex: number;
  groupIndex: number;
  actView = 'User';
  expandProperties = false;

  currentUser: VisboUser;
  combinedPerm: VGPermission = undefined;
  combinedUserPerm: VGPermission = undefined;
  permVC = VGPVC;
  permVP = VGPVP;
  deleted = false;

  sortUserColumn = 1;
  sortUserAscending = true;
  sortGroupColumn = 1;
  sortGroupAscending = true;
  sortVariantColumn = 1;
  sortVariantAscending = true;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private visboprojectService: VisboProjectService,
    private location: Location,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.deleted = this.route.snapshot.queryParams['deleted'] ? true : false;
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.getVisboProject();
    this.getVisboProjectUsers();
  }

  getVisboProject(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log('VisboProject Detail of: ' + id);
    this.visboprojectService.getVisboProject(id, false, this.deleted)
      .subscribe(
        visboproject => {
          this.visboproject = visboproject;
          this.translateCustomFields(this.visboproject);
          this.combinedPerm = visboproject.perm;
          this.titleService.setTitle(this.translate.instant('vpDetail.titleName', {name: visboproject.name}));
          this.log(`Get VisboProject for VP ${id} Perm ${JSON.stringify(this.combinedPerm)} `);
        },
        error => {
          this.log(`get VPs failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPerm');
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

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

  hasVCPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vc & perm) > 0;
  }

  hasVPPerm(perm: number): boolean {
    if (this.combinedPerm === undefined) {
      return false;
    }
    return (this.combinedPerm.vp & perm) > 0;
  }

  hasUserVPPerm(perm: number): boolean {
    if (this.combinedUserPerm === undefined) {
      return false;
    }
    // this.log(`Has User VP Permission ${perm}? ${(this.combinedUserPerm.vp & perm) > 0} `);
    return (this.combinedUserPerm.vp & perm) > 0;
  }

  getVPPerm(): number {
    if (this.combinedPerm === undefined) {
      return 0;
    }
    return this.combinedPerm.vp;
  }

  viewRestriction(): boolean {
    if (!this.visboproject.restrict || !this.visboproject.restrict.length) {
      return false;
    }
    let perm = this.combinedPerm.vp || 0;
    perm = perm & (this.permVP.Modify + this.permVP.ManagePerm + this.permVP.DeleteVP);
    return perm > 0;
  }

  getVPType(vpType: number): string {
    return this.translate.instant('vp.type.vpType' + vpType);
  }

  toggleView(newView: string): void {
    this.actView = newView;
  }

  getVisboProjectUsers(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.log(`VisboProject UserList of: ${id} Deleted ${this.deleted}`);
    this.visboprojectService.getVPUsers(id, false, this.deleted)
      .subscribe(
        mix => {
          this.vgUsers = mix.users;
          this.vgGroups = mix.groups;
          this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');

          this.log(`fetched Users ${this.vgUsers.length}, Groups ${this.vgGroups.length}, Invite Groups ${this.vgGroupsInvite.length}`);
          this.sortUserTable();
          this.sortGroupTable();
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

  goBack(): void {
    this.location.back();
  }

  delete(visboproject: VisboProject): void {
    this.visboprojectService.deleteVisboProject(visboproject, this.deleted)
      .subscribe(
        () => {
          const message = this.translate.instant('vpDetail.msg.removeProjectSuccess', {'name': this.visboproject.name});
          this.alertService.success(message, true);
          this.log(`delete VP success`);
          // could not use go back as it is used from different places and produces access denied if it returns to KeyMetrics View
          this.router.navigate(['vp/'.concat(visboproject.vcid)], this.deleted ? { queryParams: { view: 'Deleted' }} : {});
        },
        error => {
          this.log(`delete VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': visboproject.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  gotoVPRestriction(visboproject: VisboProject): void {
    this.log(`goto VP Restriction: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vpRestrict/'.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVPAudit(visboproject: VisboProject): void {
    this.log(`goto VP Audit: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vpAudit/'.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVCDetail(visboproject: VisboProject): void {
    this.router.navigate(['vcDetail/'.concat(visboproject.vcid)]);
  }

  gotoVPList(visboproject: VisboProject): void {
    this.log(`goto VP List: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vp/'.concat(visboproject.vcid)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVP(visboproject: VisboProject): void {
    this.log(`goto VP: ${visboproject._id} Deleted ${this.deleted}`);
    let url = 'vpKeyMetrics/';
    if (visboproject.vpType === VPTYPE['Portfolio']) {
      url = 'vpf/';
    }
    this.router.navigate([url.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  gotoVPView(visboproject: VisboProject): void {
    this.log(`goto VP List: ${visboproject._id} Deleted ${this.deleted}`);
    this.router.navigate(['vpv/'.concat(visboproject._id)], this.deleted ? { queryParams: { deleted: this.deleted }} : {});
  }

  save(): void {
    if (this.visboproject.customFieldString) {
      this.visboproject.customFieldString = this.visboproject.customFieldString.filter(item => item.value != '');
    }
    if (this.visboproject.customFieldDouble) {
      this.visboproject.customFieldDouble = this.visboproject.customFieldDouble.filter(item => item.value != undefined);
    }
    this.visboprojectService.updateVisboProject(this.visboproject, this.deleted)
      .subscribe(
        () => {
          const message = this.translate.instant('vpDetail.msg.updateProjectSuccess', {'name': this.visboproject.name});
          this.alertService.success(message, true);
          this.goBack();
        },
        error => {
          this.log(`save VP failed: error: ${error.status} message: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorPermVP', {'name': this.visboproject.name});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpDetail.msg.errorVPConflict', {'name': this.visboproject.name});
            this.alertService.error(message);
          } else {
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  addNewVPUser(): void {
    const email = this.newUserInvite.email.trim();
    const groupName = this.newUserInvite.groupName.trim();
    const inviteGroup = this.vgGroups.filter(group => group.name === groupName)[0];
    const groupid = inviteGroup._id;
    let inviteMessage = '';
    if (this.newUserInvite.inviteMessage) {
      inviteMessage = this.newUserInvite.inviteMessage.trim();
    }
    const vpid = this.visboproject._id;

    this.log(`Add VisboProject User: ${email} Group: ${groupName}/${groupid} VP: ${vpid}`);
    if (!email || !groupid) { return; }
    this.visboprojectService.addVPUser(email, groupid, inviteMessage, vpid )
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
          const message = this.translate.instant('vpDetail.msg.addUserSuccess', {'name': email});
          this.alertService.success(message);
        },
        error => {
          this.log(`Add VisboProject User error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorAddUserPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during add VP user ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  initVPVariant(variant: VPVariant): void {
    this.newVariant = new VPVariant();
    if (variant) {
      this.newVariant._id = variant._id;
      this.newVariant.variantName = variant.variantName;
      this.newVariant.description = variant.description;
      this.newVariant.email = variant.email;
      this.newVariant.vpvCount = variant.vpvCount;
    }
  }

  addNewVPVariant(): void {
    if (!this.newVariant || !this.newVariant.variantName || !this.newVariant.variantName.trim()) {
      // ignore empty variant
      return;
    }
    this.newVariant.variantName = this.newVariant.variantName.trim();
    this.newVariant.description =  (this.newVariant.description || '').trim();
    this.visboprojectService.createVariant(this.newVariant, this.visboproject._id )
      .subscribe(
        variant => {
          // Add Variant to list
          this.visboproject.variant.push(variant);
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

  changeVPVariant(): void {
    if (!this.newVariant) {
      return;
    }
    this.newVariant.description =  (this.newVariant.description || '').trim();
    const variant = this.visboproject.variant.find(variant => variant._id.toString() == this.newVariant._id.toString());
    if (!variant || variant.description == this.newVariant.description) {
      this.log(`Change Variant not found or not changed: ${variant?.variantName} ${variant?.description}`);
      return;
    }
    this.visboprojectService.updateVariant(this.newVariant, this.visboproject._id )
      .subscribe(
        variant => {
          // Update Variant in list
          const index = this.visboproject.variant.findIndex(variant => variant._id.toString() == this.newVariant._id.toString());
          this.visboproject.variant[index].description = variant.description;
          const message = this.translate.instant('vpDetail.msg.changeVariantSuccess', {'name': variant.variantName});
          this.alertService.success(message);
        },
        error => {
          this.log(`Change Variant error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorChangeVariantPerm', {'name': this.newVariant.variantName});
            this.alertService.error(message);
          } else {
            this.log(`Error during change Variant ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
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
        this.combinedUserPerm.vp = this.combinedUserPerm.vp | (this.vgGroups[indexGroup].permission.vp || 0);
      } else {
        this.log(`Permission for Group not set ${listUser.groupName}`);
      }
    } else {
      this.log(`Group not found ${listUser.groupName}`);
    }
  }

  helperRemoveUser(memberIndex: number): void {
    // this.log(`Remove User Helper: ${userIndex}`);
    this.userIndex = memberIndex;
  }

  helperRemoveGroup(memberIndex: number): void {
    this.groupIndex = memberIndex;
  }

/*
<button  *ngIf="!variant.vpvCount && hasVPPerm(permVP.Modify) && getLockStatus(variantIndex) <= 1" id="ColDeleteVariant" class="Detail"
  title="{{ 'vpDetail.lbl.deleteVariant' | translate }}" (click)='helperRemoveVariant(variantIndex)'
  data-toggle="modal" data-target="#VpVariantRemove">&times;
</button>
<button  *ngIf="!variant.vpvCount && !hasVPPerm(permVP.Modify) && hasVPPerm(permVP.CreateVariant) && getLockStatus(variantIndex) <= 1 && variant.email == currentUser.email" id="ColDeleteVariant" class="Detail"
  title="{{ 'vpDetail.lbl.deleteVariant' | translate }}" (click)='helperRemoveVariant(variantIndex)'
  data-toggle="modal" data-target="#VpVariantRemove">&times;
</button>
*/

  canDeleteVariant(variant: VPVariant): boolean {
    if (!variant || variant.vpvCount || this.getLockStatus(variant) > 1 ) {
      return false;
    } else if (this.hasVPPerm(this.permVP.Modify) || (this.hasVPPerm(this.permVP.CreateVariant) && variant.email == this.currentUser.email)) {
      return true;
    } else {
      return false;
    }
  }

  helperUsersPerGroup(groupId: string): number {
    const group = this.vgGroups && this.vgGroups.find(x => x._id === groupId);
    if (group) {
      return group.users.length;
    }
    return 0;
  }

  removeVPUser(user: VGUserGroup, vpid: string): void {
    this.log(`Remove VisboProject User: ${user.email}/${user.userId} Group: ${user.groupName} VP: ${vpid}`);
    this.visboprojectService.deleteVPUser(user, vpid)
      .subscribe(
        () => {
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
          const message = this.translate.instant('vpDetail.msg.removeUserSuccess', {'name': user.email});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject User error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorRemoveUserPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove User from VP user ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  removeVariant(variant: VPVariant, vp: VisboProject): void {
    this.log(`Remove VisboProject Variant: ${variant.variantName} VP: ${vp._id}`);
    this.visboprojectService.deleteVariant(variant._id, vp._id)
      .subscribe(
        () => {
          const message = this.translate.instant('vpDetail.msg.removeVariantSuccess', {'name': variant.variantName});
          let index = this.visboproject.variant.findIndex(item => item.variantName === variant.variantName);
          if (index >= 0) {
            this.visboproject.variant.splice(index, 1);
          }
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject Variant error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorRemoveVariantPerm', {'name': variant.variantName});
            this.alertService.error(message);
          } else if (error.status === 409) {
            const message = this.translate.instant('vpDetail.msg.errorRemoveVariantConflict', {'name': variant.variantName});
            this.alertService.error(message);
          } else {
            this.log(`Error during remove Variant from VP ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  helperVPPerm(newGroup: VGGroupExpanded): number {
    let perm = 0;
    if (newGroup.checkedVPViewRestricted) {
      perm += this.permVP.ViewRestricted;
    }
    if (newGroup.checkedVPView) {
      perm += this.permVP.View;
    }
    if (newGroup.checkedVPViewAudit) {
      perm += this.permVP.ViewAudit;
    }
    if (newGroup.checkedVPModify) {
      perm += this.permVP.Modify;
    }
    if (newGroup.checkedCreateVariant) {
      perm += this.permVP.CreateVariant;
    }
    if (newGroup.checkedVPManagePerm) {
      perm += this.permVP.ManagePerm;
    }
    if (newGroup.checkedVPDelete) {
      perm += this.permVP.DeleteVP;
    }

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
      this.confirm = (curGroup.groupType === 'VP') ? 'Modify' : 'View';
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

      this.actGroup.checkedVPViewRestricted = (curGroup.permission.vp & this.permVP.ViewRestricted) > 0;
      this.actGroup.checkedVPView = (curGroup.permission.vp & this.permVP.View) > 0;
      this.actGroup.checkedVPViewAudit = (curGroup.permission.vp & this.permVP.ViewAudit) > 0;
      this.actGroup.checkedVPModify = (curGroup.permission.vp & this.permVP.Modify) > 0;
      this.actGroup.checkedCreateVariant = (curGroup.permission.vp & this.permVP.CreateVariant) > 0;
      this.actGroup.checkedVPManagePerm = (curGroup.permission.vp & this.permVP.ManagePerm) > 0;
      this.actGroup.checkedVPDelete = (curGroup.permission.vp & this.permVP.DeleteVP) > 0;
    } else {
      this.confirm = 'Add';
      this.actGroup._id = undefined;
      this.actGroup.name = '';
      this.actGroup.groupType = 'VP';
      this.actGroup.internal = false;
      this.actGroup.global = false;
      this.actGroup.checkedView = true;
    }
    this.log(`Init Group for Creation / Modification: ${this.actGroup.name} ID ${this.actGroup._id} Action ${this.confirm} `);
  }

  addModifyVPGroup(): void {
    const newGroup = new VGGroup;
    if (this.actGroup.global || !this.hasVPPerm(this.permVP.ManagePerm)) {
      // no modify of a global group or missing permission
      return;
    }

    this.log(`Modify VisboProject Group: Group: ${this.actGroup.name} VC: ${this.visboproject.vcid} VP: ${this.visboproject._id} }`);
    newGroup.name = this.actGroup.name.trim();
    newGroup.global = false;
    newGroup.vcid = this.visboproject.vcid;
    newGroup.vpids = [];
    newGroup.vpids.push(this.visboproject._id);
    newGroup.permission = new VGPermission;
    newGroup.permission.vp = this.helperVPPerm(this.actGroup);

    if (this.actGroup._id) {
      // modify existing Group
      this.log(`Modify VisboProject Group: Group: ${newGroup.name} VC: ${newGroup.vcid} Perm: ${JSON.stringify(newGroup.permission)}`);
      newGroup._id = this.actGroup._id;
      this.visboprojectService.modifyVPGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            this.log(`Modify VisboProject Group Push: ${JSON.stringify(group)}`);
            this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup._id !== newGroup._id);
            this.vgGroups.push(group);
            this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');
            // update User List to reflect new Group Name & ID
            for (let i = 0; i < this.vgUsers.length; i++) {
              if (this.vgUsers[i].groupId === newGroup._id) {
                this.vgUsers[i].groupName = group.name;
              }
            }
            this.sortUserTable();
            this.sortGroupTable();
            const message = this.translate.instant('vpDetail.msg.changeGroupSuccess', {'name': group.name});
            this.alertService.success(message);
          },
          error => {
            this.log(`Modify VisboProject Group error: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpDetail.msg.errorChangeGroupPerm');
              this.alertService.error(message);
            } else {
              this.log(`Error during modify VP Group ${error.error.message}`); // log to console instead
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    } else {
      // create new Group
      this.log(`Add VisboProject Group: Group: ${newGroup.name} VP: ${newGroup.vpids[0]} Perm: ${JSON.stringify(newGroup.permission)}`);
      this.visboprojectService.addVPGroup(newGroup)
        .subscribe(
          group => {
            // Add Group to Group list
            // this.log(`Add VisboCenter Group Push: ${JSON.stringify(group)}`);
            this.vgGroups.push(group);
            this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');
            const message = this.translate.instant('vpDetail.msg.createGroupSuccess', {'name': group.name});
            this.alertService.success(message);
          },
          error => {
            this.log(`Add VisboProject Group error: ${error.error.message}`);
            if (error.status === 403) {
              const message = this.translate.instant('vpDetail.msg.errorCreateGroupPerm');
              this.alertService.error(message);
            } else {
              this.log(`Error during add VP Group ${error.error.message}`);
              this.alertService.error(getErrorMessage(error));
            }
          }
        );
    }
  }

  removeVPGroup(group: VGGroup, vpid: string ): void {
    this.log(`Remove VisboProject Group: ${group.name}/${group._id} VP: ${vpid}`);
    this.visboprojectService.deleteVPGroup(group, vpid)
      .subscribe(
        response => {
          this.log(`Remove VisboProject Group result: ${JSON.stringify(response)}`);
          // filter user from vgUsers
          this.vgGroups = this.vgGroups.filter(vgGroup => vgGroup !== group);
          this.vgUsers = this.vgUsers.filter(vcUser => vcUser.groupId !== group._id);
          this.vgGroupsInvite = this.vgGroups.filter(vgGroup => vgGroup.groupType === 'VP');
          const message = this.translate.instant('vpDetail.msg.removeGroupSuccess', {'name': group.name});
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject Group error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorRemoveGroupPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove Group from VP user ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  getLockStatus(variant: VPVariant): number {
    let result = 0;
    const lock = this.visboproject.lock.find(item => item.variantName == variant.variantName)
    if (lock) {
      result = lock.email == this.currentUser.email ? 1 : 2;
    }
    return result;
  }

  unlockVP(lockIndex: number ): void {
    const vpid = this.visboproject._id;
    const variantName = this.visboproject.lock[lockIndex].variantName;
    const variant = this.visboproject.variant.find(item => item.variantName == variantName);
    const variantID = variant ? variant._id.toString() : '';
    this.log(`Remove VisboProject Lock: ${this.visboproject.name} Variant ${variantName} ${this.visboproject.lock[lockIndex].expiresAt} VPID: ${vpid}`);
    this.visboprojectService.unlockVP(variantID, vpid)
      .subscribe(
        response => {
          this.log(`Remove VisboProject Lock result: ${JSON.stringify(response)}`);
          for (let i = 0; i < this.visboproject.lock.length; i++) {
            if (this.visboproject.lock[i].variantName === variantName) {
              this.visboproject.lock.splice(i, 1);
              break;
            }
          }
          const message = this.translate.instant('vpDetail.msg.removeLockSuccess');
          this.alertService.success(message);
        },
        error => {
          this.log(`Remove VisboProject Lock error: ${error.error.message}`);
          if (error.status === 403) {
            const message = this.translate.instant('vpDetail.msg.errorRemoveLockPerm');
            this.alertService.error(message);
          } else {
            this.log(`Error during remove Lock from VP  ${error.error.message}`); // log to console instead
            this.alertService.error(getErrorMessage(error));
          }
        }
      );
  }

  getVPVersionsTotal(): number {
    let totalVersions = this.visboproject.vpvCount || 0;
    if (this.visboproject.variant) {
      this.visboproject.variant.forEach(variant => totalVersions += variant.vpvCount || 0);
    }
    return totalVersions;
  }

  sortUserTable(n?: number): void {

    if (!this.vgUsers) {
      return;
    }
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

  sortGroupTable(n?: number): void {

    if (!this.vgGroups) {
      return;
    }
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

  sortVariantTable(n?: number): void {

    if (!this.visboproject.variant) {
      return;
    }
    const variant = this.visboproject.variant
    // change sort order otherwise sort same column same direction
    if (n !== undefined || this.sortVariantColumn === undefined) {
      if (n !== this.sortVariantColumn) {
        this.sortVariantColumn = n;
        this.sortVariantAscending = undefined;
      }
      if (this.sortVariantAscending === undefined) {
        // sort name column ascending, number values desc first
        this.sortVariantAscending = (n === 1 || n === 2) ? true : false;
      } else {
        this.sortVariantAscending = !this.sortVariantAscending;
      }
    }
    if (this.sortVariantColumn === 1) {
      variant.sort(function(a, b) { return visboCmpString(a.variantName.toLowerCase(), b.variantName.toLowerCase()); });
    } else if (this.sortVariantColumn === 2) {
      variant.sort(function(a, b) { return visboCmpString(a.email.toLowerCase(), b.email.toLowerCase()); });
    } else if (this.sortVariantColumn === 3) {
      variant.sort(function(a, b) { return visboCmpDate(a.createdAt, b.createdAt); });
    } else if (this.sortVariantColumn === 4) {
      variant.sort(function(a, b) { return b.vpvCount - a.vpvCount; });
    }
    if (!this.sortVariantAscending) {
      variant.reverse();
    }
  }

  /** Log a VisboProjectService message with the MessageService */
  private log(message: string) {
    this.messageService.add('VisboProjectDetail: ' + message);
  }
}
