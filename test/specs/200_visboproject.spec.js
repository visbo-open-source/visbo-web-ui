import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'
import VisboProjectPage from '../pageobjects/visboproject.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let vpID = '';
let vpDeleteID = '';
let vcID = '';
let newGroupName = '';
let newUserName = '';
let newVPName = '';

let paramsMap;

describe('visboproject check', function () {
  it('login to system', function () {
    paramsMap = param.get();
    let email = paramsMap?.login?.email;
    let pw = paramsMap?.login?.pw;
    LoginPage.open()
    LoginPage.login(email, pw);

    LoginPage.alert.waitForDisplayed();
    let newUrl = browser.getUrl();
    console.log("URL:", newUrl);

    expectChai(browser.getUrl()).to.include('/dashboard');
  })

  it('should show full list of VPs and sorting works', function () {
    VisboProjectPage.open();
    // console.log("Sort VP by Date");
    VisboProjectPage.sortDate.click();
    const vpList = $('#VPList');
    const len = vpList.$$('tr').length;
    expectChai(len).to.be.gt(0, "No VPs");
    let vpLastDate = convert.convertDate(vpList.$$('tr')[0].$('#ColDate').getText());
    for (var i = 0; i < len; i++) {
      let vpEntry = vpList.$$('tr')[i];
      let vpDate = convert.convertDate(vpEntry.$('#ColDate').getText());
      // console.log("VP Date", i+1, vpEntry.$('#ColDate').getText(), vpDate, vpLastDate, vpDate.getTime() - vpLastDate.getTime());
      expectChai(vpLastDate).to.be.gte(vpDate, "Wrong Sorting by Date");
      vpLastDate = vpDate;
    }

    // console.log("Sort VP by Versions");
    VisboProjectPage.sortVersions.click();
    let vpLastProject = len > 0 ? Number(vpList.$$('tr')[0].$('#ColVersions').getText()) : 0;
    for (var i = 0; i < len; i++) {
      let vpEntry = vpList.$$('tr')[i];
      let vpProject = Number(vpEntry.$('#ColVersions').getText());
      // console.log("VP Projects", i+1, vpProject, vpLastProject, vpProject - vpLastProject);
      expectChai(vpLastProject).to.be.gte(vpProject, "Wrong Sorting by #Versions");
      vpLastProject = vpProject
    }

    // console.log("Sort VP by Name");
    VisboProjectPage.sortName.click();
    let vpLastName = len > 0 ? vpList.$$('tr')[0].$('#ColName').getText() : undefined;
    for (var i = 0; i < len; i++) {
      let vpEntry = vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText().valueOf();
      // console.log("VP Names", i+1, vpName, vpLastName, vpName <= vpLastName);
      expectChai(vpName.toLowerCase() >= vpLastName.toLowerCase()).to.be.eql(true, `Wrong Sorting by Name ${vpName} vs ${vpLastName}`);
      vpLastName = vpName
    }
  })

  it('should navigate to Details of a specific VP', function () {
    let vcConfigName = paramsMap?.VCBaseName || "Test-XX-VC";
    vcConfigName = vcConfigName.concat("01");
    let vpConfigName = paramsMap?.VPBaseName || "Test-XX-VP";
    vpConfigName = vpConfigName.concat("01");
    VisboProjectPage.open();
    // console.log("Show VP");
    const vpList = $('#VPList');
    const len = vpList.$$('tr').length;
    // console.log("VP List Len:", len, '\n', vpList.getText());
    for (var i = 0; i < len; i++) {
      let vpEntry = vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      let vcName = vpEntry.$('#ColVC').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == vpConfigName && vcName == vcConfigName) {
        console.log("go to VP Detail", vpName, ' of ', vcName);
        vpEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboProject ${vpConfigName} not found`);

    var newUrl = browser.getUrl();
    const match = '/vpDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to vpDetail");
    let index = newUrl.indexOf(match);
    index += match.length;
    vpID = newUrl.substr(index, 24);
  })

  it('Create VP Group', function () {
    VisboProjectPage.detail(vpID);

    const navBar = $('nav');
    // console.log("Navbar:", navBar.getText());
    expectChai(navBar.isClickable()).to.be.eql(true, "Navbar is Clickable")

    // console.log("Show VP Details, switch to Group");
    VisboProjectPage.showGroupButton.click();
    newGroupName = 'Delete-'.concat((new Date()).toISOString())
    console.log("Add new Group", newGroupName);
    VisboProjectPage.addGroup(newGroupName);
    // console.log("Add Group Check", newGroupName);
    VisboProjectPage.detail(vpID);
    // console.log("Show VP Details, switch to Group");
    VisboProjectPage.showGroupButton.click();
    const vpGroupList = $('#GroupList')
    const len = vpGroupList.$$('tr').length
    let i = 0;
    let groupEntry = undefined;
    for (i = 0; i < len; i++) {
      groupEntry = vpGroupList.$$('tr')[i];
      let groupName = groupEntry.$('#ColGroup').getText();
      // console.log("VP GroupName", i+1, groupName);
      if (groupName.indexOf(newGroupName) >= 0) {
        // console.log("Group Found", groupName);
        break;
      }
    }
    expectChai(groupEntry.$('#ColGroup').getText()).to.be.eql(newGroupName);
    expectChai(groupEntry.$('#ColGlobal').getText()).to.be.eql('');

    // console.log("Navbar:", navBar.getText(), navBar.isClickable());
    // browser.debug();
  })

  it('Add User to Group', function () {
    VisboProjectPage.detail(vpID);
    // console.log("Show VP Details, switch to Group");
    newUserName = paramsMap?.userRead;

    let message = (new Date()).toISOString();
    message = "Invitation from ".concat(message);
    message = paramsMap?.inviteMessage ? paramsMap?.inviteMessage.concat(message) : '';
    console.log("Add new User Group", newUserName, newGroupName);
    VisboProjectPage.addUser(newUserName, newGroupName, message);
    console.log("Add User Check", newGroupName);
    const vpUserList = $('#UserList')
    const len = vpUserList.$$('tr').length
    let i = 0;
    expectChai(len).to.be.gt(0, "No Members in VP");
    let userEntry, userName, groupName;
    for (i = 0; i < len; i++) {
      userEntry = vpUserList.$$('tr')[i];
      userName = userEntry.$('#ColUser').getText();
      groupName = userEntry.$('#ColGroup').getText();
      // console.log("VP User Entry", i+1, userName, groupName);
      if (groupName == newGroupName && userName == newUserName) {
        // console.log("Success: User/Group Entry Found", userName, groupName);
        break;
      }
    }
    expectChai(userName).to.be.eql(newUserName, "Wrong User Found");
    expectChai(groupName).to.be.eql(newGroupName, "Wrong Group Found");
  })

  it('Delete VP User from Group', function () {

    // console.log("Test Delete Group", newGroupName);
    // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

    VisboProjectPage.detail(vpID);
    // console.log("Show VP Details, switch to Group");
    console.log("Delete User from Group", newUserName, newGroupName);
    let result = VisboProjectPage.deleteUser(newUserName, newGroupName);
    // expect(result).toBe(false);
    console.log("Delete User from Group Result:", result)
    const vpUserList = $('#UserList')
    const len = vpUserList.$$('tr').length
    let i = 0;
    expectChai(len).to.be.gt(0, "No Members in VP");
    let userEntry, userName, groupName;
    for (i = 0; i < len; i++) {
      userEntry = vpUserList.$$('tr')[i];
      userName = userEntry.$('#ColUser').getText();
      groupName = userEntry.$('#ColGroup').getText();
      // console.log("VP User Entry", i+1, userName, groupName);
      if (groupName == newGroupName && userName == newUserName) {
        // console.log("Success: User/Group Entry Found", userName, groupName);
        break;
      }
    }
    expectChai(i).to.be.eql(len, "User still found:".concat(userName, '/', groupName));
  })

  it('Delete VP Group', function () {

    // console.log("Test Delete Group", newGroupName);
    // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

    VisboProjectPage.detail(vpID);
    // console.log("Show VP Details, switch to Group with Button", VisboProjectPage.showGroupButton.getText());
    VisboProjectPage.showGroupButton.click();
    // console.log("Delete Group", newGroupName);
    let result = VisboProjectPage.deleteGroup(newGroupName);
    // expect(result).toBe(false);
    console.log("Delete Group Result:", result)
    const vpGroupList = $('#GroupList')
    const len = vpGroupList.$$('tr').length
    expectChai(len).to.be.gt(0, "No Groups in VP");
    let i;
    let groupEntry, groupName;
    for (i = 0; i < len; i++) {
      groupEntry = vpGroupList.$$('tr')[i];
      groupName = groupEntry.$('#ColGroup').getText();
      // console.log("VP GroupName", i+1, groupName);
      if (groupName.indexOf(newGroupName) >= 0) {
        // console.log("Group Found", groupName);
        break;
      }
    }
    expectChai(groupEntry.$('#ColGroup').getText()).not.to.be.eql(newGroupName, "Group not Deleted");
  })

  it('Rename VP and Description', function () {

    // console.log("Test Delete Group", newGroupName);
    // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});

    VisboProjectPage.detail(vpID);
    VisboProjectPage.vpName.waitForDisplayed();

    let oldName = VisboProjectPage.vpName.getValue();
    let oldDescription = VisboProjectPage.vpDesc.getValue();
    let newName = oldName.concat("_Rename");
    let newDescription = oldDescription.concat("_Rename");
    console.log("Rename VP Property", newName, newDescription);
    VisboProjectPage.rename(newName, newDescription);
    console.log("Rename Done new URL:", browser.getUrl());

    VisboProjectPage.detail(vpID);
    VisboProjectPage.vpName.waitForDisplayed();
    expectChai(VisboProjectPage.vpName.getValue()).to.be.eql(newName);
    expectChai(VisboProjectPage.vpDesc.getValue()).to.be.eql(newDescription);
    VisboProjectPage.rename(oldName, oldDescription);
  })

  it('should navigate to VP List of a specific VC', function () {
    let vcConfigName = paramsMap?.VCBaseName || "Test-XX-VC";
    let countProjects = 0;
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
        countProjects = vcEntry.$('#ColProjects').getText()
        vcEntry.$('#ColName').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboCenter ${vcConfigName} not found`);
    var newUrl = browser.getUrl();
    const match = '/vp/';
    expectChai(newUrl).to.include(match, "Wrong redirect to VP List of VC");
    let index = newUrl.indexOf(match);
    index += match.length;
    vcID = newUrl.substr(index, 24);

    // Check that the number of Projects matches
    const vpList = $('#VPList');
    expectChai(vpList.$$('tr').length).to.be.eq(Number(countProjects), `VisboCenter ${vcConfigName} mismatch in count Projects`);

    // console.log("VCID:", vcID, newUrl);
  })

  it('should Create a new VP', function () {
    VisboProjectPage.open(vcID);
    newVPName = 'Delete-'.concat((new Date()).toISOString())
    let newVPDesc = 'Description of '.concat(newVPName);
    VisboProjectPage.create(newVPName, newVPDesc);
    VisboProjectPage.open(vcID);
    const vpList = $('#VPList');
    let len = vpList.$$('tr').length;
    // console.log("VP List Len:", len, '\n', vpList.getText());
    let i = 0;
    for (; i < len; i++) {
      let vpEntry = vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == newVPName) {
        console.log("found VP", vpName);
        vpEntry.$('button').click();
        break;
      }
    }

    // Check that the number of projects matches the number of items in list
    expectChai(i).to.be.lt(len, `VisboProject ${newVPName} not found`);

    // Check that name and description are correct
    VisboProjectPage.vpName.waitForDisplayed();
    expectChai(VisboProjectPage.vpName.getValue()).to.be.eql(newVPName, `VisboProject ${newVPName} wrong name`);
    expectChai(VisboProjectPage.vpDesc.getValue()).to.be.eql(newVPDesc, `VisboProject ${newVPName} wrong description`);

    // Check that the acting user is member of Project Admin Group
    let createUser = paramsMap?.login?.email;
    const userList = $('#UserList');
    len = userList.$$('tr').length;
    // console.log("User List Len:", len, '\n', userList.getText());
    for (i = 0; i < len; i++) {
      let vpEntry = userList.$$('tr')[i];
      let userName = vpEntry.$('#ColUser').getText();
      let groupName = vpEntry.$('#ColGroup').getText();
      // console.log("VP", i+1, vpName);
      if (userName == createUser && groupName == 'VISBO Project Admin') {
        console.log("found User for VP", userName);
        break;
      }
    }

    // Check that the number of projects matches the number of items in list
    expectChai(i).to.be.lt(len, `VisboProject ${newVPName} User not member of VISBO Project Admin Group`);

  })

  it('should Delete and Undelete a VP', function () {
    VisboProjectPage.open(vcID);
    expectChai(newVPName).not.eql('', `VisboProject ${newVPName} not defined for Delete`);

    let len = VisboProjectPage.vpList.$$('tr').length;
    // console.log("VP List Len:", len, '\n', vpList.getText());
    let i = 0;
    for (; i < len; i++) {
      let vpEntry = VisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == newVPName) {
        console.log("found VP", vpName);
        vpEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboProject ${newVPName} not found`);
    let newUrl = browser.getUrl();
    let match = '/vpDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to vpDetail");
    let index = newUrl.indexOf(match);
    index += match.length;
    vpDeleteID = newUrl.substr(index, 24);

    VisboProjectPage.delete(vpDeleteID);
    // check that it gets redirected to the VP List of VC
    newUrl = browser.getUrl();
    match = '/vp/'.concat(vcID);
    expectChai(newUrl).to.include(match, "Wrong redirect to vp");

    // Check that the Deleted VP is not in the list anymore
    len = VisboProjectPage.vpList.$$('tr').length;
    // console.log("VP List Len:", len, '\n', VisboProjectPage.vpList.getText());
    i = 0;
    for (; i < len; i++) {
      let vpEntry = VisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == newVPName) {
        console.log("found VP", vpName);
        break;
      }
    }
    expectChai(i).to.be.eql(len, `VisboProject ${newVPName} found after Delete`);

    // switch to Deleted to find the VP
    VisboProjectPage.deletedVP.click();

    VisboProjectPage.unDeletedVP.waitForDisplayed();
    len = VisboProjectPage.vpList.$$('tr').length;
    console.log("VP List Len:", len);
    i = 0;
    for (; i < len; i++) {
      let vpEntry = VisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == newVPName) {
        console.log("found VP", vpName);
        vpEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboProject ${newVPName} not found in Deleted`);
    newUrl = browser.getUrl();
    match = '/vpDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to vpDetail");
    // Restore deleted VP
    console.log("restore  VP", newVPName);
    VisboProjectPage.saveVP.waitForDisplayed();
    VisboProjectPage.saveVP.click();
  })

  it('should Delete and Destroy a VP', function () {
    expectChai(vpDeleteID).not.eql('', `VisboProject ID ${newVPName} not defined for Delete`);
    VisboProjectPage.open(vcID);
    VisboProjectPage.detail(vpDeleteID);

    console.log("Delete VP", vpDeleteID);
    VisboProjectPage.delete(vpDeleteID);
    // check that it gets redirected to the VP List of VC
    let newUrl = browser.getUrl();
    let match = '/vp/'.concat(vcID);
    expectChai(newUrl).to.include(match, "Wrong redirect to vp");

    // switch to Deleted to find the VP
    VisboProjectPage.deletedVP.click();
    VisboProjectPage.unDeletedVP.waitForDisplayed();
    let len = VisboProjectPage.vpList.$$('tr').length;
    console.log("VP List Len:", len);
    let i = 0;
    for (; i < len; i++) {
      let vpEntry = VisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == newVPName) {
        console.log("found VP", vpName);
        vpEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboProject ${newVPName} not found in Deleted`);

    console.log("destroy  VP", newVPName);
    VisboProjectPage.detail(vpDeleteID, true);
    VisboProjectPage.destroy(vpDeleteID);

    // Check that the VP is not in the Deleted list
    len = VisboProjectPage.vpList.$$('tr').length;
    console.log("VP Deleted List Len:", len);
    i = 0;
    for (; i < len; i++) {
      let vpEntry = VisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == newVPName) {
        console.log("found VP", vpName);
        break;
      }
    }
    expectChai(i).to.be.eq(len, `VisboProject ${newVPName} not Destroyed`);
  })
})
