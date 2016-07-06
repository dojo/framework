import { repeat } from 'dojo-shim/string';
import { Hash } from './interfaces';

const escapeRegExpPattern = /[[\]{}()|\/\\^$.*+?]/g;
const escapeXmlPattern = /[&<]/g;
const escapeXmlForPattern = /[&<>'"]/g;
const escapeXmlMap: Hash<string> = {
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
