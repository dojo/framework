import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as string from 'src/string';

function createPaddingErrorTests(func: (text: string, length: number, character?: string) => string) {
	// Tests error cases for padStart and padEnd.
	return function () {
		assert.throw(function () {
			func(null, 10);
		}, TypeError);
		assert.throw(function () {
			func('Lorem', 10, '');
		}, TypeError);
		assert.throw(function () {
			func('Lorem', -5);
		}, RangeError);
		assert.throw(function () {
			func('Lorem', Infinity);
		}, RangeError);
	};
}

registerSuite({
	name: 'string functions',

	'.codePointAt()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				string.codePointAt(undefined);
			}, TypeError);
			assert.throws(function () {
				string.codePointAt(null);
			}, TypeError);
		},

		'string starting with a BMP symbol'() {
			var text = 'abc\uD834\uDF06def';

			// Cases expected to return the first code point (i.e. position 0)
			assert.strictEqual(string.codePointAt(text), 0x61);
			assert.strictEqual(string.codePointAt(text, 0), 0x61);
			assert.strictEqual(string.codePointAt(text, NaN), 0x61);
			assert.strictEqual(string.codePointAt(text, null), 0x61);
			assert.strictEqual(string.codePointAt(text, undefined), 0x61);

			// Cases expected to return undefined (i.e. position out of range)
			assert.strictEqual(string.codePointAt(text, -Infinity), undefined);
			assert.strictEqual(string.codePointAt(text, Infinity), undefined);
			assert.strictEqual(string.codePointAt(text, -1), undefined);
			assert.strictEqual(string.codePointAt(text, 42), undefined);

			// Test various code points in the string
			assert.strictEqual(string.codePointAt(text, 3), 0x1D306);
			assert.strictEqual(string.codePointAt(text, 4), 0xDF06);
			assert.strictEqual(string.codePointAt(text, 5), 0x64);
		},

		'string starting with an astral symbol'() {
			var text = '\uD834\uDF06def';
			assert.strictEqual(string.codePointAt(text, 0), 0x1D306);
			assert.strictEqual(string.codePointAt(text, 1), 0xDF06);
		},

		'lone high/low surrogates'() {
			assert.strictEqual(string.codePointAt('\uD834abc', 0), 0xD834);
			assert.strictEqual(string.codePointAt('\uDF06abc', 0), 0xDF06);
		}
	},

	'.endsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				string.endsWith(undefined, 'abc');
			});
			assert.throws(function () {
				string.endsWith(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(string.endsWith('undefined', undefined));
			assert.isFalse(string.endsWith('undefined', null));
			assert.isTrue(string.endsWith('null', null));
			assert.isFalse(string.endsWith('null', undefined));
		},

		'position is Infinity, not included, or NaN'() {
			let counts = [ Infinity, undefined, null, NaN ];
			for (let count of counts) {
				assert.isTrue(string.endsWith('abc', '', count));
				assert.isFalse(string.endsWith('abc', '\0', count));
				assert.isTrue(string.endsWith('abc', 'c', count));
				assert.isFalse(string.endsWith('abc', 'b', count));
				assert.isTrue(string.endsWith('abc', 'bc', count));
				assert.isTrue(string.endsWith('abc', 'abc', count));
				assert.isFalse(string.endsWith('abc', 'abcd', count));
			}
		},

		'position is 0 or negative'() {
			let counts = [ 0, -1 ];
			for (let count of counts) {
				assert.isTrue(string.endsWith('abc', '', count));
				assert.isFalse(string.endsWith('abc', '\0', count));
				assert.isFalse(string.endsWith('abc', 'a', count));
				assert.isFalse(string.endsWith('abc', 'b', count));
				assert.isFalse(string.endsWith('abc', 'ab', count));
				assert.isFalse(string.endsWith('abc', 'abc', count));
				assert.isFalse(string.endsWith('abc', 'abcd', count));
			}
		},

		'position is 1'() {
			assert.isTrue(string.endsWith('abc', '', 1));
			assert.isFalse(string.endsWith('abc', '\0', 1));
			assert.isTrue(string.endsWith('abc', 'a', 1));
			assert.isFalse(string.endsWith('abc', 'b', 1));
			assert.isFalse(string.endsWith('abc', 'bc', 1));
			assert.isFalse(string.endsWith('abc', 'abc', 1));
			assert.isFalse(string.endsWith('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(string.endsWith('\xA2fa\xA3', 'fa\xA3'));
			assert.isTrue(string.endsWith('\xA2fa', '\xA2', 1));
			assert.isTrue(string.endsWith('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(string.endsWith('\xA2fa\uDA04', 'fa', 3));
			assert.isTrue(string.endsWith('\xA2fa\uDA04', '\uDA04'));
		}
	},

	'.escapeRegExp()'() {
		assert.strictEqual(string.escapeRegExp(''), '');
		assert.strictEqual(string.escapeRegExp('[]{}()|\\^$.*+?'), '\\[\\]\\{\\}\\(\\)\\|\\\\\\^\\$\\.\\*\\+\\?');
	},

	'.escapeXml()'() {
		let html = '<p class="text">Fox & Hound\'s</p>';

		assert.strictEqual(string.escapeXml(''), '');
		assert.strictEqual(string.escapeXml(html, false), '&lt;p class="text">Fox &amp; Hound\'s&lt;/p>');
		assert.strictEqual(string.escapeXml(html), '&lt;p class=&quot;text&quot;&gt;Fox &amp; Hound&#39;s&lt;/p&gt;');
	},

	'.fromCodePoint()': {
		'error cases'() {
			let codePoints = [ -1, 0x10FFFF + 1, 3.14, 3e-2, Infinity, -Infinity, NaN, undefined ];
			for (var codePoint of codePoints) {
				assert.throws(function () {
					string.fromCodePoint(codePoint);
				}, RangeError);
			}
		},

		'basic cases'() {
			assert.strictEqual(string.fromCodePoint(null), '\0');
			assert.strictEqual(string.fromCodePoint(0), '\0');
			assert.strictEqual(string.fromCodePoint(), '');
			assert.strictEqual(string.fromCodePoint(0x1D306), '\uD834\uDF06');
			assert.strictEqual(string.fromCodePoint(0x1D306, 0x61, 0x1D307), '\uD834\uDF06a\uD834\uDF07');
			assert.strictEqual(string.fromCodePoint(0x61, 0x62, 0x1D307), 'ab\uD834\uDF07');
		},

		'test that valid cases do not throw'() {
			let counter = Math.pow(2, 15) * 3 / 2;
			let oneUnitArgs: number[] = [];
			let twoUnitArgs: number[] = [];

			while (--counter >= 0) {
				oneUnitArgs.push(0); // one code unit per symbol
				twoUnitArgs.push(0xFFFF + 1); // two code units per symbol
			}

			assert.doesNotThrow(function () {
				string.fromCodePoint.apply(null, oneUnitArgs);
				string.fromCodePoint.apply(null, twoUnitArgs);
			});
		}
	},

	'.includes()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				string.includes(undefined, 'abc');
			});
			assert.throws(function () {
				string.includes(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(string.includes('undefined', undefined));
			assert.isFalse(string.includes('undefined', null));
			assert.isTrue(string.includes('null', null));
			assert.isFalse(string.includes('null', undefined));
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [ 0, -1, NaN, undefined, null ];
			for (let count of counts) {
				assert.isTrue(string.includes('abc', '', count));
				assert.isFalse(string.includes('abc', '\0', count));
				assert.isTrue(string.includes('abc', 'a', count));
				assert.isTrue(string.includes('abc', 'b', count));
				assert.isTrue(string.includes('abc', 'ab', count));
				assert.isTrue(string.includes('abc', 'abc', count));
				assert.isFalse(string.includes('abc', 'abcd', count));
			}
		},

		'position is Infinity'() {
			assert.isTrue(string.includes('abc', '', Infinity));
			assert.isFalse(string.includes('abc', '\0', Infinity));
			assert.isFalse(string.includes('abc', 'a', Infinity));
			assert.isFalse(string.includes('abc', 'b', Infinity));
			assert.isFalse(string.includes('abc', 'ab', Infinity));
			assert.isFalse(string.includes('abc', 'abc', Infinity));
			assert.isFalse(string.includes('abc', 'abcd', Infinity));
		},

		'position is 1'() {
			assert.isTrue(string.includes('abc', '', 1));
			assert.isFalse(string.includes('abc', '\0', 1));
			assert.isFalse(string.includes('abc', 'a', 1));
			assert.isTrue(string.includes('abc', 'b', 1));
			assert.isTrue(string.includes('abc', 'bc', 1));
			assert.isFalse(string.includes('abc', 'abc', 1));
			assert.isFalse(string.includes('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(string.includes('\xA2fa', '\xA2'));
			assert.isTrue(string.includes('\xA2fa', 'fa', 1));
			assert.isTrue(string.includes('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(string.includes('\xA2fa\uDA04', 'fa\uDA04', 1));
			assert.isTrue(string.includes('\xA2fa\uDA04', '\uDA04', 3));
		}
	},

	'.padEnd()': {
		'error cases': createPaddingErrorTests(string.padEnd),
		'basic tests'() {
			assert.strictEqual(string.padEnd('Lorem', 10), 'Lorem00000');
			assert.strictEqual(string.padEnd('Lorem', 10, ' '), 'Lorem     ');
			assert.strictEqual(string.padEnd('Lorem', 5), 'Lorem');
			assert.strictEqual(string.padEnd('Lorem', 1), 'Lorem');
		}
	},

	'.padStart()': {
		'error cases': createPaddingErrorTests(string.padStart),
		'basic tests'() {
			assert.strictEqual(string.padStart('Lorem', 10), '00000Lorem');
			assert.strictEqual(string.padStart('Lorem', 10, ' '), '     Lorem');
			assert.strictEqual(string.padStart('Lorem', 5), 'Lorem');
			assert.strictEqual(string.padStart('Lorem', 1), 'Lorem');
		}
	},

	'.repeat()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				string.repeat(undefined);
			}, TypeError);
			assert.throws(function () {
				string.repeat(null);
			}, TypeError);
		},

		'throws on negative or infinite count'() {
			let counts = [ -Infinity, -1, Infinity ];
			for (var count of counts) {
				assert.throws(function () {
					string.repeat('abc', count);
				}, RangeError);
			}
		},

		'returns empty string when passed 0, NaN, or no count'() {
			assert.strictEqual(string.repeat('abc'), '');
			let counts = [ undefined, null, 0, NaN ];
			for (let count of counts) {
				assert.strictEqual(string.repeat('abc', count), '');
			}
		},

		'returns expected string for positive numbers'() {
			assert.strictEqual(string.repeat('abc', 1), 'abc');
			assert.strictEqual(string.repeat('abc', 2), 'abcabc');
			assert.strictEqual(string.repeat('abc', 3), 'abcabcabc');
			assert.strictEqual(string.repeat('abc', 4), 'abcabcabcabc');
		}
	},

	'.startsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				string.startsWith(undefined, 'abc');
			});
			assert.throws(function () {
				string.startsWith(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(string.startsWith('undefined', undefined));
			assert.isFalse(string.startsWith('undefined', null));
			assert.isTrue(string.startsWith('null', null));
			assert.isFalse(string.startsWith('null', undefined));
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [ 0, -1, NaN, undefined, null ];
			for (let count of counts) {
				assert.isTrue(string.startsWith('abc', '', count));
				assert.isFalse(string.startsWith('abc', '\0', count));
				assert.isTrue(string.startsWith('abc', 'a', count));
				assert.isFalse(string.startsWith('abc', 'b', count));
				assert.isTrue(string.startsWith('abc', 'ab', count));
				assert.isTrue(string.startsWith('abc', 'abc', count));
				assert.isFalse(string.startsWith('abc', 'abcd', count));
			}
		},

		'position is Infinity'() {
			assert.isTrue(string.startsWith('abc', '', Infinity));
			assert.isFalse(string.startsWith('abc', '\0', Infinity));
			assert.isFalse(string.startsWith('abc', 'a', Infinity));
			assert.isFalse(string.startsWith('abc', 'b', Infinity));
			assert.isFalse(string.startsWith('abc', 'ab', Infinity));
			assert.isFalse(string.startsWith('abc', 'abc', Infinity));
			assert.isFalse(string.startsWith('abc', 'abcd', Infinity));
		},

		'position is 1'() {
			assert.isTrue(string.startsWith('abc', '', 1));
			assert.isFalse(string.startsWith('abc', '\0', 1));
			assert.isFalse(string.startsWith('abc', 'a', 1));
			assert.isTrue(string.startsWith('abc', 'b', 1));
			assert.isTrue(string.startsWith('abc', 'bc', 1));
			assert.isFalse(string.startsWith('abc', 'abc', 1));
			assert.isFalse(string.startsWith('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(string.startsWith('\xA2fa', '\xA2'));
			assert.isTrue(string.startsWith('\xA2fa', 'fa', 1));
			assert.isTrue(string.startsWith('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(string.startsWith('\xA2fa\uDA04', 'fa\uDA04', 1));
			assert.isTrue(string.startsWith('\xA2fa\uDA04', '\uDA04', 3));
		}
	}
});
