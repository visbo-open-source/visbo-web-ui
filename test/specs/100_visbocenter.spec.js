import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'

describe('visbocenter check', function () {
  it('login to syste,', function () {
    let fs = require("fs");
    console.log("Dir:", __dirname);
    let rawContent = fs.readFileSync(__dirname.concat("/../", "params.json"));
    let paramsMap = JSON.parse(rawContent);
    let email = paramsMap?.login?.email;
    let pw = paramsMap?.login?.pw;
    LoginPage.open()
    LoginPage.login(email, pw);

    LoginPage.alert.waitForDisplayed();
  })

  it('should show full list of VCs', function () {
      VisboCenterPage.open();
      console.log("Show VC");
      browser.pause(5000);
      VisboCenterPage.vcHeadDate.click();
      browser.pause(1000);
      VisboCenterPage.vcHeadProjects.click();
      browser.pause(1000);
      VisboCenterPage.vcHeadName.click();
      browser.debug();
  })

})
