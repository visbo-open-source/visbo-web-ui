import LoginPage from '../pageobjects/login.page'
import SysVisboCenterPage from '../pageobjects/sysvisbocenter.page'
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

  it('View Sys Audit', function () {
    VisboAudit.sysAudit();
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
    // // expect(auditEntry.$('#ColGroup').getText()).toBe(newGroupName);
    // // expect(auditEntry.$('#ColGlobal').getText()).toBe('Global');
    // expectChai(auditEntry.$('#ColGlobal').getText()).to.be.eql('Global');
  })

  it('should wait for exit', function () {
    console.log("Wait for finish");
    browser.pause(1000);
  })

})
