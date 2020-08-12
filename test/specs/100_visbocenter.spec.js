import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'
let convert = require("../helper/convert")
let param = require("../helper/param");

let vcID = '';
let newGroupName = '';
let newUserName = '';

describe('visbocenter check', function () {
  it('login to system', function () {
    let paramsMap = param.get();
    let email = paramsMap?.login?.email;
    let pw = paramsMap?.login?.pw;
    LoginPage.open()
    LoginPage.login(email, pw);

    LoginPage.alert.waitForDisplayed();
  })

  it('should show full list of VCs and sorting works', function () {
      VisboCenterPage.open();
      // console.log("Show VC");
      VisboCenterPage.vcHeadDate.click();
      const vcList = $('#VCList');
      const len = vcList.$$('tr').length;
      let vcLastDate = len > 0 ? convert.convertDate(vcList.$$('tr')[0].$('#VCListDate').getText()) : undefined;
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vcDate = convert.convertDate(vcEntry.$('#VCListDate').getText());
        // console.log("VC Date", i+1, vcEntry.$('#VCListDate').getText(), vcDate, vcLastDate, vcDate.getTime() - vcLastDate.getTime());
        expect(vcDate.getTime() - vcLastDate.getTime() > 0).toBe(false);
        vcLastDate = vcDate;
      }

      VisboCenterPage.vcHeadProjects.click();
      let vcLastProject = len > 0 ? vcList.$$('tr')[0].$('#VCListProjects').getText().valueOf() : undefined;
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vcProject = vcEntry.$('#VCListProjects').getText().valueOf();
        // console.log("VC Projects", i+1, vcProject, vcLastProject, vcProject - vcLastProject);
        expect(vcProject - vcLastProject <= 0).toBe(true);
        vcLastProject = vcProject
      }
      VisboCenterPage.vcHeadName.click();
      let vcLastName = len > 0 ? vcList.$$('tr')[0].$('#VCListName').getText() : undefined;
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vcName = vcEntry.$('#VCListName').getText().valueOf();
        // console.log("VC Names", i+1, vcName, vcLastName, vcName <= vcLastName);
        expect(vcName >= vcLastName).toBe(true);
        vcLastName = vcName
      }
  })

  it('should navigate to Details of a specific VC', function () {
      VisboCenterPage.open();
      // console.log("Show VC");
      const vcList = $('#VCList');
      const len = vcList.$$('tr').length;
      // console.log("VC List Len:", len, '\n', vcList.getText());
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vc = vcEntry.$('#VCListName').getText();
        // console.log("VC", i+1, vc);
        if (vc.indexOf("Test-MS-VC01") >= 0) {
          console.log("go to VC Detail", vc);
          vcEntry.$('button').click();
          break;
        }
      }
      var newUrl = browser.getUrl();
      const match = 'vcDetail/';
      let index = newUrl.indexOf(match);
      // console.log("URL:", newUrl);
      // expect(newUrl).toHaveTextContaining(match);
      expect(index >= 0).toBe(true);
      index += match.length;
      vcID = newUrl.substr(index, 24);
      // console.log("VCID:", vcID, newUrl);
  })

  it('Create VC Group', function () {
      VisboCenterPage.detail(vcID);
      // console.log("Show VC Details, switch to Group");
      VisboCenterPage.showGroupButton.click();
      newGroupName = 'Delete-'.concat((new Date()).toISOString())
      console.log("Add new Group", newGroupName);
      VisboCenterPage.addGroup(newGroupName, true);
      console.log("Add Group Check", newGroupName);
      const vcGroupList = $('#VCDetailGroupList')
      const len = vcGroupList.$$('tr').length
      let i = 0;
      let groupEntry = undefined;
      for (i = 0; i < len; i++) {
        groupEntry = vcGroupList.$$('tr')[i];
        let groupName = groupEntry.$('#VCDetailGroupListName').getText();
        // console.log("VC GroupName", i+1, groupName);
        if (groupName.indexOf(newGroupName) >= 0) {
          // console.log("Group Found", groupName);
          break;
        }
      }
      expect(groupEntry.$('#VCDetailGroupListName').getText()).toBe(newGroupName);
      expect(groupEntry.$('#VCDetailGroupListGlobal').getText()).toBe('Global');
  })

  it('Add User to Group', function () {
      VisboCenterPage.detail(vcID);
      // console.log("Show VC Details, switch to Group");
      let paramsMap = param.get();
      newUserName = paramsMap?.userRead;

      console.log("Add new User Group", newUserName, newGroupName);
      VisboCenterPage.addUser(newUserName, newGroupName);
      console.log("Add User Check", newGroupName);
      const vcUserList = $('#VCDetailUserList')
      const len = vcUserList.$$('tr').length
      let i = 0;
      let userEntry = undefined;
      for (i = 0; i < len; i++) {
        userEntry = vcUserList.$$('tr')[i];
        let userName = userEntry.$('#VCDetailUserName').getText();
        let groupName = userEntry.$('#VCDetailUserGroupName').getText();
        console.log("VC User Entry", i+1, userName, groupName);
        if (groupName == newGroupName && userName == newUserName) {
          console.log("Error: User/Group Entry Found", userName, groupName);
          break;
        }
      }
      // expect(groupEntry.$('#VCDetailGroupListName').getText()).toBe(newGroupName);
      // expect(groupEntry.$('#VCDetailGroupListGlobal').getText()).toBe('Global');
      browser.pause(5000);
  })

  it('Delete VC Group', function () {

      // console.log("Test Delete Group", newGroupName);
      // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

      VisboCenterPage.detail(vcID);
      // console.log("Show VC Details, switch to Group");
      VisboCenterPage.showGroupButton.click();
      // console.log("Delete Group", newGroupName);
      let result = VisboCenterPage.deleteGroup(newGroupName);
      // expect(result).toBe(false);
      console.log("Delete Group Result:", result)
      const vcGroupList = $('#VCDetailGroupList')
      const len = vcGroupList.$$('tr').length
      let i = 0;
      let groupEntry = undefined;
      let groupFind = "Group not found";
      for (i = 0; i < len; i++) {
        groupEntry = vcGroupList.$$('tr')[i];
        let groupName = groupEntry.$('#VCDetailGroupListName').getText();
        // console.log("VC GroupName", i+1, groupName);
        if (groupName.indexOf(newGroupName) >= 0) {
          // console.log("Group Found", groupName);
          groupFind = "Group found";
          break;
        }
      }
      expect(groupEntry.$('#VCDetailGroupListName').getText()).not.toBe(newGroupName);

      console.log("Wait for Finish");
      browser.pause(5000);
  })
})
