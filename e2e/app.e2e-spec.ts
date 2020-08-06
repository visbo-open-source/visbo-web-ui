import { browser, by, element } from 'protractor';
import { VisboPage } from './app.po';

describe('VISBO Visual Board', () => {
  let page: VisboPage;

  beforeEach(async () => {
    console.log("Create new Visbo Login Page");
    page = await new VisboPage();
    // browser.waitForAngular();
  });

  it('should display correct title', async () => {
    // browser.ignoreSynchronization = true;
    // browser.get('/');
    // browser.driver.getTitle()
    //   .then(function(pageTitle) {
    //     expect(pageTitle).toEqual('VISBO: Visual Board');
    //   });
    await page.navigateTo();
    console.log("NavigateTo finished");
    let pageTitle = await browser.driver.getTitle();
    expect(pageTitle).toEqual('VISBO: Visual Board');
  });

  it('should show missing input error', async () => {
    // browser.ignoreSynchronization = true;
    await page.navigateTo();
    console.log("Set loginName");
    await page.userName("aaaaaaaaaa");

    console.log("Check getName loginName");
    expect(page.getName('loginName')).toBe(true);
    // var loginNameError = await element(by.id('loginNameError')).getText() || '';
    // var loginPWError = await element(by.id('loginPWError')).getText() || '';
    //
    // expect(loginNameError.length).toBeGreaterThan(0);
    // expect(loginPWError.length).toBeGreaterThan(0);
  });

  it('should display login error message', async () => {
    // browser.ignoreSynchronization = true;
    await page.navigateTo();
    console.log("LoginName with wrong username & password");
    await page.login("abc@visbo.de", "abc");
    // expect(await page.loaded()).toBe(true);
    // var alertMessage = await element(by.id('alertMessage')).getText() || '';

    // expect(alertMessage.length).toBeGreaterThan(0);
    console.log("LoginName with wrong username & password done");
  });

});
