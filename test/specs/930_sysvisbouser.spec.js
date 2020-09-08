import LoginPage from '../pageobjects/login.page'
import SysVisboUserPage from '../pageobjects/sysvisbouser.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let vcID = '';
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

  it('should show full list of System Admins', function () {
    SysVisboUserPage.admins();
    // console.log("Show SysVC Admins");
    SysVisboUserPage.sortGroup.click();
    let len = SysVisboUserPage.userList.$$('tr').length;
    let vcLastGroup = len > 0 ? SysVisboUserPage.userList.$$('tr')[0].$('#ColGroup').getText() : undefined;
    for (var i = 0; i < len; i++) {
      let userEntry = SysVisboUserPage.userList.$$('tr')[i];
      let groupName = userEntry.$('#ColGroup').getText().valueOf();
      // console.log("VGroup Names", i+1, groupName, vcLastGroup, groupName <= vcLastGroup);
      expectChai(groupName.toLowerCase() >= vcLastGroup.toLowerCase()).to.be.eql(true, "Wrong Sorting by Name");
      vcLastGroup = groupName
    }

    SysVisboUserPage.sortUser.click();
    len = SysVisboUserPage.userList.$$('tr').length;
    let vcLastUser = len > 0 ? SysVisboUserPage.userList.$$('tr')[0].$('#ColUser').getText() : undefined;
    for (var i = 0; i < len; i++) {
      let userEntry = SysVisboUserPage.userList.$$('tr')[i];
      let userName = userEntry.$('#ColUser').getText().valueOf();
      // console.log("VGroup Names", i+1, userName, vcLastUser, userName <= vcLastUser);
      expectChai(userName.toLowerCase() >= vcLastUser.toLowerCase()).to.be.eql(true, "Wrong Sorting by Name");
      vcLastUser = userName
    }

  })

  it('Create SysVC Group', function () {
    SysVisboUserPage.admins();
    // console.log("Show SysVC Admins, switch to Group");
    SysVisboUserPage.showGroupButton.click();
    newGroupName = 'Delete-'.concat((new Date()).toISOString())
    console.log("Add new Group", newGroupName);
    SysVisboUserPage.addGroup(newGroupName, true);
    // console.log("Add Group Check", newGroupName);
    SysVisboUserPage.admins();
    SysVisboUserPage.showGroupButton.click();
    const len = SysVisboUserPage.groupList.$$('tr').length
    let i = 0;
    let groupEntry = undefined;
    for (i = 0; i < len; i++) {
      groupEntry = SysVisboUserPage.groupList.$$('tr')[i];
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
    SysVisboUserPage.admins();
    // console.log("Show Sys Admins, switch to Group");
    newUserName = paramsMap?.userRead;

    let message = (new Date()).toISOString();
    message = "Invitation from ".concat(message);
    message = paramsMap?.inviteMessage ? paramsMap?.inviteMessage.concat(message) : '';
    console.log("SysAdmin Add new User Group", newUserName, newGroupName);
    SysVisboUserPage.addUser(newUserName, newGroupName, message);
    console.log("SysAdmin Add User Check", newGroupName);
    const vcUserList = $('#UserList')
    const len = SysVisboUserPage.userList.$$('tr').length
    let i = 0;
    expectChai(len).to.be.gt(0, "No Members in VC");
    let userEntry, userName, groupName;
    for (i = 0; i < len; i++) {
      userEntry = SysVisboUserPage.userList.$$('tr')[i];
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

  it('Delete SysAdmin User from Group', function () {

    expectChai(newGroupName.indexOf('Delete-') == 0).to.be.eql(true, "Group Name for Delete missing");

    SysVisboUserPage.admins();
    // console.log("Show Sys Admins, switch to Group");
    console.log("Delete User from Group", newUserName, newGroupName);
    let result = SysVisboUserPage.deleteUser(newUserName, newGroupName);
    // expect(result).toBe(false);
    console.log("Delete SysAdmin User from Group Result:", result)
    const len = SysVisboUserPage.userList.$$('tr').length
    let i = 0;
    expectChai(len).to.be.gt(0, "No Members in VC");
    let userEntry, userName, groupName;
    for (i = 0; i < len; i++) {
      userEntry = SysVisboUserPage.userList.$$('tr')[i];
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

  it('Delete SysAdmin Group', function () {
    expectChai(newGroupName.indexOf('Delete-') == 0).to.be.eql(true, "Group Name for Delete missing");

    SysVisboUserPage.admins();
    SysVisboUserPage.showGroupButton.click();
    // console.log("Delete Group", newGroupName);
    let result = SysVisboUserPage.deleteGroup(newGroupName);
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

})
