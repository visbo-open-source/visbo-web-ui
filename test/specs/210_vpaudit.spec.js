import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'
import VisboProjectPage from '../pageobjects/visboproject.page'
import VisboAudit from '../pageobjects/audit.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let vcConfigName='';
let vcID = '';
let vpConfigName='';
let vpID = '';
let newGroupName = '';
let newUserName = '';

let paramsMap;

describe('visbocenter audit check', function () {
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
    vcConfigName = paramsMap?.VCBaseName || "Test-XX-VC";
    vcConfigName = vcConfigName.concat("01");
    let countProjects = 0;
    VisboCenterPage.open();
    // console.log("Show VC");
    const len = VisboCenterPage.vcList.$$('tr').length;
    // console.log("VC List Len:", len, '\n', VisboCenterPage.vcList.getText());
    for (var i = 0; i < len; i++) {
      let vcEntry = VisboCenterPage.vcList.$$('tr')[i];
      let vcName = vcEntry.$('#ColName').getText();
      // console.log("VC", i+1, vcName);
      if (vcName == vcConfigName) {
        countProjects = Number(vcEntry.$('#ColProjects').getText());
        // console.log("go to VP of VC", vcName, "Count", countProjects);
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
    VisboProjectPage.vpList.waitUntil(function() {
            return VisboProjectPage.vpList.$$('tr').length == countProjects;
          },
          {
            timeout: 3000,
            timeoutMsg : `VisboCenter ${vcConfigName} mismatch in count Projects`
          });

    // console.log("VCID:", vcID, newUrl);

  })

  it('should navigate to Details of a specific VP and switch between users and groups', function () {
    vpConfigName = paramsMap?.VPBaseName || "Test-XX-VP";
    vpConfigName = vpConfigName.concat("01");
    VisboProjectPage.open(vcID);
    // console.log("Show VP and search for", vpConfigName, vcConfigName);
    const len = VisboProjectPage.vpList.$$('tr').length;
    // console.log("VP List Len:", len, '\n', VisboProjectPage.vpList.getText());
    for (var i = 0; i < len; i++) {
      let vpEntry = VisboProjectPage.vpList.$$('tr')[i];
      let vpName = vpEntry.$('#ColName').getText();
      let vcName = vpEntry.$('#ColVC').getText();
      // console.log("VP", i+1, vpName, "VC", vcName);
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

  it('View Audit of VP', function () {
    VisboAudit.vpAudit(vpID, false);
    let len = VisboAudit.auditList.$$('tr').length
    expectChai(len).to.be.gt(10, "Not enough Audit entries found");

    if (len > 10) { len = 10; }
    let firstCreated = VisboAudit.auditList.$$('tr')[0].$('#ColCreated').getText()
    // console.log("First Entry from: ", firstCreated)
    // check that the Entry is from today, means it shows only time
    expectChai(firstCreated.search('[0-9][0-9]:[0-9][0-9]:[0-9][0-9]')).to.be.eql(0, "Creation Date not from today");

    // go to details of the first element
    VisboAudit.auditList.$$('tr')[0].$('#ColDetail').click();
    VisboAudit.buttonMore.waitForClickable({ timeoutMsg: 'More Button should show up' });
    VisboAudit.buttonMore.click();

    let i = 0;
    let auditEntry = undefined;
    for (i = 0; i < len; i++) {
      // console.log("Audit Entry created:", VisboAudit.auditCreated.getText());
      let textForm = VisboAudit.auditEntry.getText();
      // console.log("Audit Entry:", textForm);
      if (textForm.indexOf("VISBO Center:") >= 0) {
        let vcName = VisboAudit.auditVC.getText();
        let checkVCName = vcConfigName;
        if (vcName.indexOf("_Rename") > 0) {
          checkVCName += '_Rename';
        }
        expectChai(vcName).to.be.eql(checkVCName, "VC Name mismatch");
      }
      if (textForm.indexOf("VISBO Project:") >= 0) {
        let vpName = VisboAudit.auditVP.getText();
        let checkVPName = vpConfigName;
        if (vpName.indexOf("_Rename") > 0) {
          checkVPName += '_Rename';
        }
        expectChai(vpName).to.be.eql(checkVPName, "VP Name mismatch");
      }
      // go to next
      VisboAudit.buttonNext.click();
    }
  })

})
