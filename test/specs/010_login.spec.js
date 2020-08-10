import LoginPage from '../pageobjects/login.page'

describe('auth form', function () {
    it('should deny access with wrong creds', function () {
        LoginPage.open()
        LoginPage.login('foo@visbo.de', 'bar');

        LoginPage.alert.waitForDisplayed();
        // console.log("Alert:", LoginPage.alert);

        var newUrl = browser.getUrl();
        console.log("URL:", newUrl, "Status:", newUrl.indexOf('/login'));
        expect(newUrl.indexOf('/login') >= 0).toBe(true);
        expect(LoginPage.alert).toHaveTextContaining('falsches Passwort');
    })

    it('should allow access with correct creds', function () {
      let fs = require("fs");
      console.log("Dir:", __dirname);
      let rawContent = fs.readFileSync(__dirname.concat("/../", "params.json"));
      let paramsMap = JSON.parse(rawContent);
      let email = paramsMap?.login?.email;
      let pw = paramsMap?.login?.pw;
      console.log("Login: ", email);
      LoginPage.open()
      LoginPage.login(email, pw);

      LoginPage.alert.waitForDisplayed();
      // console.log("Alert:", LoginPage.alert);

      var newUrl = browser.getUrl();
      console.log("URL:", newUrl, "Status:", newUrl.indexOf('/login'));
      expect(newUrl.indexOf('/dashboard') >= 0).toBe(true);
      expect(LoginPage.alert).toHaveTextContaining('erfolgreich angemeldet');
      // browser.debug();
    })
})
