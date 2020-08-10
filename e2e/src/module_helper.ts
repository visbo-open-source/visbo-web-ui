export class Helper {

  sleep = function (ms): Promise<unknown>  {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

}
