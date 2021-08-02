import Page from './page'

class VisboProjectPage extends Page {
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
    get alert () { return $('#alertMessage') }

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
      let url = vcid ? '/vp/'.concat(vcid) : '/vp'
      super.open(url);
      this.vpList.waitForDisplayed({ timeoutMsg: 'VP List should show up' });
    }

    detail (vpID, deleted) {
      let url = '/vpDetail/'.concat(vpID);
      if (deleted) url = url.concat('?deleted=1');
      super.open(url);
      this.vpName.waitForDisplayed({ timeoutMsg: 'Project Name in Details should show up' });
    }

    create(newName, newDescription) {
      console.log("create VP", newName, newDescription);

      this.createVP.click();
      this.createVPName.waitForClickable({ timeoutMsg: 'Field Project Name should show up' });
      this.createVPName.setValue(newName);
      this.createVPDesc.setValue(newDescription);
      this.createVPConfirm.click();
      this.alert.waitForDisplayed();
    }

    openDeleted (vcid) {
      let url = vcid ? '/vp/'.concat(vcid) : '/vp'
      url = url.concat('?deleted=1');
      super.open(url);
    }

    delete(vpID) {
      console.log("delete", vpID);

      this.deleteVP.click();
      this.deleteVPConfirm.waitForClickable({ timeoutMsg: 'Delete VP Confirm should show up' });
      console.log("delete confirm", vpID);
      this.deleteVPConfirm.click();
      // this.alert.waitForDisplayed();
      // have to wait, as the server updates it async
      browser.pause(2000);
    }

    destroy(vpID) {
      // let startDate = new Date();
      // console.log("destroy", vpID);

      this.destroyVP.click();
      this.deleteVPConfirm.waitForClickable({ timeoutMsg: 'Destroy VP Confirm should show up' });
      // console.log("destroy confirm", vpID);
      this.deleteVPConfirm.click();
      this.alert.waitForDisplayed();
      // let endDate = new Date();
      // console.log("Destroy took ", endDate.getTime() - startDate.getTime())
      // have to wait, as the server updates it async
      browser.pause(2000);
    }

    rename(newName, newDescription) {
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
      this.addUserConfirm.waitForClickable({ reverse: true, timeoutMsg: 'User Add Confirm Button should disappear' });
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
      this.deleteUserConfirm.waitForClickable({ reverse: true, timeoutMsg: 'User Add Confirm Button should disappear' });
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
      this.addGroupConfirm.waitForClickable({ reverse: true, timeoutMsg: 'User Add Confirm Button should disappear' });
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
      this.deleteGroupConfirm.waitForClickable({ reverse: true, timeoutMsg: 'User Add Confirm Button should disappear' });
      this.alert.waitForDisplayed();
      return true;
    }

}

export default new VisboProjectPage()
