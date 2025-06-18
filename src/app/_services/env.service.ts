export class EnvService {

  // The values that are defined here are the default values that can
  // be overridden by env.js

  // API url
  public restUrl = 'http://localhost:3484';
  //public restUrl = 'https://dev.visbo.net/api';
  public openProjUrl = 'http://localhost:3000';
  //public openProjUrl = 'https://opdev.visbo.net';


  // Whether or not to enable debug mode
  // public enableDebug = true;

  /* eslint-disable @typescript-eslint/no-empty-function */
  constructor() {
  }
  /* eslint-enable @typescript-eslint/no-empty-function */

}
