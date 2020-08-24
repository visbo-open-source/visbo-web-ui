import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'
import VisboAudit from '../pageobjects/audit.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let vcConfigName='';
let vcID = '';
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

  it('should navigate to Details of a specific VC', function () {
    vcConfigName = paramsMap?.VCBaseName || "Test-XX-VC";
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

  it('View Audit of VC', function () {
    VisboAudit.vcAudit(vcID, false);
    let len = VisboAudit.auditList.$$('tr').length
    expectChai(len).to.be.gt(10, "Not enough Audit entries found");

    if (len > 10) { len = 10; }
    let firstCreated = VisboAudit.auditList.$$('tr')[0].$('#ColCreated').getText()
    console.log("First Entry from: ", firstCreated)
    // check that the Entry is from today, means it shows only time
    expectChai(firstCreated.search('[0-9][0-9]:[0-9][0-9]:[0-9][0-9]')).to.be.eql(0, "Creation Date not from today");

    // go to details of the first element
    VisboAudit.auditList.$$('tr')[0].$('#ColDetail').click();
    browser.pause(500);
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
      // go to next
      VisboAudit.buttonNext.click();
    }
  })

  it('should wait for exit', function () {
    console.log("Wait for finish");
    browser.pause(1000);
  })

})
