import { browser, by, element } from 'protractor';

export class VisboPage {
  navigateTo() {
    // return browser.get('/');
    browser.get('/')
      .then(() => { console.log("Start Page Loaded..."); browser.getTitle(); })
      .then(title => console.log("Title: ", title));

    // browser.debugger();
    return;
  }

  getHeadingText() {
    console.log("get Heading Text:", JSON.stringify(element));
    return element(by.css('app-root h2')).getText();
  }
}
