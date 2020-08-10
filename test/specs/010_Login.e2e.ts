import LoginPage from  '../pageobjects/login.page';
// import SecurePage from '../pageobjects/secure.page';

describe('My Login application', () => {
  it('should show password warning', () => {
      LoginPage.open();

      LoginPage.userName('aaaaaaaaaa');
      // expect(LoginPage.loginWarning).toBeExisting();
  });

  // it('should login with valid credentials', () => {
  //     LoginPage.open();
  //
  //     LoginPage.login('tomsmith', 'SuperSecretPassword!');
  //     expect(SecurePage.flashAlert).toBeExisting();
  //     expect(SecurePage.flashAlert).toHaveTextContaining(
  //         'You logged into a secure area!');
  // });
  it('should wait a while', () => {
    browser.pause(10000);
  });
});
