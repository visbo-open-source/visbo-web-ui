import { browser, by, element } from 'protractor';
import { VisboCenterPage } from './100_VisboCenter.po';
import { Helper } from './module_helper'

describe('VISBO Center', () => {
  let sleep = new Helper().sleep;
  let page: VisboCenterPage;

  beforeEach(async () => {
    page = new VisboCenterPage();
    await page.navigateTo();
    // browser.waitForAngular();
    browser.ignoreSynchronization = true;
    // console.log("Param:", browser.params?.login?.email)
    // // await sleep(3000);  // seems not to be enought to wait here for every test
  });

  it('should show Visbo Center List', async () => {

    let elHead = element(by.css('thead'));
    let elBody = element(by.css('tbody'));
    let result = browser.isElementPresent(elHead);
    console.log("isPresent: ", result);
    // expect((await elHead).isPresent()).toBe(true);
    // expect((await elBody).isPresent()).toBe(true);
    // if ((await element(by.id('VCHead'))).isPresent()) {
    let strHead = await elHead.getText();
    let strList = await elBody.getText();

    console.log("Head:", strHead);
    console.log("List:", strList);

  });

  // it('should display login error message', async () => {
  //   // console.log("LoginName with wrong username & password");
  //   await page.login("abc@visbo.de", "abc");
  //   // expect(await page.loaded()).toBe(true);
  //   await sleep(1000);
  //   var alertMessage = await element(by.css('app-alert')).getText();
  //   // console.log("LoginName with wrong username & password done:", alertMessage);
  //   expect(alertMessage.length).toBeGreaterThan(0);
  // });
  //
  // it('should show login success', async () => {
  //   let fs = require("fs");
  //   let rawContent = fs.readFileSync(__dirname.concat("/", "params.json"));
  //   paramsMap = JSON.parse(rawContent);
  //   let email = paramsMap?.login?.email;
  //   let pw = paramsMap?.login?.pw;
  //   console.log("Login: ", email);
  //   await page.login(email, pw);
  //   await sleep(2000);
  //   var alertMessage = await element(by.css('app-alert')).getText();
  //   console.log("LoginName with username & password done:", alertMessage);
  //   expect(alertMessage.length).toBeGreaterThan(0);
  // });

  it('should wait a while to verify', async () => {
    console.log("Wait to finish");
    await sleep(5000);
  });

});
