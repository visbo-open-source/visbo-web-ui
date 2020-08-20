import LoginPage from '../pageobjects/login.page'
import SysVisboCenterPage from '../pageobjects/sysvisbocenter.page'
import SysVisboProjectPage from '../pageobjects/sysvisboproject.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let vpID = '';
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

  it('should navigate to VP List of a specific VC', function () {
    let vcConfigName = paramsMap?.VCBaseName || "Test-MS-VC";
    let countProjects = 0;
    vcConfigName = vcConfigName.concat("01");
    SysVisboCenterPage.open();
    // console.log("Show VC");
    const len = SysVisboCenterPage.vcList.$$('tr').length;
    // console.log("VC List Len:", len, '\n', SysVisboCenterPage.vcList.getText());
    for (var i = 0; i < len; i++) {
      let vcEntry = SysVisboCenterPage.vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == vcConfigName) {
        countProjects = Number(vcEntry.$('#ColProjects').getText());
        console.log("go to SysVP of VC", vcName, "Count", countProjects);
        vcEntry.$('#ColName').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `SysVisboCenter ${vcConfigName} not found`);
    var newUrl = browser.getUrl();
    const match = '/sysvp/';
    expectChai(newUrl).to.include(match, "Wrong redirect to SysVP List of SysVC");
    let index = newUrl.indexOf(match);
    index += match.length;
    vcID = newUrl.substr(index, 24);

    // Check that the number of Projects matches
    vpList.waitUntil(function() {
            return SysVisboProjectPage.vpList.$$('tr').length == countProjects;
          },
          {
            timeout: 3000,
            timeoutMsg : `VisboCenter ${vcConfigName} mismatch in count Projects`
          });

    // console.log("SysVCID:", vcID, newUrl);

  })

  it('should show full list of VPs of one VC and sorting works', function () {
    SysVisboProjectPage.open(vcID);
    // console.log("Sort VP by Date");
    SysVisboProjectPage.sortDate.click();
    const len = SysVisboProjectPage.vpList.$$('tr').length;
    expectChai(len).to.be.gt(0, "No VPs");
    let vpLastDate = convert.convertDate(SysVisboProjectPage.vpList.$$('tr')[0].$('#ColDate').getText());
    for (var i = 0; i < len; i++) {
      let vpEntry = SysVisboProjectPage.vpList.$$('tr')[i];
      let vpDate = convert.convertDate(vpEntry.$('#ColDate').getText());
      // console.log("VP Date", i+1, vpEntry.$('#ColDate').getText(), vpDate, vpLastDate, vpDate.getTime() - vpLastDate.getTime());
      expectChai(vpLastDate).to.be.gte(vpDate, "Wrong Sorting by Date");
      vpLastDate = vpDate;
    }

    // console.log("Sort VP by Versions");
    SysVisboProjectPage.sortVersions.click();
    let vpLastProject = len > 0 ? Number(SysVisboProjectPage.vpList.$$('tr')[0].$('#ColVersions').getText()) : 0;
    for (var i = 0; i < len; i++) {
      let vpEntry = SysVisboProjectPage.vpList.$$('tr')[i];
      let vpProject = Number(vpEntry.$('#ColVersions').getText());
      // console.log("VP Projects", i+1, vpProject, vpLastProject, vpProject - vpLastProject);
      expectChai(vpLastProject).to.be.gte(vpProject, "Wrong Sorting by #Versions");
      vpLastProject = vpProject
    }

    // console.log("Sort VP by Name");
    SysVisboProjectPage.sortName.click();
    let vpLastName = len > 0 ? SysVisboProjectPage.vpList.$$('tr')[0].$('#ColName').getText() : undefined;
    for (var i = 0; i < len; i++) {
      let vpEntry = SysVisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText().valueOf();
      // console.log("VP Names", i+1, vpName, vpLastName, vpName <= vpLastName);
      expectChai(vpName.toLowerCase() >= vpLastName.toLowerCase()).to.be.eql(true, `Wrong Sorting by Name ${vpName} vs ${vpLastName}`);
      vpLastName = vpName
    }
  })

  it('should navigate to Details of a specific VP and switch between users and groups', function () {
    let vcConfigName = paramsMap?.VCBaseName || "Test-XX-VC";
    vcConfigName = vcConfigName.concat("01");
    let vpConfigName = paramsMap?.VPBaseName || "Test-XX-VP";
    vpConfigName = vpConfigName.concat("01");
    SysVisboProjectPage.open(vcID);
    // console.log("Show VP");
    const len = SysVisboProjectPage.vpList.$$('tr').length;
    // console.log("VP List Len:", len, '\n', SysVisboProjectPage.vpList.getText());
    for (var i = 0; i < len; i++) {
      let vpEntry = SysVisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      let vcName = vpEntry.$('#ColVC').getText();
      // console.log("VP", i+1, vpName);
      if (vpName == vpConfigName && vcName == vcConfigName) {
        console.log("go to SysVP Detail", vpName, ' of ', vcName);
        vpEntry.$('button').click();
        break;
      }
    }
    expectChai(i).to.be.lt(len, `SysVisboProject ${vpConfigName} not found`);

    var newUrl = browser.getUrl();
    const match = '/sysvpDetail/';
    expectChai(newUrl).to.include(match, "Wrong redirect to vpDetail");
    let index = newUrl.indexOf(match);
    index += match.length;
    vpID = newUrl.substr(index, 24);
    SysVisboProjectPage.showGroupButton.click();
    // Check that the group list shows up reasonable
    expectChai(SysVisboProjectPage.groupList.$$('tr').length).to.be.at.least(3, "3 Groups have to be defined for this Project");
    SysVisboProjectPage.showUserButton.click();
    // Check that the user list shows up reasonable
    expectChai(SysVisboProjectPage.userList.$$('tr').length).to.be.at.least(1, "At least one user should be member");
  })

  it('should wait for exit', function () {
    console.log("Wait for finish");
    browser.pause(1000);
  })
})
