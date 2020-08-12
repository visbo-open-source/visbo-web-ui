import Page from './page'

class VisboCenterPage extends Page {
    /**
     * define elements
     */
    get vcHead () { return $('#VCHead') }
    get vcHeadName () { return $('#VCHeadName') }
    get vcHeadDate () { return $('#VCHeadDate') }
    get vcHeadProjects () { return $('#VCHeadProjects') }
    get vcList () { return $('#VCList') }
    get alert () { return $('#app-alert') }

    // get showGroupButton () { return $('#VCDetailGroup') }
    get addUserButton () { return $('#VCDetailAddUser') }
    get addUserName () { return $('#VCDetailAddUserName') }
    get addUserGroup () { return $('#VCDetailAddUserGroupName') }
    get addUserConfirm () { return $('#VCDetailUserConfirm') }
    get deleteUserConfirm () { return $('#VCDetailsDeleteUserConfirm') }

    get showGroupButton () { return $('#VCDetailGroup') }
    get addGroupButton () { return $('#VCDetailAddGroup') }
    get addGroupName () { return $('#VCDetailAddGroupName') }
    get addGroupGlobal () { return $('#global') }
    get addGroupVPView () { return $('#permVP1') }
    get addGroupConfirm () { return $('#VCDetailGroupConfirm') }
    get deleteGroupConfirm () { return $('#VCDetailsDeleteGroupConfirm') }

    /**
     * define or overwrite page methods
     */
    open () {
        super.open('/vc');
    }

    detail (vcID) {
        super.open('/vcDetail/'.concat(vcID));
    }

    addUser(userName, groupName) {
      this.addUserButton.click();
      console.log("Add User", userName, groupName);

      // how can we improve this to wait until the modal is fully operable
      // $('#VCDetailGroupConfirm').waitForVisible(1000);
      // $('#VCDetailAddGroupName').waitForExist({ timeout: 5000 });
      // $('#VCDetailGroupConfirm').waitForExist({ timeout: 5000 });
      // browser.pause(500);

      $('#VCDetailAddUserName').waitForClickable({ timeoutMsg: 'Field User Name should show up' });
      this.addUserName.setValue(userName);
      this.addUserGroup.setValue(groupName);

      this.addUserConfirm.click();
      // how can we improve this to wait until the modal is fully operable
      browser.pause(500);
    }

    addGroup(groupName, flagGlobal) {
      this.addGroupButton.click();
      console.log("Add Group", groupName, flagGlobal);

      // how can we improve this to wait until the modal is fully operable
      // $('#VCDetailGroupConfirm').waitForVisible(1000);
      // $('#VCDetailAddGroupName').waitForExist({ timeout: 5000 });
      // $('#VCDetailGroupConfirm').waitForExist({ timeout: 5000 });
      // browser.pause(500);
      $('#VCDetailAddGroupName').waitForClickable({ timeoutMsg: 'Field Group Name should show up' });
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

      console.log("Delete Group", deleteGroupName);
      const vcGroupList = $('#VCDetailGroupList')
      const len = vcGroupList.$$('tr').length
      let i = 0;
      let groupEntry = undefined;
      for (i = 0; i < len; i++) {
        groupEntry = vcGroupList.$$('tr')[i];
        let groupName = groupEntry.$('#VCDetailGroupListName').getText();
        // console.log("VC GroupName", i+1, groupName);
        if (groupName.indexOf(deleteGroupName) >= 0) {
          // console.log("Group Found", groupName);
          break;
        }
      }
      if (i == len) {
        console.log("Group Name to Delete not found:", deleteGroupName);
        return false;
      }
      // initiate the delete
      console.log("Click Delete Button for Group", groupEntry.$('#VCDetailGroupListName').getText());
      groupEntry.$('#VCDetailGroupDeleteButton').click();

      $('#VCDetailsDeleteGroupConfirm').waitForClickable({ timeout: 1000, timeoutMsg: 'Modal delete should show up' });
      this.deleteGroupConfirm.click();
      // how can we improve this to wait until the modal is fully operable
      browser.pause(500);
      return true;
    }

}

export default new VisboCenterPage()
