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

	let padding: string = '';

	length -= text.length;
	if (length < 1) {
		return padding;
	}

	// Efficiently repeat the passed-in character.
	while (true) {
		if ((length & 1) === 1) {
			padding += character;
		}

		length >>= 1;

		if (length === 0) {
			break;
		}

		character += character;
	}

	return padding;
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
 * Determines whether a string ends with the given substring.
 * @param text The string to look for the search string within
 * @param search The string to search for
 * @param endPosition The index searching should stop before (defaults to text.length)
 * @return Boolean indicating if the search string was found at the end of the given string
 */
export function endsWith(text: string, search: string, endPosition?: number): boolean {
	if (endPosition == null) {
		endPosition = text.length;
	}

	[ text, search, endPosition ] = normalizeSubstringArgs('endsWith', text, search, endPosition, true);

	const start = endPosition - search.length;
	if (start < 0) {
		return false;
	}

	return text.slice(start, endPosition) === search;
}

export function escapeRegExp(text: string): string {
	return !text ? text : text.replace(escapeRegExpPattern, '\\$&');
}

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
