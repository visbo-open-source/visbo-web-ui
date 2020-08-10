import { browser, by, element } from 'protractor';
import { VisboPage } from './app.po';

describe('VISBO Visual Board Beginning', () => {
  let page: VisboPage;

  beforeEach(async () => {
    // console.log("Create new Visbo Login Page");
    page = new VisboPage();
    await page.navigateTo();
    // browser.waitForAngular();
    browser.ignoreSynchronization = true;
    // await sleep(3000);  // seems not to be enought to wait here for every test
    // console.log("NavigateTo finished");
  });

  it('should display correct title', async () => {
    let pageTitle = await browser.driver.getTitle();
    expect(pageTitle).toEqual('VISBO: Visual Board');
  });

});
