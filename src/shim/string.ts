import has from './support/has';
import { wrapNative } from './support/util';

/**
 * The minimum location of high surrogates
 */
export const HIGH_SURROGATE_MIN = 0xD800;

/**
 * The maximum location of high surrogates
 */
export const HIGH_SURROGATE_MAX = 0xDBFF;

/**
 * The minimum location of low surrogates
 */
export const LOW_SURROGATE_MIN = 0xDC00;

/**
 * The maximum location of low surrogates
 */
export const LOW_SURROGATE_MAX = 0xDFFF;

export namespace Shim {
	/**
	 * Validates that text is defined, and normalizes position (based on the given default if the input is NaN).
	 * Used by startsWith, includes, and endsWith.
	 *
	 * @return Normalized position.
	 */
	function normalizeSubstringArgs(name: string, text: string, search: string, position: number,
			isEnd: boolean = false): [ string, string, number ] {
		if (text == null) {
			throw new TypeError('string.' + name + ' requires a valid string to search against.');
		}

		const length = text.length;
		position = position !== position ? (isEnd ? length : 0) : position;
		return [ text, String(search), Math.min(Math.max(position, 0), length) ];
	}

	export function raw(callSite: TemplateStringsArray, ...substitutions: any[]): string {
		let rawStrings = callSite.raw;
		let result = '';
		let numSubstitutions = substitutions.length;

		if (callSite == null || callSite.raw == null) {
			throw new TypeError('string.raw requires a valid callSite object with a raw value');
		}

		for (let i = 0, length = rawStrings.length; i < length; i++) {
			result += rawStrings[i] + (i < numSubstitutions && i < length - 1 ? substitutions[i] : '');
		}

		return result;
	}

	export function fromCodePoint(...codePoints: number[]): string {
		// Adapted from https://github.com/mathiasbynens/String.fromCodePoint
		const length = arguments.length;
		if (!length) {
			return '';
		}

		const fromCharCode = String.fromCharCode;
		const MAX_SIZE = 0x4000;
		let codeUnits: number[] = [];
		let index = -1;
		let result = '';

		while (++index < length) {
			let codePoint = Number(arguments[index]);

			// Code points must be finite integers within the valid range
			let isValid = isFinite(codePoint) && Math.floor(codePoint) === codePoint &&
				codePoint >= 0 && codePoint <= 0x10FFFF;
			if (!isValid) {
				throw RangeError('string.fromCodePoint: Invalid code point ' + codePoint);
			}

			if (codePoint <= 0xFFFF) {
				// BMP code point
				codeUnits.push(codePoint);
			}
			else {
				// Astral code point; split in surrogate halves
				// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
				codePoint -= 0x10000;
				let highSurrogate = (codePoint >> 10) + HIGH_SURROGATE_MIN;
				let lowSurrogate = (codePoint % 0x400) + LOW_SURROGATE_MIN;
				codeUnits.push(highSurrogate, lowSurrogate);
			}

			if (index + 1 === length || codeUnits.length > MAX_SIZE) {
				result += fromCharCode.apply(null, codeUnits);
				codeUnits.length = 0;
			}
		}
		return result;
	}

	export function codePointAt(text: string, position: number = 0): number {
		// Adapted from https://github.com/mathiasbynens/String.prototype.codePointAt
		if (text == null) {
			throw new TypeError('string.codePointAt requries a valid string.');
		}
		const length = text.length;

		if (position !== position) {
			position = 0;
		}
		if (position < 0 || position >= length) {
			return undefined;
		}

		// Get the first code unit
		const first = text.charCodeAt(position);
		if (first >= HIGH_SURROGATE_MIN && first <= HIGH_SURROGATE_MAX && length > position + 1) {
			// Start of a surrogate pair (high surrogate and there is a next code unit); check for low surrogate
			// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
			const second = text.charCodeAt(position + 1);
			if (second >= LOW_SURROGATE_MIN && second <= LOW_SURROGATE_MAX) {
				return (first - HIGH_SURROGATE_MIN) * 0x400 + second - LOW_SURROGATE_MIN + 0x10000;
			}
		}
		return first;
	}

	/* TODO: Missing normalize */

	export function repeat(text: string, count: number = 0): string {
		// Adapted from https://github.com/mathiasbynens/String.prototype.repeat
		if (text == null) {
			throw new TypeError('string.repeat requires a valid string.');
		}
		if (count !== count) {
			count = 0;
		}
		if (count < 0 || count === Infinity) {
			throw new RangeError('string.repeat requires a non-negative finite count.');
		}

		let result = '';
		while (count) {
			if (count % 2) {
				result += text;
			}
			if (count > 1) {
				text += text;
			}
			count >>= 1;
		}
		return result;
	}

	export function startsWith(text: string, search: string, position: number = 0): boolean {
		search = String(search);
		[ text, search, position ] = normalizeSubstringArgs('startsWith', text, search, position);

		const end = position + search.length;
		if (end > text.length) {
			return false;
		}

		return text.slice(position, end) === search;
	}

	export function endsWith(text: string, search: string, endPosition?: number): boolean {
		if (endPosition == null && text != null) {
			endPosition = text.length;
		}

		[ text, search, endPosition ] = normalizeSubstringArgs('endsWith', text, search, endPosition, true);

		const start = endPosition - search.length;
		if (start < 0) {
			return false;
		}

		return text.slice(start, endPosition) === search;
	}

	export function includes(text: string, search: string, position: number = 0): boolean {
		[ text, search, position ] = normalizeSubstringArgs('includes', text, search, position);
		return text.indexOf(search, position) !== -1;
	}

	/* TODO: Provide an iterator for a string to mimic [Symbol.iterator]? */
}

/**
 * A tag function for template strings to get the template string's raw string form.
 *
 * @param callSite Call site object (or a template string in TypeScript, which will transpile to one)
 * @param substitutions Values to substitute within the template string (TypeScript will generate these automatically)
 * @return String containing the raw template string with variables substituted
 *
 * @example
 * // Within TypeScript; logs 'The answer is:\\n42'
 * let answer = 42;
 * console.log(string.raw`The answer is:\n${answer}`);
 *
 * @example
 * // The same example as above, but directly specifying a JavaScript object and substitution
 * console.log(string.raw({ raw: [ 'The answer is:\\n', '' ] }, 42));
 */
export const raw: (callSite: TemplateStringsArray, ...substitutions: any[]) => string = has('es6-string-raw')
	? (<any> String).raw
	: Shim.raw;

/**
 * Returns the UTF-16 encoded code point value of a given position in a string.
 *
 * @param text The string containing the element whose code point is to be determined
 * @param position Position of an element within the string to retrieve the code point value from
 * @return A non-negative integer representing the UTF-16 encoded code point value
 */
export const fromCodePoint: (...codePoints: number[]) => string = has('es6-string-fromcodepoint')
	? (<any> String).fromCodePoint
	: Shim.fromCodePoint;

/**
 * Returns the UTF-16 encoded code point value of a given position in a string.
 *
 * @param text The string containing the element whose code point is to be determined
 * @param position Position of an element within the string to retrieve the code point value from
 * @return A non-negative integer representing the UTF-16 encoded code point value
 */
export const codePointAt: (text: string, position?: number) => number = has('es6-string-codepointat')
	? wrapNative((<any> String.prototype).codePointAt)
	: Shim.codePointAt;

/**
 * Returns a string containing the given string repeated the specified number of times.
 *
 * @param text The string to repeat
 * @param count The number of times to repeat the string
 * @return A string containing the input string repeated count times
 */
export const repeat: (text: string, count?: number) => string = has('es6-string-repeat')
	? wrapNative((<any> String.prototype).repeat)
	: Shim.repeat;

/**
 * Determines whether a string begins with the given substring (optionally starting from a given index).
 *
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param position The index to begin searching at
 * @return Boolean indicating if the search string was found at the beginning of the given string
 */
export const startsWith: (text: string, search: string, position?: number) => boolean = has('es6-string-startswith')
	? wrapNative((<any> String.prototype).startsWith)
	: Shim.startsWith;

/**
 * Determines whether a string ends with the given substring.
 *
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param endPosition The index searching should stop before (defaults to text.length)
 * @return Boolean indicating if the search string was found at the end of the given string
 */
export const endsWith: (text: string, search: string, endPosition?: number) => boolean = has('es6-string-endsWith')
	? wrapNative((<any> String.prototype).endsWith)
	: Shim.endsWith;

/**
 * Determines whether a string includes the given substring (optionally starting from a given index).
 *
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param position The index to begin searching at
 * @return Boolean indicating if the search string was found within the given string
 */
export const includes: (text: string, search: string, position?: number) => boolean = has('es6-string-includes')
	? wrapNative((<any> String.prototype).includes)
	: Shim.includes;
