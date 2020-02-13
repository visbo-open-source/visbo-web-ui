// use this for calling sort
export function visboCmpString(first: string, second: string): number {
  let result = 0;
  if (first < second) {
    result = -1;
  } else if (first > second){
    result = 1;
  }
  return result;
}

export function visboCmpDate(first: Date, second: Date): number {
  let result = 0;
  if (first < second) {
    result = -1;
  } else if (first > second){
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
