import Page from './page'

class VisboCenterPage extends Page {
    /**
     * define elements
     */
    get vcHead () { return $('#VCHead') }
    get vcHeadName () { return $('#VCHeadName') }
    get vcHeadDate () { return $('#VCHeadDate') }
    get vcHeadProjects () { return $('#VCHeadProjects') }
    get vcList () { return $('#VCList') }
    get alert () { return $('#app-alert') }

    get showGroupButton () { return $('#VCDetailGroup') }
    get addGroupButton () { return $('#VCDetailAddGroup') }
    get addGroupName () { return $('#VCDetailAddGroupName') }
    get addGroupGlobal () { return $('#global') }
    get addGroupVPView () { return $('#permVP1') }
    get addGroupConfirm () { return $('#VCDetailGroupConfirm') }

    /**
     * define or overwrite page methods
     */
    open () {
        super.open('/vc');
    }

    detail (vcID) {
        super.open('/vcDetail/'.concat(vcID));
    }

    addGroup(groupName, flagGlobal) {
      this.addGroupButton.click();
      console.log("Add Group", groupName, flagGlobal);

      // how can we improve this to wait until the modal is fully operable
      // $('#VCDetailGroupConfirm').waitForVisible(1000);
      // $('#VCDetailAddGroupName').waitForExist({ timeout: 5000 });
      // $('#VCDetailGroupConfirm').waitForExist({ timeout: 5000 });
      // browser.pause(500);
      $('#VCDetailAddGroupName').waitForClickable({ timeout: 1000, timeoutMsg: 'Group Name should show up' });
      this.addGroupName.setValue(groupName);
      if (flagGlobal) {
        this.addGroupGlobal.click();
        this.addGroupVPView.click();
      }

      this.addGroupConfirm.click();
      // how can we improve this to wait until the modal is fully operable
      browser.pause(500);
    }

}

export default new VisboCenterPage()
