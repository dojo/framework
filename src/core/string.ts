var escapeRegExpPattern = /[[\]{}()|\\^$.*+?]/g;
var escapeXmlPattern = /[&<]/g;
var escapeXmlForPattern = /[&<>'"]/g;
var escapeXmlMap: { [key: string]: string } = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	'\'': '&#39;'
};

function getPadding(text: string, size: number, character: string = '0'): string {
	var length: number = size - text.length;
	var padding: string = '';

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

	let length = text.length;
	position = position !== position ? (isEnd ? length : 0) : position;
	return [ text, String(search), Math.min(Math.max(position, 0), length) ];
}

/**
 * Determines whether a string ends with the given substring.
 * @return Boolean indicating if the search string was found at the end of the given string
 */
export function endsWith(text: string, search: string, endPosition?: number): boolean {
	if (endPosition == null) {
		endPosition = text.length;
	}

	[ text, search, endPosition ] = normalizeSubstringArgs('endsWith', text, search, endPosition, true);

	let start = endPosition - search.length;
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

	var pattern = forAttribute ? escapeXmlForPattern : escapeXmlPattern;

	return xml.replace(pattern, function (character: string): string {
		return escapeXmlMap[character];
	});
}

/**
 * Determines whether a string includes the given substring (optionally starting from a given index).
 * @return Boolean indicating if the search string was found within the given string
 */
export function includes(text: string, search: string, position: number = 0): boolean {
	[ text, search, position ] = normalizeSubstringArgs('includes', text, search, position);
	return text.indexOf(search, position) !== -1;
}

export function padStart(text: string, size: number, character: string = '0'): string {
	if (character.length !== 1) {
		throw new TypeError('string.padStart requires a valid padding character.');
	}

	if (size < 0 || size === Infinity) {
		throw new RangeError('string.padStart requires a valid size.');
	}

	return getPadding(text, size, character) + text;
}

export function padEnd(text: string, size: number, character: string = '0'): string {
	if (character.length !== 1) {
		throw new TypeError('string.padEnd requires a valid padding character.');
	}

	if (size < 0 || size === Infinity) {
		throw new RangeError('string.padEnd requires a valid size.');
	}

	return text + getPadding(text, size, character);
}

/**
 * Determines whether a string begins with the given substring (optionally starting from a given index).
 * @return Boolean indicating if the search string was found at the beginning of the given string
 */
export function startsWith(text: string, search: string, position: number = 0): boolean {
	search = String(search);
	[ text, search, position ] = normalizeSubstringArgs('startsWith', text, search, position);

	let end = position + search.length;
	if (end > text.length) {
		return false;
	}

	return text.slice(position, end) === search;
}
