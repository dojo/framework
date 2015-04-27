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
