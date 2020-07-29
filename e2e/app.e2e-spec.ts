import { AppPage } from './app.po';

describe('VISBO Visual Board', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();

    let title = 
    expect(getHeadingText(page).toEqual('Welcome to the VISBO - the project warehouse');
  });
});


getHeadingText(element) {
    // Get the home page heading element reference
    return element(by.css('app-root h2')).getText();
  }
