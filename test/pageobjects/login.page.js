import Page from './page'

class LoginPage extends Page {
    /**
     * define elements
     */
    get username () { return $('#loginName') }
    get password () { return $('#loginPW') }
    get loginButton () { return $('#loginButtonLogin') }
    get alert () { return $('#alertMessage') }

    login (email, password) {
        this.username.setValue(email);
        this.password.setValue(password);
        this.loginButton.click();
    }

    userName(email) {
      this.username.setValue(email);
      this.loginButton.click();
    }

    /**
     * define or overwrite page methods
     */
    open () {
        super.open('login')
    }

    submit () {
        this.loginButton.click()
    }
}

export default new LoginPage()
