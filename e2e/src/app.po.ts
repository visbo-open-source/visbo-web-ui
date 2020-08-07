import { browser, by, element } from 'protractor';

export class VisboPage {

  navigateTo = function(): Promise<unknown> {
    // return browser.get('/');
    // console.log("Start Page Loading...");
    let result = browser.get('/');
    return result as Promise<unknown>;
  }

}
