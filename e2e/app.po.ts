import { browser, by, element } from 'protractor';

export class VisboPage {
  loginName = element(by.id('loginName'));
  loginPW = element(by.id('loginPW'));
  loginButtonLogin = element(by.id('loginButtonLogin'));
  loginButtonRegister = element(by.id('loginButtonRegister'));
  loginButtonPWForgotten = element(by.id('loginButtonPWForgotten'));

  navigateTo = async function() {
    // return browser.get('/');
    // console.log("Start Page Loading...");
    await browser.get('/');
    console.log("Start Page Loaded");
  }

  getName = async function(name: string) {
    console.log("Get Value by nameID for:", name);
    var result = await element(by.id(name)).getText();
    console.log("Get Value by nameID Result:", result);
    return result;
  }

  login = async function(email: string, password: string) {
    console.log("Login User:", email);
    await this.loginName.sendKeys(email);
    console.log("Login Username set");
    await this.loginPW.sendKeys(password);
    console.log("Login Password set");
    await this.loginButtonLogin.click();
    console.log("Login Button clicked");
  }

  userName = async function(email: string) {
    console.log("Enter Login User:", email);
    await element(by.id('loginName')).sendKeys(email);
    console.log("UserName entered");
    await element(by.id('loginButtonLogin')).click();
    console.log("Button Clicked");
  }
}
