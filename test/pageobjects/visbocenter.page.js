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

    /**
     * define or overwrite page methods
     */
    open () {
        super.open('/vc')
    }

}

export default new VisboCenterPage()
