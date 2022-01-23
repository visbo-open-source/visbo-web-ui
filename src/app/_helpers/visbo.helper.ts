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
  let result = new Date((excelDate - 25567 - 2)*86400*1000);
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

export function visboIsSameDay(dateA: Date, dateB: Date): boolean {
  if (!dateA || !dateB) { return false; }
  const localA = new Date(dateA);
  const localB = new Date(dateB);
  localA.setHours(0, 0, 0, 0);
  localB.setHours(0, 0, 0, 0);
  return localA.toISOString() === localB.toISOString();
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
    let partLen = Math.trunc((len - 3) / 2);
    let result = text.substring(0, partLen).concat('...', text.substr(text.length - partLen));
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
  console.log("Switch PreView", result);
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
