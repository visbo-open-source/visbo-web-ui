import Page from './page'

class VisboAudit extends Page {
    /**
     * define elements
     */
    get sortUser () { return $('#SortUser') }
    get alert () { return $('#alertMessage') }

    get auditList () { return $('#AuditList') }

    get buttonNext () { return $('#ButtonNext') }
    get buttonPrev () { return $('#ButtonPrev') }
    get buttonMore () { return $('#ButtonMore') }
    get buttonLess () { return $('#ButtonLess') }

    get auditEntry () { return $('#auditEntry') }
    get auditCreated () { return $('#auditCreated') }
    get auditVC () { return $('#auditVC') }
    get auditVP () { return $('#auditVP') }

    /**
     * define or overwrite page methods
     */
    sysAudit () {
      let url = '/sysaudit/';
      super.open(url);
      this.alert.waitForDisplayed();
    }

    vcAudit (vcID, sysadmin) {
      let url = '/vcAudit/'.concat(vcID);
      if (sysadmin) {
        url = url.concat('?sysadmin=1')
      }
      super.open(url);
      this.alert.waitForDisplayed();
    }

    vpAudit (vpID, sysadmin) {
      let url = '/vpAudit/'.concat(vpID);
      if (sysadmin) {
        url = url.concat('?sysadmin=1')
      }
      super.open(url);
      this.alert.waitForDisplayed();
    }

}

export default new VisboAudit()
