import LoginPage from '../pageobjects/login.page'
import UserProfilePage from '../pageobjects/userprofile.page'
const convert = require("../helper/convert")
const param = require("../helper/param");
const expectChai = require('chai').expect;

let paramsMap;

describe('userprofile check', function () {
  it('login to system', function () {
    paramsMap = param.get();
    let email = paramsMap?.login?.email;
    let pw = paramsMap?.login?.pw;
    LoginPage.open()
    LoginPage.login(email, pw);

    let newUrl = browser.getUrl();
    console.log("URL:", newUrl);

    expectChai(browser.getUrl()).to.include('/dashboard');
  })

  it('navigate to User Profile', function () {
    UserProfilePage.open();
    let email = paramsMap?.login?.email;
    var newUrl = browser.getUrl();
    const match = '/profile';
    expectChai(newUrl).to.include(match, "Wrong redirect to Profile");

    // check that the profile is shown for the specified user
    let title = UserProfilePage.profileTitle.getText();
    console.log("View Profile:", title);
    expectChai(title.indexOf(email)).to.be.gt(0, `Wrong User Profile: ${title}`);

  })

  it('update User Profile', function () {
    UserProfilePage.open();
    let profileFirstName = UserProfilePage.profileFirstName.getValue();
    let profileLastName = UserProfilePage.profileLastName.getValue();
    let profileCompany = UserProfilePage.profileCompany.getValue();
    let profilePhone = UserProfilePage.profilePhone.getValue();

    UserProfilePage.profileFirstName.setValue(profileFirstName.concat('_Rename'));
    UserProfilePage.profileLastName.setValue(profileLastName.concat('_Rename'));
    UserProfilePage.profileCompany.setValue(profileCompany.concat('_Rename'));
    UserProfilePage.profilePhone.setValue(profilePhone.concat('_Rename'));

    UserProfilePage.buttonSave.click();

    // refresh the profile
    UserProfilePage.open();

    expectChai(UserProfilePage.profileFirstName.getValue()).to.be.eq(profileFirstName.concat('_Rename'), `Wrong Profile Info: ${profileFirstName}`);
    expectChai(UserProfilePage.profileLastName.getValue()).to.be.eq(profileLastName.concat('_Rename'), `Wrong Profile Info: ${profileLastName}`);
    expectChai(UserProfilePage.profileCompany.getValue()).to.be.eq(profileCompany.concat('_Rename'), `Wrong Profile Info: ${profileCompany}`);
    expectChai(UserProfilePage.profilePhone.getValue()).to.be.eq(profilePhone.concat('_Rename'), `Wrong Profile Info: ${profilePhone}`);

    // change it back to original
    UserProfilePage.profileFirstName.setValue(profileFirstName);
    UserProfilePage.profileLastName.setValue(profileLastName);
    UserProfilePage.profileCompany.setValue(profileCompany);
    UserProfilePage.profilePhone.setValue(profilePhone);

    UserProfilePage.buttonSave.click();

  })

  it('change User Password', function () {
    UserProfilePage.open();
    let pw = paramsMap?.login?.pw
    UserProfilePage.changepw(pw, pw); //Change it without modification
    // UserProfilePage.alert.waitForExist(10000);
    let text = UserProfilePage.alert.getText();
    console.log("PW Change Alert:", text)
    expectChai(text).to.include('erfolgreich');
    // expectChai(text.indexOf('erfolgreich')).to.be.gt(0, `Password change failed: ${text}`);
  })

  it('change User Password with conclict to PW Policy', function () {
    UserProfilePage.open();
    let pw = paramsMap?.login?.pw
    UserProfilePage.changepw(pw, 'abc'); //Change it without modification
    let text = UserProfilePage.passwordPolicy.getText();
    expectChai(text.length).to.be.gt(20, "Password Policy Rule does not show up anymore")
  })

})
