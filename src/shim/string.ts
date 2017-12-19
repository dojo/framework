import global from './global';
import has from './support/has';
import { wrapNative } from './support/util';

export interface StringNormalize {
	/**
	 * Returns the String value result of normalizing the string into the normalization form
	 * named by form as specified in Unicode Standard Annex #15, Unicode Normalization Forms.
	 * @param target The target string
	 * @param form Applicable values: "NFC", "NFD", "NFKC", or "NFKD", If not specified default
	 * is "NFC"
	 */
	(target: string, form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): string;

	/**
	 * Returns the String value result of normalizing the string into the normalization form
	 * named by form as specified in Unicode Standard Annex #15, Unicode Normalization Forms.
	 * @param target The target string
	 * @param form Applicable values: "NFC", "NFD", "NFKC", or "NFKD", If not specified default
	 * is "NFC"
	 */
	(target: string, form?: string): string;
}

/**
 * The minimum location of high surrogates
 */
export const HIGH_SURROGATE_MIN = 0xd800;

/**
 * The maximum location of high surrogates
 */
export const HIGH_SURROGATE_MAX = 0xdbff;

/**
 * The minimum location of low surrogates
 */
export const LOW_SURROGATE_MIN = 0xdc00;

/**
 * The maximum location of low surrogates
 */
export const LOW_SURROGATE_MAX = 0xdfff;

/* ES6 static methods */

/**
 * Return the String value whose elements are, in order, the elements in the List elements.
 * If length is 0, the empty string is returned.
 * @param codePoints The code points to generate the string
 */
export let fromCodePoint: (...codePoints: number[]) => string;

/**
 * `raw` is intended for use as a tag function of a Tagged Template String. When called
 * as such the first argument will be a well formed template call site object and the rest
 * parameter will contain the substitution values.
 * @param template A well-formed template string call site representation.
 * @param substitutions A set of substitution values.
 */
export let raw: (template: TemplateStringsArray, ...substitutions: any[]) => string;

/* ES6 instance methods */

/**
 * Returns a nonnegative integer Number less than 1114112 (0x110000) that is the code point
 * value of the UTF-16 encoded code point starting at the string element at position pos in
 * the String resulting from converting this object to a String.
 * If there is no element at that position, the result is undefined.
 * If a valid UTF-16 surrogate pair does not begin at pos, the result is the code unit at pos.
 */
export let codePointAt: (target: string, pos?: number) => number | undefined;

/**
 * Returns true if the sequence of elements of searchString converted to a String is the
 * same as the corresponding elements of this object (converted to a String) starting at
 * endPosition – length(this). Otherwise returns false.
 */
export let endsWith: (target: string, searchString: string, endPosition?: number) => boolean;

/**
 * Returns true if searchString appears as a substring of the result of converting this
 * object to a String, at one or more positions that are
 * greater than or equal to position; otherwise, returns false.
 * @param target The target string
 * @param searchString search string
 * @param position If position is undefined, 0 is assumed, so as to search all of the String.
 */
export let includes: (target: string, searchString: string, position?: number) => boolean;

/**
 * Returns the String value result of normalizing the string into the normalization form
 * named by form as specified in Unicode Standard Annex #15, Unicode Normalization Forms.
 * @param target The target string
 * @param form Applicable values: "NFC", "NFD", "NFKC", or "NFKD", If not specified default
 * is "NFC"
 */
export let normalize: StringNormalize;

/**
 * Returns a String value that is made from count copies appended together. If count is 0,
 * T is the empty String is returned.
 * @param count number of copies to append
 */
export let repeat: (target: string, count?: number) => string;

/**
 * Returns true if the sequence of elements of searchString converted to a String is the
 * same as the corresponding elements of this object (converted to a String) starting at
 * position. Otherwise returns false.
 */
export let startsWith: (target: string, searchString: string, position?: number) => boolean;

/* ES7 instance methods */

/**
 * Pads the current string with a given string (possibly repeated) so that the resulting string reaches a given length.
 * The padding is applied from the end (right) of the current string.
 *
 * @param target The target string
 * @param maxLength The length of the resulting string once the current string has been padded.
 *        If this parameter is smaller than the current string's length, the current string will be returned as it is.
 *
 * @param fillString The string to pad the current string with.
 *        If this string is too long, it will be truncated and the left-most part will be applied.
 *        The default value for this parameter is " " (U+0020).
 */
export let padEnd: (target: string, maxLength: number, fillString?: string) => string;

/**
 * Pads the current string with a given string (possibly repeated) so that the resulting string reaches a given length.
 * The padding is applied from the start (left) of the current string.
 *
 * @param target The target string
 * @param maxLength The length of the resulting string once the current string has been padded.
 *        If this parameter is smaller than the current string's length, the current string will be returned as it is.
 *
 * @param fillString The string to pad the current string with.
 *        If this string is too long, it will be truncated and the left-most part will be applied.
 *        The default value for this parameter is " " (U+0020).
 */
export let padStart: (target: string, maxLength: number, fillString?: string) => string;

if (has('es6-string') && has('es6-string-raw')) {
	fromCodePoint = global.String.fromCodePoint;
	raw = global.String.raw;

	codePointAt = wrapNative(global.String.prototype.codePointAt);
	endsWith = wrapNative(global.String.prototype.endsWith);
	includes = wrapNative(global.String.prototype.includes);
	normalize = wrapNative(global.String.prototype.normalize);
	repeat = wrapNative(global.String.prototype.repeat);
	startsWith = wrapNative(global.String.prototype.startsWith);
} else {
	/**
	 * Validates that text is defined, and normalizes position (based on the given default if the input is NaN).
	 * Used by startsWith, includes, and endsWith.
	 *
	 * @return Normalized position.
	 */
	const normalizeSubstringArgs = function(
		name: string,
		text: string,
		search: string,
		position: number,
		isEnd: boolean = false
	): [string, string, number] {
		if (text == null) {
			throw new TypeError('string.' + name + ' requires a valid string to search against.');
		}

		const length = text.length;
		position = position !== position ? (isEnd ? length : 0) : position;
		return [text, String(search), Math.min(Math.max(position, 0), length)];
	};

	fromCodePoint = function fromCodePoint(...codePoints: number[]): string {
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
			let isValid =
				isFinite(codePoint) && Math.floor(codePoint) === codePoint && codePoint >= 0 && codePoint <= 0x10ffff;
			if (!isValid) {
				throw RangeError('string.fromCodePoint: Invalid code point ' + codePoint);
			}

			if (codePoint <= 0xffff) {
				// BMP code point
				codeUnits.push(codePoint);
			} else {
				// Astral code point; split in surrogate halves
				// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
				codePoint -= 0x10000;
				let highSurrogate = (codePoint >> 10) + HIGH_SURROGATE_MIN;
				let lowSurrogate = codePoint % 0x400 + LOW_SURROGATE_MIN;
				codeUnits.push(highSurrogate, lowSurrogate);
			}

			if (index + 1 === length || codeUnits.length > MAX_SIZE) {
				result += fromCharCode.apply(null, codeUnits);
				codeUnits.length = 0;
			}
		}
		return result;
	};

	raw = function raw(callSite: TemplateStringsArray, ...substitutions: any[]): string {
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
	};

	codePointAt = function codePointAt(text: string, position: number = 0): number | undefined {
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
	};

	endsWith = function endsWith(text: string, search: string, endPosition?: number): boolean {
		if (endPosition == null) {
			endPosition = text.length;
		}

		[text, search, endPosition] = normalizeSubstringArgs('endsWith', text, search, endPosition, true);

		const start = endPosition - search.length;
		if (start < 0) {
			return false;
		}

		return text.slice(start, endPosition) === search;
	};

	includes = function includes(text: string, search: string, position: number = 0): boolean {
		[text, search, position] = normalizeSubstringArgs('includes', text, search, position);
		return text.indexOf(search, position) !== -1;
	};

	repeat = function repeat(text: string, count: number = 0): string {
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
	};

	startsWith = function startsWith(text: string, search: string, position: number = 0): boolean {
		search = String(search);
		[text, search, position] = normalizeSubstringArgs('startsWith', text, search, position);

		const end = position + search.length;
		if (end > text.length) {
			return false;
		}

		return text.slice(position, end) === search;
	};
}

if (has('es2017-string')) {
	padEnd = wrapNative(global.String.prototype.padEnd);
	padStart = wrapNative(global.String.prototype.padStart);
} else {
	padEnd = function padEnd(text: string, maxLength: number, fillString: string = ' '): string {
		if (text === null || text === undefined) {
			throw new TypeError('string.repeat requires a valid string.');
		}

		if (maxLength === Infinity) {
			throw new RangeError('string.padEnd requires a non-negative finite count.');
		}

		if (maxLength === null || maxLength === undefined || maxLength < 0) {
			maxLength = 0;
		}

		let strText = String(text);
		const padding = maxLength - strText.length;

		if (padding > 0) {
			strText +=
				repeat(fillString, Math.floor(padding / fillString.length)) +
				fillString.slice(0, padding % fillString.length);
		}

		return strText;
	};

	padStart = function padStart(text: string, maxLength: number, fillString: string = ' '): string {
		if (text === null || text === undefined) {
			throw new TypeError('string.repeat requires a valid string.');
		}

		if (maxLength === Infinity) {
			throw new RangeError('string.padStart requires a non-negative finite count.');
		}

		if (maxLength === null || maxLength === undefined || maxLength < 0) {
			maxLength = 0;
		}

		let strText = String(text);
		const padding = maxLength - strText.length;

		if (padding > 0) {
			strText =
				repeat(fillString, Math.floor(padding / fillString.length)) +
				fillString.slice(0, padding % fillString.length) +
				strText;
		}

		return strText;
	};
}
