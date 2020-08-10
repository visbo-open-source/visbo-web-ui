import { browser, by, element } from 'protractor';

export class LoginPage {
  loginName = element(by.id('loginName'));
  loginPW = element(by.id('loginPW'));
  loginButtonLogin = element(by.id('loginButtonLogin'));
  loginButtonRegister = element(by.id('loginButtonRegister'));
  loginButtonPWForgotten = element(by.id('loginButtonPWForgotten'));

  navigateTo = function(): Promise<unknown> {
    // return browser.get('/');
    // console.log("Start Page Loading...");
    let result = browser.get('/');
    return result as Promise<unknown>;
  }

  getName = function(name: string): Promise<string> {
    // console.log("Get Value by nameID for:", name);
    var result = element(by.id(name)).getText();
    // console.log("Get Value by nameID Result:", result);
    return result as Promise<string>;
  }

  login = function(email: string, password: string): Promise<unknown> {
    // console.log("Login User:", email);
    this.loginName.sendKeys(email);
    // console.log("Login Username set");
    this.loginPW.sendKeys(password);
    // console.log("Login Password set");
    this.loginButtonLogin.click();
    // console.log("Login Button clicked");
    return this as Promise<unknown>
  }

  userName = function(email: string) {
    // console.log("Enter Login User:", email);
    element(by.id('loginName')).sendKeys(email);
    // console.log("UserName entered");
    element(by.id('loginButtonLogin')).click();
    // console.log("Button Clicked");
  }

}
