import { browser, by, element } from 'protractor';
import { LoginPage } from './010_login.po';

let paramsMap: any;

describe('VISBO Login', () => {
  let page: LoginPage;

  beforeEach(async () => {
    page = new LoginPage();
    await page.navigateTo();
    // browser.waitForAngular();
    // browser.ignoreSynchronization = true;
    // console.log("Param:", browser.params?.login?.email)
    let fs = require("fs");
    let rawContent = fs.readFileSync(__dirname.concat("/", "params.json"));
    let paramsMap = JSON.parse(rawContent);
    console.log("Specific Params: ", "email", paramsMap?.login?.email);
    // // await page.sleep(3000);  // seems not to be enought to wait here for every test
  });

  it('should show missing input error', async () => {
    await page.userName("aaaaaaaaaa");
    await page.sleep(1000);
    var loginNameError = await element(by.id('loginNameError')).getText();
    var loginPWError = await element(by.id('loginPWError')).getText();

    expect(loginNameError.length).toBeGreaterThan(0);
    expect(loginPWError.length).toBeGreaterThan(0);
  });

  it('should display login error message', async () => {
    // console.log("LoginName with wrong username & password");
    await page.login("abc@visbo.de", "abc");
    // expect(await page.loaded()).toBe(true);
    await page.sleep(1000);
    var alertMessage = await element(by.css('app-alert')).getText();
    // console.log("LoginName with wrong username & password done:", alertMessage);
    expect(alertMessage.length).toBeGreaterThan(0);
  });

  it('should wait a while to verify', async () => {
    console.log("Wait to finish");
    // await page.sleep(5000);
  });

});
