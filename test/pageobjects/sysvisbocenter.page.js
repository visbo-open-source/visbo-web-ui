import Page from './page'

class SysVisboCenterPage extends Page {
    /**
     * define elements
     */
    get vcName () { return $('#VCName') }
    get vcDesc () { return $('#VCDesc') }
    get saveVC () { return $('#Save') }

    get createVC () { return $('#CreateVC') }
    get createVCName () { return $('#CreateVCName') }
    get createVCDesc () { return $('#CreateVCDesc') }
    get createVCConfirm () { return $('#CreateVCConfirm') }

    get deletedVC () { return $('#DeletedVC') }
    get unDeletedVC () { return $('#UnDeletedVC') }
    get deleteVC () { return $('#DeleteVC') }
    get destroyVC () { return $('#DestroyVC') }
    get deleteVCConfirm () { return $('#DeleteVCConfirm') }

    get vcHead () { return $('#VCHead') }
    get sortName () { return $('#SortName') }
    get sortDate () { return $('#SortDate') }
    get sortProjects () { return $('#SortProjects') }
    get vcList () { return $('#VCList') }
    get alert () { return $('app-alert') }

    get showUserButton () { return $('#ViewUser') }
    get addUserButton () { return $('#AddUser') }
    get userList () { return $('#UserList') }

    get addUserName () { return $('#AddUserName') }
    get addUserGroup () { return $('#AddUserGroupName') }
    get addUserMessage () { return $('#AddUserMessage') }

    get addUserConfirm () { return $('#AddUserConfirm') }
    get deleteUserConfirm () { return $('#DeleteUserConfirm') }

    get showGroupButton () { return $('#ViewGroup') }
    get addGroupButton () { return $('#AddGroup') }
    get groupList () { return $('#GroupList') }

    get addGroupName () { return $('#AddGroupName') }
    get addGroupGlobal () { return $('#global') }
    get addGroupVPView () { return $('#permVP1') }
    get addGroupConfirm () { return $('#AddGroupConfirm') }
    get deleteGroupConfirm () { return $('#DeleteGroupConfirm') }

    /**
     * define or overwrite page methods
     */
    open () {
      super.open('/sysvc');
      browser.pause(500);
    }

    detail (vcID, deleted) {
      let url = '/sysvcDetail/'.concat(vcID);
      if (deleted) url = url.concat('?deleted=1');
      console.log("sysvcDetail:", url);

      super.open(url);
      browser.pause(500);
    }

    create(newName, newDescription) {
      console.log("create", newName, newDescription);

      this.createVC.click();
      this.createVCName.waitForClickable({ timeoutMsg: 'Field VC Name should show up' });
      this.createVCName.setValue(newName);
      this.createVCDesc.setValue(newDescription);
      this.createVCConfirm.click();
    }

    delete(vcID) {
      console.log("delete", vcID);

      this.deleteVC.click();
      this.deleteVCConfirm.waitForClickable({ timeoutMsg: 'Delete VC Confirm should show up' });
      this.deleteVCConfirm.click();
      browser.pause(1000);
    }

    destroy(vcID) {
      console.log("destroy", vcID);

      this.destroyVC.click();
      this.deleteVCConfirm.waitForClickable({ timeoutMsg: 'Destroy VC Confirm should show up' });
      this.deleteVCConfirm.click();
      browser.pause(1000);
    }

    rename(newName, newDescription) {
      this.vcName.setValue(newName);
      this.vcDesc.setValue(newDescription);
      this.saveVC.click();
      browser.pause(500);
    }

    addUser(userName, groupName, message) {
      this.addUserButton.click();
      // console.log("Add User", userName, groupName);

      this.addUserName.waitForClickable({ timeoutMsg: 'Field User Name should show up' });
      this.addUserName.setValue(userName);
      this.addUserGroup.setValue(groupName);
      if (message) this.addUserMessage.setValue(message);

      this.addUserConfirm.click();
      // how can we improve this to wait until the modal is closed and refreshed
      browser.pause(500);
    }

    deleteUser(deleteUserName, deleteGroupName) {

      // console.log("Delete User from Group", deleteUserName, deleteGroupName);
      const len = this.userList.$$('tr').length
      let i = 0;
      let userEntry = undefined;
      for (i = 0; i < len; i++) {
        userEntry = this.userList.$$('tr')[i];
        let userName = userEntry.$('#ColUser').getText();
        let groupName = userEntry.$('#ColGroup').getText();
        // console.log("VC GroupName", i+1, userName, groupName);
        if (userName == deleteUserName && groupName == deleteGroupName) {
          // console.log("User / Group Found", userName, groupName);
          break;
        }
      }
      if (i == len) {
        console.log("User / Group Name to Delete not found:", deleteUserName, deleteGroupName);
        return false;
      }
      // initiate the delete
      // console.log("Click Delete Button for User");
      userEntry.$('#ColDeleteUser').click();

      this.deleteUserConfirm.waitForClickable({ timeout: 1000, timeoutMsg: 'Modal delete should show up' });
      this.deleteUserConfirm.click();
      // how can we improve this to wait until the modal is fully operable
      browser.pause(500);
      return true;
    }

    addGroup(groupName, flagGlobal) {
      this.addGroupButton.click();
      // console.log("Add Group", groupName, flagGlobal);

      // how can we improve this to wait until the modal is fully operable
      // $('#AddGroupConfirm').waitForVisible(1000);
      // $('#AddGroupName').waitForExist({ timeout: 5000 });
      // $('#AddGroupConfirm').waitForExist({ timeout: 5000 });
      // browser.pause(500);
      this.addGroupName.waitForClickable({ timeoutMsg: 'Field Group Name should show up' });
      this.addGroupName.setValue(groupName);
      if (flagGlobal) {
        this.addGroupGlobal.click();
        this.addGroupVPView.click();
      }
      this.addGroupConfirm.click();
      // how can we improve this to wait until the modal is fully operable
      browser.pause(500);
    }

    deleteGroup(deleteGroupName) {

      // console.log("Delete Group", deleteGroupName);
      const len = this.groupList.$$('tr').length
      let i = 0;
      let groupEntry = undefined;
      for (i = 0; i < len; i++) {
        groupEntry = this.groupList.$$('tr')[i];
        let groupName = groupEntry.$('#ColGroup').getText();
        // console.log("VC GroupName", i+1, groupName);
        if (groupName == deleteGroupName) {
          // console.log("Group Found", groupName);
          break;
        }
      }
      if (i == len) {
        // console.log("Group Name to Delete not found:", deleteGroupName);
        return false;
      }
      // initiate the delete
      // console.log("Click Delete Button for Group", groupEntry.$('#ColGroup').getText());
      groupEntry.$('#ColDeleteGroup').click();

      this.deleteGroupConfirm.waitForClickable({ timeout: 1000, timeoutMsg: 'Modal delete should show up' });
      this.deleteGroupConfirm.click();
      // how can we improve this to wait until the modal is fully operable
      browser.pause(500);
      return true;
    }

}

export default new SysVisboCenterPage()
