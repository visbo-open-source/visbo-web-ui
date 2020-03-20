// use this for calling sort
export function visboCmpString(first: string, second: string): number {
  let result = 0;
  if (first < second) {
    result = -1;
  } else if (first > second) {
    result = 1;
  }
  return result;
}

export function visboCmpDate(first: Date, second: Date): number {
  let result = 0;
  if (first < second) {
    result = -1;
  } else if (first > second) {
    result = 1;
  }
  return result;
}

export function visboGetShortText(text: string, len: number): string {
  if (!text) {
    return '';
  }
  if (text.length < len) {
    return text;
  }
  if (len < 3) {
    return '...';
  }
  return text.substring(0, len - 3).concat('...');
}

export function getErrorMessage(error: any): string {
  let result = 'Unknown Error';
  if (error) {
    if (error.status === 0) {
      result = 'Server not reachable with ';
      result = result.concat(error.url || '');
      console.log(`Rest Server not reachable: ${error.status} ${error.statusText}, Message ${error.message}`);
    } else {
      console.log(`Rest Error Status: ${error.status} ${error.statusText}, Message ${error.message}, Name: ${error.error.name || ''}`);
      if (error.statusText) {
        result = error.statusText;
      } else if (error.message) {
        result = error.message;
      }
    }
  }
  return result;
}
