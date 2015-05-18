const escapeRegExpPattern = /[[\]{}()|\\^$.*+?]/g;
const escapeXmlPattern = /[&<]/g;
const escapeXmlForPattern = /[&<>'"]/g;
const escapeXmlMap: { [key: string]: string } = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	'\'': '&#39;'
};

/**
 * Performs validation and padding operations used by padStart and padEnd.
 */
function getPadding(name: string, text: string, length: number, character: string = '0'): string {
	if (text == null) {
		throw new TypeError('string.' + name + ' requires a valid string.');
	}

	if (character.length !== 1) {
		throw new TypeError('string.' + name + ' requires a valid padding character.');
	}

	if (length < 0 || length === Infinity) {
		throw new RangeError('string.' + name + ' requires a valid length.');
	}

	length -= text.length;
	return length < 1 ? '' : repeat(character, length);
}

/**
 * Validates that text is defined, and normalizes position (based on the given default if the input is NaN).
 * Used by startsWith, includes, and endsWith.
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

/**
 * Returns the UTF-16 encoded code point value of a given position in a string.
 * @param text The string containing the element whose code point is to be determined
 * @param position Position of an element within the string to retrieve the code point value from
 * @return A non-negative integer representing the UTF-16 encoded code point value
 */
export function codePointAt(text: string, position: number = 0) {
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
	if (first >= 0xD800 && first <= 0xDBFF && length > position + 1) {
		// Start of a surrogate pair (high surrogate and there is a next code unit); check for low surrogate
		// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
		const second = text.charCodeAt(position + 1);
		if (second >= 0xDC00 && second <= 0xDFFF) {
			return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
		}
	}
	return first;
}

/**
 * Determines whether a string ends with the given substring.
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param endPosition The index searching should stop before (defaults to text.length)
 * @return Boolean indicating if the search string was found at the end of the given string
 */
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

/**
 * Escapes a string so that it can safely be passed to the RegExp constructor.
 * @param text The string to be escaped
 * @return The escaped string
 */
export function escapeRegExp(text: string): string {
	return !text ? text : text.replace(escapeRegExpPattern, '\\$&');
}

/**
 * Sanitizes a string to protect against tag injection.
 * @param xml The string to be escaped
 * @param forAttribute Whether to also escape ', ", and > in addition to < and &
 * @return The escaped string
 */
export function escapeXml(xml: string, forAttribute: boolean = true): string {
	if (!xml) {
		return xml;
	}

	const pattern = forAttribute ? escapeXmlForPattern : escapeXmlPattern;

	return xml.replace(pattern, function (character: string): string {
		return escapeXmlMap[character];
	});
}

/**
 * Returns a string created by using the specified sequence of code points.
 * @param codePoints One or more code points
 * @return A string containing the given code points
 */
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
			let highSurrogate = (codePoint >> 10) + 0xD800;
			let lowSurrogate = (codePoint % 0x400) + 0xDC00;
			codeUnits.push(highSurrogate, lowSurrogate);
		}

		if (index + 1 === length || codeUnits.length > MAX_SIZE) {
			result += fromCharCode.apply(null, codeUnits);
			codeUnits.length = 0;
		}
	}
	return result;
}

/**
 * Determines whether a string includes the given substring (optionally starting from a given index).
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param position The index to begin searching at
 * @return Boolean indicating if the search string was found within the given string
 */
export function includes(text: string, search: string, position: number = 0): boolean {
	[ text, search, position ] = normalizeSubstringArgs('includes', text, search, position);
	return text.indexOf(search, position) !== -1;
}

/**
 * Adds padding to the end of a string to ensure it is a certain length.
 * @param text The string to pad
 * @param length The target minimum length of the string
 * @param character The character to pad onto the end of the string
 * @return The string, padded to the given length if necessary
 */
export function padEnd(text: string, length: number, character: string = '0'): string {
	return text + getPadding('padEnd', text, length, character);
}

/**
 * Adds padding to the beginning of a string to ensure it is a certain length.
 * @param text The string to pad
 * @param length The target minimum length of the string
 * @param character The character to pad onto the beginning of the string
 * @return The string, padded to the given length if necessary
 */
export function padStart(text: string, length: number, character: string = '0'): string {
	return getPadding('padStart', text, length, character) + text;
}

/**
 * A tag function for template strings to get the template string's raw string form.
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

/**
 * Returns a string containing the given string repeated the specified number of times.
 * @param text The string to repeat
 * @param count The number of times to repeat the string
 * @return A string containing the input string repeated count times
 */
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

/**
 * Determines whether a string begins with the given substring (optionally starting from a given index).
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param position The index to begin searching at
 * @return Boolean indicating if the search string was found at the beginning of the given string
 */
export function startsWith(text: string, search: string, position: number = 0): boolean {
	search = String(search);
	[ text, search, position ] = normalizeSubstringArgs('startsWith', text, search, position);

	const end = position + search.length;
	if (end > text.length) {
		return false;
	}

	return text.slice(position, end) === search;
}
