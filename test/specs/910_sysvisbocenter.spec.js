import LoginPage from '../pageobjects/login.page'
import SysVisboCenterPage from '../pageobjects/sysvisbocenter.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let vcID = '';
let vcDeleteID = '';
let newGroupName = '';
let newUserName = '';
let newVCName = '';

let paramsMap;

describe('sysvisbocenter check', function () {
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

  // it('should show full list of VCs and sorting works', function () {
  //   SysVisboCenterPage.open();
  //   // console.log("Show VC");
  //   SysVisboCenterPage.sortDate.click();
  //   browser.pause();
  //   const vcList = $('#VCList');
  //   const len = vcList.$$('tr').length;
  //   let vcLastDate = len > 0 ? convert.convertDate(vcList.$$('tr')[0].$('#ColDate').getText()) : undefined;
  //   for (var i = 0; i < len; i++) {
  //     let vcEntry = vcList.$$('tr')[i];
  //     let vcDate = convert.convertDate(vcEntry.$('#ColDate').getText());
  //     // console.log("VC Date", i+1, vcEntry.$('#ColDate').getText(), vcDate, vcLastDate, vcDate.getTime() - vcLastDate.getTime());
  //     expectChai(vcLastDate).to.be.gte(vcDate, "Wrong Sorting by Date");
  //     vcLastDate = vcDate;
  //   }
  //
  //   SysVisboCenterPage.sortProjects.click();
  //   browser.pause();
  //   let vcLastProject = len > 0 ? Number(vcList.$$('tr')[0].$('#ColProjects').getText()) : 0;
  //   for (var i = 0; i < len; i++) {
  //     let vcEntry = vcList.$$('tr')[i];
  //     let vcProject = Number(vcEntry.$('#ColProjects').getText());
  //     // console.log("VC Projects", i+1, vcProject, vcLastProject, vcProject - vcLastProject);
  //     expectChai(vcLastProject).to.be.gte(vcProject, "Wrong Sorting by #Projects");
  //     vcLastProject = vcProject
  //   }
  //   SysVisboCenterPage.sortName.click();
  //   browser.pause();
  //   let vcLastName = len > 0 ? vcList.$$('tr')[0].$('#ColName').getText() : undefined;
  //   for (var i = 0; i < len; i++) {
  //     let vcEntry = vcList.$$('tr')[i];
  //     let vcName = vcEntry.$('#ColName').getText().valueOf();
  //     // console.log("VC Names", i+1, vcName, vcLastName, vcName <= vcLastName);
  //     expectChai(vcName.toLowerCase() >= vcLastName.toLowerCase()).to.be.eql(true, "Wrong Sorting by Name");
  //     vcLastName = vcName
  //   }
  // })
  //
  // it('should navigate to Details of a specific VC', function () {
  //   let vcConfigName = paramsMap?.VCBaseName || "Test-XX-VC";
  //   vcConfigName = vcConfigName.concat("01");
  //   SysVisboCenterPage.open();
  //   // console.log("Show VC");
  //   const vcList = $('#VCList');
  //   const len = vcList.$$('tr').length;
  //   // console.log("VC List Len:", len, '\n', vcList.getText());
  //   for (var i = 0; i < len; i++) {
  //     let vcEntry = vcList.$$('tr')[i];
  //     let vcName = vcEntry.$('#ColName').getText();
  //     // console.log("VC", i+1, vcName);
  //     if (vcName == vcConfigName) {
  //       console.log("go to VC Detail", vcName);
  //       vcEntry.$('button').click();
  //       break;
  //     }
  //   }
  //   expectChai(i).to.be.lt(len, `VisboCenter ${vcConfigName} not found`);
  //   var newUrl = browser.getUrl();
  //   const match = '/sysvcDetail/';
  //   expectChai(newUrl).to.include(match, "Wrong redirect to vcDetail");
  //   let index = newUrl.indexOf(match);
  //   index += match.length;
  //   vcID = newUrl.substr(index, 24);
  //   // console.log("VCID:", vcID, newUrl);
  // })
  //
  // it('Create VC Group', function () {
  //
  //   // create new Group not supported in sysVC
  //   newGroupName = 'VISBO Center Admin';
  //
  //   // SysVisboCenterPage.detail(vcID);
  //   // // console.log("Show VC Details, switch to Group");
  //   // SysVisboCenterPage.showGroupButton.click();
  //   // newGroupName = 'Delete-'.concat((new Date()).toISOString())
  //   // console.log("Add new Group", newGroupName);
  //   // SysVisboCenterPage.addGroup(newGroupName, true);
  //   // // console.log("Add Group Check", newGroupName);
  //   SysVisboCenterPage.detail(vcID);
  //   // console.log("Show VC Details, switch to Group");
  //   SysVisboCenterPage.showGroupButton.click();
  //   const vcGroupList = $('#GroupList')
  //   const len = vcGroupList.$$('tr').length
  //   let i = 0;
  //   let groupEntry = undefined;
  //   for (i = 0; i < len; i++) {
  //     groupEntry = vcGroupList.$$('tr')[i];
  //     let groupName = groupEntry.$('#ColGroup').getText();
  //     // console.log("VC GroupName", i+1, groupName);
  //     if (groupName.indexOf(newGroupName) >= 0) {
  //       // console.log("Group Found", groupName);
  //       break;
  //     }
  //   }
  //   // expect(groupEntry.$('#ColGroup').getText()).toBe(newGroupName);
  //   // expect(groupEntry.$('#ColGlobal').getText()).toBe('Global');
  //   expectChai(groupEntry.$('#ColGroup').getText()).to.be.eql(newGroupName);
  //   expectChai(groupEntry.$('#ColGlobal').getText()).to.be.eql('Global');
  // })
  //
  // it('Add User to Group', function () {
  //   SysVisboCenterPage.detail(vcID);
  //   // console.log("Show VC Details, switch to Group");
  //   newUserName = paramsMap?.userRead;
  //
  //   let message = (new Date()).toISOString();
  //   message = "Invitation from ".concat(message);
  //   message = paramsMap?.inviteMessage ? paramsMap?.inviteMessage.concat(message) : '';
  //   console.log("Add new User Group", newUserName, newGroupName);
  //   SysVisboCenterPage.addUser(newUserName, newGroupName, message);
  //   console.log("Add User Check", newGroupName);
  //   const vcUserList = $('#UserList')
  //   const len = vcUserList.$$('tr').length
  //   let i = 0;
  //   expectChai(len).to.be.gt(0, "No Members in VC");
  //   let userEntry, userName, groupName;
  //   for (i = 0; i < len; i++) {
  //     userEntry = vcUserList.$$('tr')[i];
  //     userName = userEntry.$('#ColUser').getText();
  //     groupName = userEntry.$('#ColGroup').getText();
  //     // console.log("VC User Entry", i+1, userName, groupName);
  //     if (groupName == newGroupName && userName == newUserName) {
  //       // console.log("Success: User/Group Entry Found", userName, groupName);
  //       break;
  //     }
  //   }
  //   expectChai(userName).to.be.eql(newUserName, "Wrong User Found");
  //   expectChai(groupName).to.be.eql(newGroupName, "Wrong Group Found");
  // })
  //
  // it('Delete VC User from Group', function () {
  //
  //   // console.log("Test Delete Group", newGroupName);
  //   // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});
  //
  //   SysVisboCenterPage.detail(vcID);
  //   // console.log("Show VC Details, switch to Group");
  //   console.log("Delete User from Group", newUserName, newGroupName);
  //   let result = SysVisboCenterPage.deleteUser(newUserName, newGroupName);
  //   // expect(result).toBe(false);
  //   console.log("Delete User from Group Result:", result)
  //   const vcUserList = $('#UserList')
  //   const len = vcUserList.$$('tr').length
  //   let i = 0;
  //   expectChai(len).to.be.gt(0, "No Members in VC");
  //   let userEntry, userName, groupName;
  //   for (i = 0; i < len; i++) {
  //     userEntry = vcUserList.$$('tr')[i];
  //     userName = userEntry.$('#ColUser').getText();
  //     groupName = userEntry.$('#ColGroup').getText();
  //     // console.log("VC User Entry", i+1, userName, groupName);
  //     if (groupName == newGroupName && userName == newUserName) {
  //       // console.log("Success: User/Group Entry Found", userName, groupName);
  //       break;
  //     }
  //   }
  //   expectChai(i).to.be.eql(len, "User still found:".concat(userName, '/', groupName));
  // })
  //
  // // it('Delete VC Group', function () {
  // //   // Delete Internal Group not supported
  // //   // console.log("Test Delete Group", newGroupName);
  // //   // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});
  // //
  // //   SysVisboCenterPage.detail(vcID);
  // //   // console.log("Show VC Details, switch to Group with Button", SysVisboCenterPage.showGroupButton.getText());
  // //   SysVisboCenterPage.showGroupButton.click();
  // //   // console.log("Delete Group", newGroupName);
  // //   let result = SysVisboCenterPage.deleteGroup(newGroupName);
  // //   // expect(result).toBe(false);
  // //   console.log("Delete Group Result:", result)
  // //   const vcGroupList = $('#GroupList')
  // //   const len = vcGroupList.$$('tr').length
  // //   expectChai(len).to.be.gt(0, "No Groups in VC");
  // //   let i;
  // //   let groupEntry, groupName;
  // //   for (i = 0; i < len; i++) {
  // //     groupEntry = vcGroupList.$$('tr')[i];
  // //     groupName = groupEntry.$('#ColGroup').getText();
  // //     // console.log("VC GroupName", i+1, groupName);
  // //     if (groupName.indexOf(newGroupName) >= 0) {
  // //       // console.log("Group Found", groupName);
  // //       break;
  // //     }
  // //   }
  // //   expectChai(groupEntry.$('#ColGroup').getText()).not.to.be.eql(newGroupName, "Group not Deleted");
  // // })
  //
  // // it('Rename VC and Description', function () {
  // //
  // //   // Rename and change description not supported, perhaps we should check that they are no input fields
  // //   // console.log("Test Delete Group", newGroupName);
  // //   // expect(newGroupName).toHaveTextContaining('Delete-', {wait:0, message: "Group Name missing"});
  // //
  // //   SysVisboCenterPage.detail(vcID);
  // //   SysVisboCenterPage.vcName.waitForDisplayed();
  // //
  // //   let oldName = SysVisboCenterPage.vcName.getValue();
  // //   let oldDescription = SysVisboCenterPage.vcDesc.getValue();
  // //   let newName = oldName.concat("_Rename");
  // //   let newDescription = oldDescription.concat("_Rename");
  // //   console.log("Rename VC Property", newName, newDescription);
  // //   SysVisboCenterPage.rename(newName, newDescription);
  // //   console.log("Rename Done new URL:", browser.getUrl());
  // //
  // //   SysVisboCenterPage.detail(vcID);
  // //   SysVisboCenterPage.vcName.waitForDisplayed();
  // //   expectChai(SysVisboCenterPage.vcName.getValue()).to.be.eql(newName);
  // //   expectChai(SysVisboCenterPage.vcDesc.getValue()).to.be.eql(newDescription);
  // //   SysVisboCenterPage.rename(oldName, oldDescription);
  // // })
  //
  it('should Create a new VC', function () {
    SysVisboCenterPage.open();
    newVCName = paramsMap?.VCBaseName || "Test-XX-VC";
    newVCName = newVCName.concat('-Delete-',(new Date()).toISOString());
    let newVCDesc = 'Description of '.concat(newVCName);
    SysVisboCenterPage.create(newVCName, newVCDesc);
    SysVisboCenterPage.open();
    const vcList = $('#VCList');
    let len = vcList.$$('tr').length;
    // console.log("VC List Len:", len, '\n', vcList.getText());
    let i = 0;
    for (; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == newVCName) {
        console.log("found VC", vcName);
        vcEntry.$('button').click();
        break;
      }
    }

    // Check that the item was found in the list
    expectChai(i).to.be.lt(len, `VisboCenter ${newVCName} not found`);
    var newUrl = browser.getUrl();
    const match = '/sysvcDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to sysvcDetail");
    let index = newUrl.indexOf(match);
    index += match.length;
    vcID = newUrl.substr(index, 24);
    // Check that name and description are correct $('#VCName').getValue()
    SysVisboCenterPage.vcName.waitForDisplayed();
    expectChai(SysVisboCenterPage.vcName.getText()).to.be.eql(newVCName, `VisboCenter ${newVCName} wrong name`);
    expectChai(SysVisboCenterPage.vcDesc.getText()).to.be.eql(newVCDesc, `VisboCenter ${newVCName} wrong description`);

    // Check that the acting user is member of Project Admin Group
    let createUser = paramsMap?.login?.email;
    const userList = $('#UserList');
    len = userList.$$('tr').length;
    // console.log("User List Len:", len, '\n', userList.getText());
    for (i = 0; i < len; i++) {
      let vcEntry = userList.$$('tr')[i];
      let userName = vcEntry.$('#ColUser').getText();
      let groupName = vcEntry.$('#ColGroup').getText();
      // console.log("VC", i+1, vcName);
      if (userName == createUser && groupName == 'VISBO Center Admin') {
        console.log("found User for VC", userName);
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboCenter ${newVCName} User not member of VISBO Center Admin Group`);
  })

  it('should Delete and Undelete a VC', function () {
    SysVisboCenterPage.open();
    expectChai(newVCName).not.eql('', `VisboCenter ${newVCName} not defined for Delete`);

    const vcList = $('#VCList');
    let len = vcList.$$('tr').length;
    // console.log("VC List Len:", len, '\n', vcList.getText());
    let i = 0;
    for (; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == newVCName) {
        console.log("found VC", vcName);
        vcEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboCenter ${newVCName} not found`);
    let newUrl = browser.getUrl();
    let match = '/sysvcDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to sysvcDetail");
    let index = newUrl.indexOf(match);
    index += match.length;
    vcDeleteID = newUrl.substr(index, 24);

    SysVisboCenterPage.delete(vcDeleteID);
    // check that it gets redirected to the VC List
    newUrl = browser.getUrl();
    match = '/sysvc';
    expectChai(newUrl).to.include(match, "Wrong redirect to vc");

    // Check that the Deleted VC is not in the list anymore
    len = vcList.$$('tr').length;
    // console.log("VC List Len:", len, '\n', vcList.getText());
    i = 0;
    for (; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == newVCName) {
        console.log("found VC", vcName);
        break;
      }
    }
    expectChai(i).to.be.eql(len, `VisboCenter ${newVCName} found after Delete`);

    // switch to Deleted to find the VC
    SysVisboCenterPage.deletedVC.click();

    browser.pause();
    SysVisboCenterPage.unDeletedVC.waitForDisplayed();
    len = vcList.$$('tr').length;
    console.log("VC List Len:", len);
    i = 0;
    for (; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == newVCName) {
        console.log("found VC", vcName);
        vcEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboCenter ${newVCName} not found in Deleted`);
    newUrl = browser.getUrl();
    match = '/sysvcDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to sysvcDetail");
    // Restore deleted VC
    console.log("restore  VC", newVCName);
    SysVisboCenterPage.saveVC.waitForDisplayed();
    SysVisboCenterPage.saveVC.click();
    browser.pause(2000);

    len = vcList.$$('tr').length;
    console.log("VC List Len:", len);
    i = 0;
    for (; i < len; i++) {
      let vcEntry = vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == newVCName) {
        console.log("found VC", vcName);
        break;
      }
    }
    expectChai(i).to.be.lt(len, `VisboCenter ${newVCName} not Restored`);
  })

  it('should Destroy a VC', function () {
    SysVisboCenterPage.open();
    SysVisboCenterPage.delete(vcDeleteID);

    // go to details of deleted VC
    SysVisboCenterPage.detail(deleteID, true);
    SysVisboCenterPage.destroy(deleteID);
    expect(SysVisboCenterPage.alert).toHaveTextContaining('successfull');
  })

})
