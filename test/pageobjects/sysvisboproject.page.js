import Page from './page'

class SysVisboProjectPage extends Page {
    /**
     * define elements
     */
    get vpName () { return $('#VPName') }
    get vpDesc () { return $('#VPDesc') }
    get saveVP () { return $('#Save') }

    get createVP () { return $('#CreateVP') }
    get createVPName () { return $('#CreateVPName') }
    get createVPDesc () { return $('#CreateVPDesc') }
    get createVPConfirm () { return $('#CreateVPConfirm') }

    get deletedVP () { return $('#DeletedVP') }
    get unDeletedVP () { return $('#UnDeletedVP') }
    get deleteVP () { return $('#DeleteVP') }
    get destroyVP () { return $('#DestroyVP') }
    get deleteVPConfirm () { return $('#DeleteVPConfirm') }

    get vpHead () { return $('#VPHead') }
    get sortName () { return $('#SortName') }
    get sortDate () { return $('#SortDate') }
    get sortVersions () { return $('#SortVersions') }
    get vpList () { return $('#VPList') }
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
    get addGroupVPView () { return $('#permVP1') }
    get addGroupConfirm () { return $('#AddGroupConfirm') }
    get deleteGroupConfirm () { return $('#DeleteGroupConfirm') }

    /**
     * define or overwrite page methods
     */
    open (vcid) {
      let url = vcid ? '/sysvp/'.concat(vcid) : '/sysvp'
      super.open(url);
      this.vpList.waitForDisplayed();
    }

    detail (vpID, deleted) {
      let url = '/sysvpDetail/'.concat(vpID);
      if (deleted) url = url.concat('?deleted=1');
      super.open(url);
      this.saveVP.waitForDisplayed()
    }

    create(newName, newDescription) {
      console.log("create", newName, newDescription);

      this.createVP.click();
      this.createVPName.waitForClickable({ timeoutMsg: 'Field Project Name should show up' });
      this.createVPName.setValue(newName);
      this.createVPDesc.setValue(newDescription);
      this.createVPConfirm.click();
    }

    delete(vpID) {
      console.log("delete", vpID);

      this.deleteVP.click();
      this.deleteVPConfirm.waitForClickable({ timeoutMsg: 'Delete VP Confirm should show up' });
      this.deleteVPConfirm.click();
      browser.pause(2000);
    }

    destroy(vpID) {
      console.log("destroy", vpID);

      this.destroyVP.click();
      this.deleteVPConfirm.waitForClickable({ timeoutMsg: 'Destroy VP Confirm should show up' });
      this.deleteVPConfirm.click();
      browser.pause(2000);
    }

    rename(newName, newDescription) {
      this.vpName.waitForClickable({ timeoutMsg: 'VP Name Field should show up' });
      this.vpName.setValue(newName);
      this.vpDesc.setValue(newDescription);
      this.saveVP.click();
      this.saveVP.waitForClickable({ reverse: true, timeoutMsg: 'Save Button should disappear' });
    }

    addUser(userName, groupName, message) {
      this.addUserButton.click();
      // console.log("Add User", userName, groupName);

      this.addUserName.waitForClickable({ timeoutMsg: 'Field User Name should show up' });
      this.addUserName.setValue(userName);
      this.addUserGroup.setValue(groupName);
      if (message) this.addUserMessage.setValue(message);

      this.addUserConfirm.click();
      this.addUserConfirm.waitForClickable({ reverse: true, timeoutMsg: 'Add User Confirm Button should disappear' });
      this.alert.waitForDisplayed();
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
        // console.log("VP GroupName", i+1, userName, groupName);
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
      this.deleteUserConfirm.waitForClickable({ reverse: true, timeoutMsg: 'Delete User Confirm Button should disappear' });
      this.alert.waitForDisplayed();
      return true;
    }

    addGroup(groupName) {
      this.addGroupButton.click();
      // console.log("Add Group", groupName);

      this.addGroupName.waitForClickable({ timeoutMsg: 'Field Group Name should show up' });
      this.addGroupName.setValue(groupName);
      this.addGroupVPView.click();
      this.addGroupConfirm.click();
      this.addGroupConfirm.waitForClickable({ reverse: true, timeoutMsg: 'Add Group Confirm Button should disappear' });
      this.alert.waitForDisplayed();
    }

    deleteGroup(deleteGroupName) {

      // console.log("Delete Group", deleteGroupName);
      const len = this.groupList.$$('tr').length
      let i = 0;
      let groupEntry = undefined;
      for (i = 0; i < len; i++) {
        groupEntry = this.groupList.$$('tr')[i];
        let groupName = groupEntry.$('#ColGroup').getText();
        // console.log("VP GroupName", i+1, groupName);
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
      this.deleteGroupConfirm.waitForClickable({ reverse: true, timeoutMsg: 'Delete Group Confirm Button should disappear' });
      this.alert.waitForDisplayed();
      return true;
    }

}

export default new SysVisboProjectPage()
