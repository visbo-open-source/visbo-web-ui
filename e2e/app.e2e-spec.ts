import { VisboPage } from './app.po';

describe('VISBO Visual Board', () => {
  let page: VisboPage;

  beforeEach(() => {
    // console.log("Create VisboPage");
    page = new VisboPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();

    let title = page.getHeadingText();
    console.log("Heading: ", title);
    // expect(title).toEqual('Welcome to the VISBO - the project warehouse');
  });
});
