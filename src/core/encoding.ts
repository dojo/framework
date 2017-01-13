import { HIGH_SURROGATE_MIN, HIGH_SURROGATE_MAX, LOW_SURROGATE_MIN, LOW_SURROGATE_MAX } from '@dojo/shim/string';

const BASE64_KEYSTR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function decodeUtf8EncodedCodePoint(codePoint: number, validationRange: number[] = [ 0, Infinity ], checkSurrogate?: boolean): string {
	if (codePoint < validationRange[0] || codePoint > validationRange[1]) {
		throw Error('Invalid continuation byte');
	}

	if (checkSurrogate && codePoint >= HIGH_SURROGATE_MIN && codePoint <= LOW_SURROGATE_MAX) {
		throw Error('Surrogate is not a scalar value');
	}

	let encoded = '';

	if (codePoint > 0xFFFF) {
		codePoint -= 0x010000;
		encoded += String.fromCharCode(codePoint >>> 0x10 & 0x03FF | HIGH_SURROGATE_MIN);
		codePoint = LOW_SURROGATE_MIN | codePoint & 0x03FF;
	}

	encoded += String.fromCharCode(codePoint);

	return encoded;
}

function validateUtf8EncodedCodePoint(codePoint: number): void {
	if ((codePoint & 0xC0) !== 0x80) {
		throw Error('Invalid continuation byte');
	}
}

export type ByteBuffer = Uint8Array | Buffer | number[];

export interface Codec {
	encode(data: string): number[];
	decode(data: ByteBuffer): string;
}

/**
 * Provides facilities for encoding a string into an ASCII-encoded byte buffer and
 * decoding an ASCII-encoded byte buffer into a string.
 */
export const ascii: Codec = {
	/**
	 * Encodes a string into an ASCII-encoded byte buffer.
	 *
	 * @param data The text string to encode
	 */
	encode(data: string): number[] {
		if (data == null) {
			return [];
		}

		const buffer: number[] = [];

		for (let i = 0, length = data.length; i < length; i++) {
			buffer[i] = data.charCodeAt(i);
		}

		return buffer;
	},

	/**
	 * Decodes an ASCII-encoded byte buffer into a string.
	 *
	 * @param data The byte buffer to decode
	 */
	decode(data: ByteBuffer): string {
		if (data == null) {
			return '';
		}

		let decoded = '';

		for (let i = 0, length = data.length; i < length; i++) {
			decoded += String.fromCharCode(data[i]);
		}

		return decoded;
	}
};

/**
 * Provides facilities for encoding a string into a Base64-encoded byte buffer and
 * decoding a Base64-encoded byte buffer into a string.
 */
export const base64: Codec = {
	/**
	 * Encodes a Base64-encoded string into a Base64 byte buffer.
	 *
	 * @param data The Base64-encoded string to encode
	 */
	encode(data: string): number[] {
		if (data == null) {
			return [];
		}

		const buffer: number[] = [];

		let i = 0;
		let length = data.length;

		while (data[--length] === '=') { }
		while (i < length) {
			let encoded = BASE64_KEYSTR.indexOf(data[i++]) << 18;
			if (i <= length) {
				encoded |= BASE64_KEYSTR.indexOf(data[i++]) << 12;
			}
			if (i <= length) {
				encoded |= BASE64_KEYSTR.indexOf(data[i++]) << 6;
			}
			if (i <= length) {
				encoded |= BASE64_KEYSTR.indexOf(data[i++]);
			}

			buffer.push((encoded >>> 16) & 0xff);
			buffer.push((encoded >>> 8) & 0xff);
			buffer.push(encoded & 0xff);
		}

		while (buffer[buffer.length - 1] === 0) {
			buffer.pop();
		}

		return buffer;
	},

	/**
	 * Decodes a Base64-encoded byte buffer into a Base64-encoded string.
	 *
	 * @param data The byte buffer to decode
	 */
	decode(data: ByteBuffer): string {
		if (data == null) {
			return '';
		}

		let decoded = '';
		let i = 0;

		for (let length = data.length - (data.length % 3); i < length; ) {
			let encoded = data[i++] << 16 | data[i++] << 8 | data[i++];

			decoded += BASE64_KEYSTR.charAt((encoded >>> 18) & 0x3F);
			decoded += BASE64_KEYSTR.charAt((encoded >>> 12) & 0x3F);
			decoded += BASE64_KEYSTR.charAt((encoded >>> 6) & 0x3F);
			decoded += BASE64_KEYSTR.charAt(encoded & 0x3F);
		}

		if (data.length % 3 === 1) {
			let encoded = data[i++] << 16;
			decoded += BASE64_KEYSTR.charAt((encoded >>> 18) & 0x3f);
			decoded += BASE64_KEYSTR.charAt((encoded >>> 12) & 0x3f);
			decoded += '==';
		}
		else if (data.length % 3 === 2) {
			let encoded = data[i++] << 16 | data[i++] << 8;
			decoded += BASE64_KEYSTR.charAt((encoded >>> 18) & 0x3f);
			decoded += BASE64_KEYSTR.charAt((encoded >>> 12) & 0x3f);
			decoded += BASE64_KEYSTR.charAt((encoded >>> 6) & 0x3f);
			decoded += '=';
		}

		return decoded;
	}
};

/**
 * Provides facilities for encoding a string into a hex-encoded byte buffer and
 * decoding a hex-encoded byte buffer into a string.
 */
export const hex: Codec = {
	/**
	 * Encodes a string into a hex-encoded byte buffer.
	 *
	 * @param data The hex-encoded string to encode
	 */
	encode(data: string): number[] {
		if (data == null) {
			return [];
		}

		const buffer: number[] = [];

		for (let i = 0, length = data.length; i < length; i += 2) {
			let encodedChar = parseInt(data.substr(i, 2), 16);

			buffer.push(encodedChar);
		}

		return buffer;
	},

	/**
	 * Decodes a hex-encoded byte buffer into a hex-encoded string.
	 *
	 * @param data The byte buffer to decode
	 */
	decode(data: ByteBuffer): string {
		if (data == null) {
			return '';
		}

		let decoded = '';

		for (let i = 0, length = data.length; i < length; i++) {
			decoded += data[i].toString(16).toUpperCase();
		}

		return decoded;
	}
};

/**
 * Provides facilities for encoding a string into a UTF-8-encoded byte buffer and
 * decoding a UTF-8-encoded byte buffer into a string.
 * Inspired by the work of: https://github.com/mathiasbynens/utf8.js
 */
export const utf8: Codec = {
	/**
	 * Encodes a string into a UTF-8-encoded byte buffer.
	 *
	 * @param data The text string to encode
	 */
	encode(data: string): number[] {
		if (data == null) {
			return [];
		}

		const buffer: number[] = [];

		for (let i = 0, length = data.length; i < length; i++) {
			let encodedChar = data.charCodeAt(i);

			/**
			 * Surrogates
			 * http://en.wikipedia.org/wiki/Universal_Character_Set_characters
			 */
			if (encodedChar >= HIGH_SURROGATE_MIN && encodedChar <= HIGH_SURROGATE_MAX) {
				let lowSurrogate = data.charCodeAt(i + 1);
				if (lowSurrogate >= LOW_SURROGATE_MIN && lowSurrogate <= LOW_SURROGATE_MAX) {
					encodedChar = 0x010000 + (encodedChar - HIGH_SURROGATE_MIN) * 0x0400 + (lowSurrogate - LOW_SURROGATE_MIN);
					i++;
				}
			}

			if (encodedChar < 0x80) {
				buffer.push(encodedChar);
			}
			else {
				if (encodedChar < 0x800) {
					buffer.push(((encodedChar >> 0x06) & 0x1F) | 0xC0);
				}
				else if (encodedChar < 0x010000) {
					if (encodedChar >= HIGH_SURROGATE_MIN && encodedChar <= LOW_SURROGATE_MAX) {
						throw Error('Surrogate is not a scalar value');
					}

					buffer.push(((encodedChar >> 0x0C) & 0x0F) | 0xE0);
					buffer.push(((encodedChar >> 0x06) & 0x3F) | 0x80);
				}
				else if (encodedChar < 0x200000) {
					buffer.push(((encodedChar >> 0x12) & 0x07) | 0xF0);
					buffer.push(((encodedChar >> 0x0C) & 0x3F) | 0x80);
					buffer.push(((encodedChar >> 0x06) & 0x3F) | 0x80);
				}
				buffer.push((encodedChar & 0x3F) | 0x80);
			}
		}

		return buffer;
	},

	/**
	 * Decodes a UTF-8-encoded byte buffer into a string.
	 *
	 * @param data The byte buffer to decode
	 */
	decode(data: ByteBuffer): string {
		if (data == null) {
			return '';
		}

		let decoded = '';

		for (let i = 0, length = data.length; i < length; i++) {
			let byte1 = data[i] & 0xFF;

			if ((byte1 & 0x80) === 0) {
				decoded += decodeUtf8EncodedCodePoint(byte1);
			}
			else if ((byte1 & 0xE0) === 0xC0) {
				let byte2 = data[++i] & 0xFF;
				validateUtf8EncodedCodePoint(byte2);
				byte2 = byte2 & 0x3F;
				let encodedByte = ((byte1 & 0x1F) << 0x06) | byte2;
				decoded += decodeUtf8EncodedCodePoint(encodedByte, [0x80, Infinity]);
			}
			else if ((byte1 & 0xF0) === 0xE0) {
				let byte2 = data[++i] & 0xFF;
				validateUtf8EncodedCodePoint(byte2);
				byte2 = byte2 & 0x3F;

				let byte3 = data[++i] & 0xFF;
				validateUtf8EncodedCodePoint(byte3);
				byte3 = byte3 & 0x3F;

				let encodedByte = ((byte1 & 0x1F) << 0x0C) | (byte2 << 0x06) | byte3;
				decoded += decodeUtf8EncodedCodePoint(encodedByte, [ 0x0800, Infinity ], true);
			}
			else if ((byte1 & 0xF8) === 0xF0) {
				let byte2 = data[++i] & 0xFF;
				validateUtf8EncodedCodePoint(byte2);
				byte2 = byte2 & 0x3F;

				let byte3 = data[++i] & 0xFF;
				validateUtf8EncodedCodePoint(byte3);
				byte3 = byte3 & 0x3F;

				let byte4 = data[++i] & 0xFF;
				validateUtf8EncodedCodePoint(byte4);
				byte4 = byte4 & 0x3F;

				let encodedByte = ((byte1 & 0x1F) << 0x0C) | (byte2 << 0x0C) | (byte3 << 0x06) | byte4;
				decoded += decodeUtf8EncodedCodePoint(encodedByte, [ 0x010000, 0x10FFFF ]);
			}
			else {
				validateUtf8EncodedCodePoint(byte1);
			}
		}

		return decoded;
	}
};
