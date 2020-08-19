// convert a long or short date from german format to a date Object
export function convertDate(datetime) {
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
