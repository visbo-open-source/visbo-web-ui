let fs = require("fs");
let paramsMap = undefined;

export function get() {
  // console.log("Get Params Map");
  if (!this.paramsMap) {
    const fileName = __dirname.concat("/../", "params.json");
    console.log("Get Params Map:", fileName);
    let rawContent = fs.readFileSync(fileName);
    this.paramsMap = JSON.parse(rawContent);
  }
  return this.paramsMap;
}
