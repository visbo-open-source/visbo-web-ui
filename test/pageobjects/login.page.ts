import Page from './page';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class LoginPage extends Page {
    /**
     * define selectors using getter methods
     */
    get loginName () { return $('#loginName') }
    get loginPW () { return $('#loginPW') }
    get loginButtonLogin () { return $('#loginButtonLogin') }

    /**
     * a method to encapsule automation code to interact with the page
     * e.g. to login using username and password
     */
    login (email: string, password: string) {
        this.loginName.setValue(email);
        this.loginPW.setValue(password);
        this.loginButtonLogin.click();
    }

    userName(email: string) {
      this.loginName.setValue(email);
      this.loginButtonLogin.click();
    }

    /**
     * overwrite specifc options to adapt it to page object
     */
    open () {
        return super.open('login');
    }
}

export default new LoginPage();
