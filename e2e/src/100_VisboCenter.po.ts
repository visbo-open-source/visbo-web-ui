import { browser, by, element } from 'protractor';

export class VisboCenterPage {
  // loginName = element(by.id('loginName'));
  // loginPW = element(by.id('loginPW'));
  // loginButtonLogin = element(by.id('loginButtonLogin'));
  // loginButtonRegister = element(by.id('loginButtonRegister'));
  // loginButtonPWForgotten = element(by.id('loginButtonPWForgotten'));

  navigateTo = function(): Promise<unknown> {
    // return browser.get('/');
    // console.log("Start Page Loading...");
    let result = browser.get('/vc');
    return result as Promise<unknown>;
  }

}
