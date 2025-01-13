class rgbColor {
  red: string;
  green: string;
  blue: string;
} 

// use this for calling sort
export function visboCmpString(first: string, second: string): number {
  let result = 0;
  first = first || '';
  second = second || '';
  result = first.localeCompare(second);
  return result;
}

export function visboCmpDate(first: Date, second: Date): number {
  let result = 0;
  if (first === undefined) { first = new Date(-8640000000000000); }
  if (second === undefined) { second = new Date(-8640000000000000); }
  if (typeof first == "number" || typeof first == "string") first = new Date(first);
	if (typeof second == "number" || typeof second == "string") second = new Date(second);
  if (first < second) {
    result = -1;
  } else if (first > second) {
    result = 1;
  }
  return result;
}

export function convertDate(input: Date, format: string, lang = 'en'): string {
  if (format == 'longDate') {
    return input.toLocaleDateString(
      lang,
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    );
  } else if (format == 'fullDate') {
    return input.toLocaleDateString(
      lang,
      {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      }
    );
  } else if (format == 'shortDate') {
    return input.toLocaleDateString(
      lang,
      {
        year: 'numeric',
        month: 'short'
      }
    );
  } else if (format == 'fullMonthYear') {
    return input.toLocaleDateString(
      lang,
      {
        year: 'numeric',
        month: 'long'
      }
    );
  } else {
    return input.toLocaleDateString(
      lang,
      {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }
}

export function validateDate(dateString: string, allowEmpty: boolean): string {
	if (!allowEmpty && !dateString) {
		return undefined;
	}
	const dateValue = dateString ? new Date(dateString) : new Date();
	if (!dateValue) {
		return undefined;
	}
	return dateValue.toISOString();
}

export function getJsDateFromExcel(excelDate: number): Date {
  // excel date is number of days since 1.1.1900
  // might be fixed by XLSX: plus 1 (Google "excel leap year bug")
  // javascript date are milliseconds since 1.1.1970
  const result = new Date((excelDate - 25567 - 2)*86400*1000);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function visboIsToday(refDate: Date): boolean {
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  if (refDate && refDate.getTime() >= current.getTime()) {
    return true;
  } else {
    return false;
  }
}

export function visboGetBeginOfMonth(refDate: Date, increment = 0): Date {
  const current = new Date(refDate);
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  current.setMonth(current.getMonth() + increment);
  return current;
}

export function visboGetBeginOfDay(refDate: Date, increment = 0): Date {
  const current = new Date(refDate);
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() + increment);
  return current;
}

export function visboIsSameDay(dateA: Date, dateB: Date): boolean {
  if (!dateA || !dateB) { return false; }
  const localA = new Date(dateA);
  const localB = new Date(dateB);
  localA.setHours(0, 0, 0, 0);
  localB.setHours(0, 0, 0, 0);
  return localA.toISOString() === localB.toISOString();
}


export function subtractTimeFromDate(objDate, intDays) {
  var numberOfMlSeconds = objDate.getTime();
  var addMlSeconds = ((intDays * 24) * 60) * 60000;
  var newDateObj = new Date(numberOfMlSeconds - addMlSeconds);
  return newDateObj;
}


export function visboGetShortText(text: string, len: number, position?: string): string {
  if (!text) {
    return '';
  }
  if (text.length < len) {
    return text;
  }
  if (len < 3) {
    return '...';
  }
  if (position == 'middle') {
    const partLen = Math.trunc((len - 3) / 2);
    const result = text.substring(0, partLen).concat('...', text.substr(text.length - partLen));
    return result;
  } else if (position) {
    return '...'.concat(text.substr(text.length - len));
  } else {
    return text.substring(0, len - 3).concat('...');
  }
}

// eslint-disable-next-line
export function getErrorMessage(error: any): string {
  let result = 'Unknown Error';
  if (error) {
    if (error.status === 0) {
      result = 'Server not reachable with ';
      result = result.concat(error.url || '');
      console.log(`Rest Server not reachable: ${error.status} ${error.statusText}, Message ${error.message}`);
    } else {
      console.log(`Rest Error Status: ${error.status} ${error.statusText}, Message ${error.message}, Name: ${error.error.name || ''}`);
      if (error.error && error.error.message) {
        result = error.error.message;
      } else if (error.message) {
        result = error.message;
      } else if (error.statusText) {
        result = error.statusText;
      }
    }
  }
  return result;
}

export function getPreView(): boolean {
  const result = localStorage.getItem('printPreView');
  return result === '1' ? true : false;
}

export function switchPreView(): boolean {
  const result = !getPreView();
  localStorage.setItem('printPreView', result ? '1' : '0');
  // console.log("Switch PreView", result);
  return result;
}


export function excelColorToRGBHex(value: number): string {
  let rgbHex = '';
  if (!value) return rgbHex;
  const red = value % 256;
  value = (value - red) /256;
  const green = value % 256;
  value = (value - green)/256;
  const blue = value % 256;
  // change the values for red,green and blue into hex-strings with length 2
  let redhex = red.toString(16) ;
  while (redhex.length < 2) redhex = '0' + redhex;
  let greenhex = green.toString(16) ;
  while (greenhex.length < 2) greenhex = '0' + greenhex;
  let bluehex = blue.toString(16) ;
  while (bluehex.length < 2) bluehex = '0' + bluehex;
  rgbHex = '#'+ redhex + greenhex + bluehex;
  return rgbHex;
}

export function hexToRgbAverage(hex: string): number {
  var average: number = -1;
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    average = (r+g+b)/3
  }
  return average
}
  
export function hexToRgb(hex: string): string {
  var rgbcolor: string = "";
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    rgbcolor = 'rgb('+r+','+g+','+b+')'
  }
  return rgbcolor
  
  // return result ? {
  //   r: parseInt(result[1], 16),
  //   g: parseInt(result[2], 16),
  //   b: parseInt(result[3], 16)
  // } : null;
}

export function getRGBColor(hex: string) {
    const rgbColor = hexToRgb(hex);
    return rgbColor;
}


export function parseRGB(colorString:string){
  //var colorString = "rgba(111,222,333,0.5)",  
  var colorsOnly = colorString.substring(colorString.indexOf('(') + 1, colorString.lastIndexOf(')')).split(/,\s*/);
  // here we initialise an empty Object:
  var components:rgbColor;
  // here we assign the Array-elements to the
  // named properties of that Object:
  components.red = colorsOnly[0];
  components.green =colorsOnly[1];
  components.blue = colorsOnly[2];

  console.log(colorsOnly, components);
  return components;
}

export function rgbCompToHex( c: number) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0"+hex : hex;
}


export function brightenRGBColor(rgbColor: string, percent: number, hex: boolean){
  var colorsOnly = rgbColor.substring(rgbColor.indexOf('(') + 1, rgbColor.lastIndexOf(')')).split(/,\s*/);
  const r = Number(colorsOnly[0]);
  const g = Number(colorsOnly[1]);
  const b = Number(colorsOnly[2]);
  const p = percent/100;

  const new_r = Math.round(r+(255-r)*p);
  const new_g = Math.round(g+(255-g)*p);
  const new_b = Math.round(b+(255-b)*p);

  var result = 'rgb('+new_r+','+new_g+','+new_b+')';
  if (hex) {
    result ='#'+rgbCompToHex(new_r)+rgbCompToHex(new_g)+rgbCompToHex(new_b);
  }

  return  result;

}
export function darkenRGBColor(rgbColor: string, percent: number, hex: boolean){
  var colorsOnly = rgbColor.substring(rgbColor.indexOf('(') + 1, rgbColor.lastIndexOf(')')).split(/,\s*/);
  const r = Number(colorsOnly[0]);
  const g = Number(colorsOnly[1]);
  const b = Number(colorsOnly[2]);
  const p = percent/100;

  const new_r = Math.round(r*(1-p));
  const new_g = Math.round(g*(1-p));
  const new_b = Math.round(b*(1-p));

  var result = 'rgb('+new_r+','+new_g+','+new_b+')';
  if (hex) {
    result ='#'+rgbCompToHex(new_r)+rgbCompToHex(new_g)+rgbCompToHex(new_b);
  }
  return  result;
}
