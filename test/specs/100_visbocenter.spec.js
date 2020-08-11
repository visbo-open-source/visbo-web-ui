import LoginPage from '../pageobjects/login.page'
import VisboCenterPage from '../pageobjects/visbocenter.page'

let vcID = '';
let newGroupName = '';

function convertDate(datetime) {
  let result = new Date();
  let from = 0;
  let to = datetime.indexOf('.', from);
  if (to >= 0) {
    // console.log("convert Day", from, to, datetime.slice(from, to));
    result.setDate(datetime.slice(from, to));
  }
  from = to + 1;
  to = datetime.indexOf('.', from);
  if (to >= 0) {
    // console.log("convert Month", from, to, datetime.slice(from, to));
    result.setMonth(datetime.slice(from, to) - 1);
  }
  from = to + 1;
  to = datetime.indexOf(' ', from);
  let fullYear;
  if (to >= 0) {
    // console.log("convert Year Space", from, to, datetime.slice(from, to));
    fullYear = datetime.slice(from, to);
    // evaluate additional time if present
    from = to + 1;
    to = datetime.indexOf(':', from);
    if (to >= 0) {
      // console.log("convert Hour", from, to, datetime.slice(from, to));
      result.setHours(datetime.slice(from, to));
    }
    from = to + 1;
    // console.log("convert Minutes", from, datetime.slice(from));
    result.setMinutes(datetime.slice(from), 0, 0);
  } else {
    // console.log("convert Year End", from, datetime.slice(from));
    fullYear = datetime.slice(from);
    if (fullYear < 1000) {
      fullYear += 2000;
    }
    result.setHours(0,0,0,0);
  }
  result.setFullYear(fullYear);
  // console.log("convert", datetime, result);
  return result;
}

describe('visbocenter check', function () {
  it('login to system', function () {
    let fs = require("fs");
    // console.log("Dir:", __dirname);
    let rawContent = fs.readFileSync(__dirname.concat("/../", "params.json"));
    let paramsMap = JSON.parse(rawContent);
    let email = paramsMap?.login?.email;
    let pw = paramsMap?.login?.pw;
    LoginPage.open()
    LoginPage.login(email, pw);

    LoginPage.alert.waitForDisplayed();
  })

  it('should show full list of VCs and sorting works', function () {
      VisboCenterPage.open();
      // console.log("Show VC");
      VisboCenterPage.vcHeadDate.click();
      const vcList = $('#VCList');
      const len = vcList.$$('tr').length;
      let vcLastDate = len > 0 ? convertDate(vcList.$$('tr')[0].$('#VCListDate').getText()) : undefined;
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vcDate = convertDate(vcEntry.$('#VCListDate').getText());
        // console.log("VC Date", i+1, vcEntry.$('#VCListDate').getText(), vcDate, vcLastDate, vcDate.getTime() - vcLastDate.getTime());
        expect(vcDate.getTime() - vcLastDate.getTime() > 0).toBe(false);
        vcLastDate = vcDate;
      }

      VisboCenterPage.vcHeadProjects.click();
      let vcLastProject = len > 0 ? vcList.$$('tr')[0].$('#VCListProjects').getText().valueOf() : undefined;
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vcProject = vcEntry.$('#VCListProjects').getText().valueOf();
        // console.log("VC Projects", i+1, vcProject, vcLastProject, vcProject - vcLastProject);
        expect(vcProject - vcLastProject <= 0).toBe(true);
        vcLastProject = vcProject
      }
      VisboCenterPage.vcHeadName.click();
      let vcLastName = len > 0 ? vcList.$$('tr')[0].$('#VCListName').getText() : undefined;
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vcName = vcEntry.$('#VCListName').getText().valueOf();
        // console.log("VC Names", i+1, vcName, vcLastName, vcName <= vcLastName);
        expect(vcName >= vcLastName).toBe(true);
        vcLastName = vcName
      }
  })

  it('should navigate to Details of a specific VC', function () {
      VisboCenterPage.open();
      // console.log("Show VC");
      const vcList = $('#VCList');
      const len = vcList.$$('tr').length;
      // console.log("VC List Len:", len, '\n', vcList.getText());
      for (var i = 0; i < len; i++) {
        let vcEntry = vcList.$$('tr')[i];
        let vc = vcEntry.$('#VCListName').getText();
        // console.log("VC", i+1, vc);
        if (vc.indexOf("Test-MS-VC01") >= 0) {
          console.log("go to VC Detail", vc);
          vcEntry.$('button').click();
          break;
        }
      }
      var newUrl = browser.getUrl();
      const match = 'vcDetail/';
      let index = newUrl.indexOf(match);
      // console.log("URL:", newUrl);
      // expect(newUrl).toHaveTextContaining(match);
      expect(index >= 0).toBe(true);
      index += match.length;
      vcID = newUrl.substr(index, 24);
      // console.log("VCID:", vcID, newUrl);
  })

  it('Create VC Group', function () {
      VisboCenterPage.detail(vcID);
      console.log("Show VC Details, switch to Group");
      VisboCenterPage.showGroupButton.click();
      newGroupName = 'Delete-'.concat((new Date()).toISOString())
      console.log("Add new Group", newGroupName);
      VisboCenterPage.addGroup(newGroupName, true);
      const vcGroupList = $('#VCDetailGroupList')
      const len = vcGroupList.$$('tr').length
      let i = 0;
      let groupEntry = undefined;
      for (i = 0; i < len; i++) {
        groupEntry = vcGroupList.$$('tr')[i];
        let groupName = groupEntry.$('#VCDetailGroupListName').getText();
        console.log("VC GroupName", i+1, groupName);
        if (groupName.indexOf(newGroupName) >= 0) {
          console.log("Group Found", groupName);
          break;
        }
      }
      expect(groupEntry.$('#VCDetailGroupListName').getText()).toBe(newGroupName);
      expect(groupEntry.$('#VCDetailGroupListGlobal').getText()).not.toBe('');
      browser.pause(15000);
  })
})
