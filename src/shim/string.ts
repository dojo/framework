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
	var length: number = Math.abs(Math.min(0, text.length - size));
	var padding: string = '';

	if (length === 0) {
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
