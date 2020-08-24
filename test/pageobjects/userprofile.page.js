import Page from './page'

class UserProfilePage extends Page {
    /**
     * define elements
     */
    get alert () { return $('app-alert') }

    get profileTitle () { return $('#profileTitle') }
    get profileFirstName () { return $('#profileFirstName') }
    get profileLastName () { return $('#profileLastName') }
    get profileCompany () { return $('#profileCompany') }
    get profilePhone () { return $('#profilePhone') }

    get buttonSave () { return $('#ButtonSave') }
    get buttonBack () { return $('#ButtonBack') }
    get buttonChangePW () { return $('#ButtonChangePW') }
    get buttonChange () { return $('#ButtonChange') }


    get passwordTitle () { return $('#UserPasswordChangeModalTitle') }
    get passwordOld () { return $('#passwordOld') }
    get passwordNew () { return $('#passwordNew') }
    get passwordPolicy () { return $('#passwordPolicy') }


    /**
     * define or overwrite page methods
     */
    open () {
      super.open('/profile');
      browser.pause(500);
    }

    changepw(oldPassword, newPassword) {
      this.buttonChangePW.click();
      browser.pause(500);
      this.passwordOld.setValue(oldPassword);
      this.passwordNew.setValue(newPassword);
      this.buttonChange.click();
      browser.pause(500);
    }

}

export default new UserProfilePage()
