import { browser, by, element } from 'protractor';
import { VisboPage } from './app.po';

describe('VISBO Visual Board', () => {
  let page: VisboPage;

  beforeEach(() => {
    page = new VisboPage();
  });

  it('should display correct title', () => {
    browser.ignoreSynchronization = true;
    browser.get('/');
    browser.driver.getTitle()
      .then(function(pageTitle) {
        expect(pageTitle).toEqual('VISBO: Visual Board');
      });
    // page.navigateTo();
    // console.log("Navigated to VisboPage", page || 'undefined');
    //
    // let title = page.getHeadingText();
    // console.log("Heading ");
    // let tempTitle = 'Welcome to the VISBO - the project warehouse'
    // expect(tempTitle).toEqual('Welcome to the VISBO - the project warehouse');
  });

  it('should display username and password field', async () => {
    var loginName = await element(by.id('LoginName')).getText();
    // var loginName = await element(by.css('app-login')).getText();
    console.log("LoginName ", loginName)
    // expect(text).not.toEqual(undefined);
    // var loginPW = browser.findElement(by.id('LoginPW1'));
    // text = loginPW.getText();
    // console.log("LoginPW ", text != undefined)
    // expect(text).not.toEqual(undefined);
    // element(by.id('LoginName')).getText()
    //   .then(function(text) {
    //     console.log("got LoginName");
    //     // expect(text).toEqual('');
    //   });
  });
});
