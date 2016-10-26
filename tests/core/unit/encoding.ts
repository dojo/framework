import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { ascii, utf8, hex, base64 } from '../../src/encoding';
import global from '../../src/global';

const ASCII_BUFFER = [ 116, 104, 101, 32, 99, 97, 116, 32, 97, 110, 100, 32,
	116, 104, 101, 32, 104, 97, 116 ];
const ASCII_STRING = 'the cat and the hat';
const BASE64_BUFFER = [ 102, 100, 97, 115 ];
const BASE64_STRING = 'ZmRhcw==';
const HEX_BUFFER = [ 0xCB, 0xDE ];
const HEX_STRING = 'CBDE';
const UTF8_BUFFER = [ 116, 104, 101, 32, 99, 97, 116, 239, 189, 183, 32, 97, 110, 100, 32,
	239, 189, 166, 32, 116, 104, 101, 32, 104, 97, 116 ];
const UTF8_STRING = 'the catｷ and ｦ the hat';

const UTF8_SURROGATE_TEST_DATA = [
	{
		encoding: '\uD800',
		decoding: [ 0xED, 0xA0, 0x80 ]
	},
	{
		encoding: '\uD800\uD800',
		decoding: [ 0xED, 0xA0, 0x80, 0xED, 0xA0, 0x80 ]
	},
	{
		encoding: '\uD80A',
		decoding: [ 0xED, 0xA0, 0x080A ]
	},
	{
		encoding: '\uD800\uD834\uDF06\uD800',
		decoding: [ 0xED, 0xA0, 0x80, 0xF0, 0x9D, 0x86, 0xED, 0xA0, 0x80 ]
	},
	{
		encoding: '\uD9AF',
		decoding: [ 0xED, 0xA6, 0xAF ]
	},
	{
		encoding: '\uDBFF',
		decoding: [ 0xED, 0xAF, 0xBF ]
	},
	{
		encoding: '\uDC00',
		decoding: [ 0xED, 0xB0, 0x80 ]
	},
	{
		encoding: '\uDC00\uDC00',
		decoding: [ 0xED, 0xB0, 0x80, 0xED, 0xB0, 0x80 ]
	},
	{
		encoding: '\uDC00A',
		decoding: [ 0xED, 0xB0, 0x080A ]
	},
	{
		encoding: '\uDC00\uD834\uDF06\uDC00',
		decoding: [ 0xED, 0xB0, 0x80, 0xF9, 0x9D, 0x8C, 0xED, 0xB0, 0x80 ]
	},
	{
		encoding: '\uDEEE',
		decoding: [ 0xED, 0xBB, 0xAE ]
	},
	{
		encoding: '\uDFFF',
		decoding: [ 0xED, 0xBF, 0xBF ]
	}
];

// These are not added to has.ts since they are only used by unit tests
const hasBuffer = 'buffer' in global;
const hasUint8Array = 'Uint8Array' in global;
const hasUint16Array = 'Uint16Array' in global;

registerSuite({
	name: 'Encoding Classes',

	'ascii': {
		'.encode()'() {
			let buffer = ascii.encode(ASCII_STRING);
			assert.deepEqual(buffer, ASCII_BUFFER);

			buffer = ascii.encode('1');
			assert.lengthOf(buffer, 1);
			assert.strictEqual(buffer[0], 49);

			assert.deepEqual([], ascii.encode(<any> undefined));
			assert.deepEqual([], ascii.encode(<any> null));
		},

		'.decode()'() {
			let decoded = ascii.decode(ASCII_BUFFER);
			assert.strictEqual(decoded, ASCII_STRING);

			assert.strictEqual(ASCII_STRING, ascii.decode(ascii.encode(ASCII_STRING)));

			assert.strictEqual(ascii.decode(<any> undefined), '');
			assert.strictEqual(ascii.decode(<any> null), '');

			if (hasBuffer) {
				let buffer = new Buffer('The cat and the hat');
				assert.strictEqual(ascii.decode(buffer), 'The cat and the hat');
			}
			else if (hasUint8Array) {
				let buffer = new Uint8Array(ASCII_BUFFER);
				assert.strictEqual(ascii.decode(buffer), ASCII_STRING);
			}
		}
	},

	'base64': {
		'.encode()'() {
			let buffer = base64.encode(BASE64_STRING);
			assert.deepEqual(buffer, BASE64_BUFFER);

			assert.deepEqual([], base64.encode(<any> undefined));
			assert.deepEqual([], base64.encode(<any> null));
		},

		'.decode()'() {
			let decoded = base64.decode(BASE64_BUFFER);
			assert.strictEqual(decoded, BASE64_STRING);

			assert.strictEqual(base64.decode(<any> undefined), '');
			assert.strictEqual(base64.decode(<any> null), '');

			assert.strictEqual(base64.decode([ 102, 100, 97, 115, 0 ]), 'ZmRhcwA=');

			assert.strictEqual(BASE64_STRING, base64.decode(base64.encode(BASE64_STRING)));

			if (hasBuffer) {
				let buffer = new Buffer(BASE64_BUFFER);
				assert.strictEqual(base64.decode(buffer), BASE64_STRING);
			}
			else if (hasUint8Array) {
				let buffer = new Uint8Array(BASE64_BUFFER);
				assert.strictEqual(base64.decode(buffer), BASE64_STRING);
			}
		}
	},

	'hex': {
		'.encode()'() {
			let buffer = hex.encode(HEX_STRING);
			assert.deepEqual(buffer, HEX_BUFFER);

			assert.deepEqual([], hex.encode(<any> undefined));
			assert.deepEqual([], hex.encode(<any> null));
		},

		'.decode()'() {
			let decoded = hex.decode(HEX_BUFFER);
			assert.lengthOf(decoded, 4);
			assert.strictEqual(decoded, HEX_STRING);

			assert.strictEqual(HEX_STRING, hex.decode(hex.encode(HEX_STRING)));
			assert.strictEqual(hex.decode(<any> undefined), '');
			assert.strictEqual(hex.decode(<any> null), '');

			if (hasBuffer) {
				let buffer = new Buffer(HEX_BUFFER);
				assert.strictEqual(hex.decode(buffer), HEX_STRING);
			}
			else if (hasUint8Array) {
				let buffer = new Uint8Array(HEX_BUFFER);
				assert.strictEqual(hex.decode(buffer), HEX_STRING);
			}
		}
	},

	'utf8': {
		'.encode()'() {
			let buffer = utf8.encode(UTF8_STRING);
			let testData: any;
			assert.deepEqual(buffer, UTF8_BUFFER);

			// test surrogates
			for (testData of UTF8_SURROGATE_TEST_DATA) {
				assert.throws(function () {
					utf8.encode(testData.encoding);
				});
			}

			buffer = utf8.encode('1');
			assert.lengthOf(buffer, 1);
			assert.strictEqual(buffer[0], 49);

			assert.deepEqual([], utf8.encode(<any> undefined));
			assert.deepEqual([], utf8.encode(<any> null));

			buffer = utf8.encode('\u0000');
			let bufferArray = [0];
			assert.deepEqual(buffer, bufferArray);

			buffer = utf8.encode('\\');
			bufferArray = [ 0x5C ];
			assert.deepEqual(buffer, bufferArray);

			buffer = utf8.encode('');
			bufferArray = [ 0xC2, 0x80 ];
			assert.deepEqual(buffer, bufferArray);

			buffer = utf8.encode('ⰼ');
			bufferArray = [ 0xE2, 0xB0, 0xBC ];
			assert.deepEqual(buffer, bufferArray);

			buffer = utf8.encode('𐐁');
			bufferArray = [ 0xF0, 0x90, 0x90, 0x81 ];
			assert.deepEqual(buffer, bufferArray);
		},

		'.decode()'() {
			let decoded = utf8.decode(UTF8_BUFFER);
			let testData: any;
			assert.strictEqual(decoded, UTF8_STRING);

			assert.strictEqual(UTF8_STRING, utf8.decode(utf8.encode(UTF8_STRING)));

			// test surrogates
			for (testData of UTF8_SURROGATE_TEST_DATA) {
				assert.throws(function () {
					utf8.decode(testData.decoding);
				});
			}

			assert.strictEqual(utf8.decode([ 0 ]), '\u0000');
			assert.strictEqual(utf8.decode([ 0x5C ]), '\\');
			assert.strictEqual(utf8.decode([ 0xC2, 0x80 ]), '');
			assert.strictEqual(utf8.decode([ 0xE2, 0xB0, 0xBC ]), 'ⰼ');
			assert.strictEqual(utf8.decode([ 0xF0, 0x9D, 0x8C, 0x86 ]), '𐌆');

			assert.strictEqual(utf8.decode(<any> undefined), '');
			assert.strictEqual(utf8.decode(<any> null), '');

			assert.throws(function () {
				utf8.decode([ 0xFFFFFF ]);
			});

			assert.throws(function () {
				utf8.decode([ 0xFFFFFFFF ]);
			});

			assert.throws(function () {
				utf8.decode([ 0x1FFFF ]);
			});

			if (hasBuffer) {
				let buffer = new Buffer('The cat and the hat');
				assert.strictEqual(utf8.decode(buffer), 'The cat and the hat');

			}
			else if (hasUint16Array) {
				let buffer = new Uint16Array(UTF8_BUFFER);
				assert.strictEqual(utf8.decode(buffer), UTF8_STRING);
			}
		}
	}
});
