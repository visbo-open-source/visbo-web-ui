import Page from './page'

class VisboCenterPage extends Page {
    /**
     * define elements
     */
    get vcName () { return $('#VCName') }
    get vcDesc () { return $('#VCDesc') }
    get saveVC () { return $('#Save') }

    get vcHead () { return $('#VCHead') }
    get sortName () { return $('#SortName') }
    get sortDate () { return $('#SortDate') }
    get sortProjects () { return $('#SortProjects') }
    get vcList () { return $('#VCList') }
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
    get addGroupGlobal () { return $('#global') }
    get addGroupVPView () { return $('#permVP1') }
    get addGroupConfirm () { return $('#AddGroupConfirm') }
    get deleteGroupConfirm () { return $('#DeleteGroupConfirm') }

    /**
     * define or overwrite page methods
     */
    open () {
        super.open('/vc');
    }

    detail (vcID) {
        super.open('/vcDetail/'.concat(vcID));
    }

    rename(newName, newDescription) {
      this.vcName.waitForClickable({ timeoutMsg: 'VC Name should be clickable' });
      this.vcName.setValue(newName);
      this.vcDesc.setValue(newDescription);
      this.saveVC.click();
      this.saveVC.waitForClickable({ reverse: true, timeoutMsg: 'Save Button should disappear' });
      // console.log("Wait for Alert show up")
      // // Alert does not show up in case of two fast rename
      // this.alert.waitForDisplayed();
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

      this.deleteUserConfirm.waitForClickable({ reverse: true, timeoutMsg: 'User Delete Confirm Button should disappear' });
      this.alert.waitForDisplayed();
      return true;
    }

    addGroup(groupName, flagGlobal) {
      this.addGroupButton.click();
      // console.log("Add Group", groupName, flagGlobal);

      this.addGroupName.waitForClickable({ timeoutMsg: 'Field Group Name should show up' });
      this.addGroupName.setValue(groupName);
      if (flagGlobal) {
        this.addGroupGlobal.click();
        this.addGroupVPView.click();
      }
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

      this.deleteGroupConfirm.waitForClickable({ reverse: true, timeoutMsg: 'Delete Group Confirm Button should disappear' });
      this.alert.waitForDisplayed();
      return true;
    }

}

export default new VisboCenterPage()
