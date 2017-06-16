import global from './global';
import has, { add as hasAdd } from '@dojo/has/has';

hasAdd('btoa', 'btoa' in global);
hasAdd('atob', 'atob' in global);

/**
 * Take a string encoded in base64 and decode it
 * @param encodedString The base64 encoded string
 */
export const decode: (encodedString: string) => string = has('atob') ? function (encodedString: string) {
	/* this allows for utf8 characters to be decoded properly */
	return decodeURIComponent(Array.prototype.map.call(atob(encodedString), (char: string) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)).join(''));
} : function (encodedString: string): string {
	return new Buffer(encodedString.toString(), 'base64').toString('utf8');
};

/**
 * Take a string and encode it to base64
 * @param rawString The string to encode
 */
export const encode: (rawString: string) => string = has('btoa') ? function (decodedString: string) {
	/* this allows for utf8 characters to be encoded properly */
	return btoa(encodeURIComponent(decodedString).replace(/%([0-9A-F]{2})/g, (match, code: string) => String.fromCharCode(Number('0x' + code))));
} : function (rawString: string): string {
	return new Buffer(rawString.toString(), 'utf8').toString('base64');
};
