import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

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
    let newUrl = browser.getUrl();
    console.log("URL:", newUrl);

    expectChai(browser.getUrl()).to.include('/dashboard');
  })

  it('should show full list of VCs and sorting works', function () {
    VisboCenterPage.open();
    // console.log("Show VC");
    VisboCenterPage.sortDate.click();
    const vcList = $('#VCList');
    const len = vcList.$$('tr').length;
    let vcLastDate = len > 0 ? convert.convertDate(vcList.$$('tr')[0].$('#ColDate').getText()) : undefined;
    for (var i = 0; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcDate = convert.convertDate(vcEntry.$('#ColDate').getText());
      // console.log("VC Date", i+1, vcEntry.$('#ColDate').getText(), vcDate, vcLastDate, vcDate.getTime() - vcLastDate.getTime());
      expectChai(vcLastDate).to.be.gte(vcDate, "Wrong Sorting by Date");
      vcLastDate = vcDate;
    }

    VisboCenterPage.sortProjects.click();
    let vcLastProject = len > 0 ? Number(vcList.$$('tr')[0].$('#ColProjects').getText()) : 0;
    for (var i = 0; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcProject = Number(vcEntry.$('#ColProjects').getText());
      // console.log("VC Projects", i+1, vcProject, vcLastProject, vcProject - vcLastProject);
      expectChai(vcLastProject).to.be.gte(vcProject, "Wrong Sorting by #Projects");
      vcLastProject = vcProject
    }
    VisboCenterPage.sortName.click();
    let vcLastName = len > 0 ? vcList.$$('tr')[0].$('#ColName').getText() : undefined;
    for (var i = 0; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText().valueOf();
      // console.log("VC Names", i+1, vcName, vcLastName, vcName <= vcLastName);
      expectChai(vcName.toLowerCase() >= vcLastName.toLowerCase()).to.be.eql(true, "Wrong Sorting by Name");
      vcLastName = vcName
    }
  })

  it('should navigate to Details of a specific VC', function () {
    let paramsMap = param.get();
    let vcConfigName = paramsMap?.VCBaseName || "Test-MS-VC01";
    vcConfigName = vcConfigName.concat("01");
    VisboCenterPage.open();
    // console.log("Show VC");
    const vcList = $('#VCList');
    const len = vcList.$$('tr').length;
    // console.log("VC List Len:", len, '\n', vcList.getText());
    for (var i = 0; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == vcConfigName) {
        console.log("go to VC Detail", vcName);
        vcEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboCenter ${vcConfigName} not found`);
    var newUrl = browser.getUrl();
    const match = '/vcDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to vcDetail");
    let index = newUrl.indexOf(match);
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
    // console.log("Add Group Check", newGroupName);
    VisboCenterPage.detail(vcID);
    // console.log("Show VC Details, switch to Group");
    VisboCenterPage.showGroupButton.click();
    const vcGroupList = $('#GroupList')
    const len = vcGroupList.$$('tr').length
    let i = 0;
    let groupEntry = undefined;
    for (i = 0; i < len; i++) {
      groupEntry = vcGroupList.$$('tr')[i];
      let groupName = groupEntry.$('#ColGroup').getText();
      // console.log("VC GroupName", i+1, groupName);
      if (groupName.indexOf(newGroupName) >= 0) {
        // console.log("Group Found", groupName);
        break;
      }
    }
    // expect(groupEntry.$('#ColGroup').getText()).toBe(newGroupName);
    // expect(groupEntry.$('#ColGlobal').getText()).toBe('Global');
    expectChai(groupEntry.$('#ColGroup').getText()).to.be.eql(newGroupName);
    expectChai(groupEntry.$('#ColGlobal').getText()).to.be.eql('Global');
  })

  it('Add User to Group', function () {
    VisboCenterPage.detail(vcID);
    // console.log("Show VC Details, switch to Group");
    let paramsMap = param.get();
    newUserName = paramsMap?.userRead;

    let message = (new Date()).toISOString();
    message = "Invitation from ".concat(message);
    console.log("Add new User Group", newUserName, newGroupName);
    VisboCenterPage.addUser(newUserName, newGroupName, message);
    console.log("Add User Check", newGroupName);
    const vcUserList = $('#UserList')
    const len = vcUserList.$$('tr').length
    let i = 0;
    expectChai(len).to.be.gt(0, "No Members in VC");
    let userEntry, userName, groupName;
    for (i = 0; i < len; i++) {
      userEntry = vcUserList.$$('tr')[i];
      userName = userEntry.$('#ColUser').getText();
      groupName = userEntry.$('#ColGroup').getText();
      // console.log("VC User Entry", i+1, userName, groupName);
      if (groupName == newGroupName && userName == newUserName) {
        // console.log("Success: User/Group Entry Found", userName, groupName);
        break;
      }
    }
    expectChai(userName).to.be.eql(newUserName, "Wrong User Found");
    expectChai(groupName).to.be.eql(newGroupName, "Wrong Group Found");
  })

  it('Delete VC User from Group', function () {

    // console.log("Test Delete Group", newGroupName);
    // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

    VisboCenterPage.detail(vcID);
    // console.log("Show VC Details, switch to Group");
    console.log("Delete User from Group", newUserName, newGroupName);
    let result = VisboCenterPage.deleteUser(newUserName, newGroupName);
    // expect(result).toBe(false);
    console.log("Delete User from Group Result:", result)
    const vcUserList = $('#UserList')
    const len = vcUserList.$$('tr').length
    let i = 0;
    expectChai(len).to.be.gt(0, "No Members in VC");
    let userEntry, userName, groupName;
    for (i = 0; i < len; i++) {
      userEntry = vcUserList.$$('tr')[i];
      userName = userEntry.$('#ColUser').getText();
      groupName = userEntry.$('#ColGroup').getText();
      // console.log("VC User Entry", i+1, userName, groupName);
      if (groupName == newGroupName && userName == newUserName) {
        // console.log("Success: User/Group Entry Found", userName, groupName);
        break;
      }
    }
    expectChai(i).to.be.eql(len, "User still found:".concat(userName, '/', groupName));
  })

  it('Delete VC Group', function () {

    // console.log("Test Delete Group", newGroupName);
    // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

    VisboCenterPage.detail(vcID);
    // console.log("Show VC Details, switch to Group with Button", VisboCenterPage.showGroupButton.getText());
    VisboCenterPage.showGroupButton.click();
    // console.log("Delete Group", newGroupName);
    let result = VisboCenterPage.deleteGroup(newGroupName);
    // expect(result).toBe(false);
    console.log("Delete Group Result:", result)
    const vcGroupList = $('#GroupList')
    const len = vcGroupList.$$('tr').length
    expectChai(len).to.be.gt(0, "No Groups in VC");
    let i;
    let groupEntry, groupName;
    for (i = 0; i < len; i++) {
      groupEntry = vcGroupList.$$('tr')[i];
      groupName = groupEntry.$('#ColGroup').getText();
      // console.log("VC GroupName", i+1, groupName);
      if (groupName.indexOf(newGroupName) >= 0) {
        // console.log("Group Found", groupName);
        break;
      }
    }
    expectChai(groupEntry.$('#ColGroup').getText()).not.to.be.eql(newGroupName, "Group not Deleted");
  })

  it('Rename VC and Description', function () {

    // console.log("Test Delete Group", newGroupName);
    // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

    VisboCenterPage.detail(vcID);
    VisboCenterPage.vcName.waitForDisplayed();

    let oldName = VisboCenterPage.vcName.getValue();
    let oldDescription = VisboCenterPage.vcDesc.getValue();
    let newName = oldName.concat("_Rename");
    let newDescription = oldDescription.concat("_Rename");
    console.log("Rename VC Property", newName, newDescription);
    VisboCenterPage.rename(newName, newDescription);
    console.log("Rename Done new URL:", browser.getUrl());

    VisboCenterPage.detail(vcID);
    VisboCenterPage.vcName.waitForDisplayed();
    expectChai(VisboCenterPage.vcName.getValue()).to.be.eql(newName);
    expectChai(VisboCenterPage.vcDesc.getValue()).to.be.eql(newDescription);
    VisboCenterPage.rename(oldName, oldDescription);
  })
})
