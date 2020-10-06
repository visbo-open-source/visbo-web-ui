import Page from './page'

class UserProfilePage extends Page {
    /**
     * define elements
     */
    get alert () { return $('#alertMessage') }

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
      this.buttonSave.waitForClickable({ timeoutMsg: 'Button Save should show up' });
    }

    changepw(oldPassword, newPassword) {
      this.buttonChangePW.click();
      // console.log("Modal Title:", $('#UserPasswordChangeModalTitle').getText());
      this.passwordOld.waitForClickable({ timeoutMsg: 'Field Old Password should show up' });
      this.passwordOld.setValue(oldPassword);
      this.passwordNew.setValue(newPassword);
      this.buttonChange.click();
    }

}

export default new UserProfilePage()
