import Page from './page'

class FormPage extends Page {
    /**
     * define elements
     */
    get username () { return $('#loginName') }
    get password () { return $('#loginPW') }
    get submitButton () { return $('#loginButtonLogin') }
    get flash () { return $('#app-alert') }

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
     * define or overwrite page methods
     */
    open () {
        super.open('login')
    }

    submit () {
        this.submitButton.click()
    }
}

export default new FormPage()
