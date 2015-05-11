import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import { codePointAt, endsWith, escapeRegExp, escapeXml, fromCodePoint, includes,
	padStart, padEnd, repeat, startsWith } from 'src/string';

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
				codePointAt(undefined);
			}, TypeError);
			assert.throws(function () {
				codePointAt(null);
			}, TypeError);
		},

		'string starting with a BMP symbol'() {
			var text = 'abc\uD834\uDF06def';

			// Cases expected to return the first code point (i.e. position 0)
			assert.strictEqual(codePointAt(text), 0x61);
			assert.strictEqual(codePointAt(text, 0), 0x61);
			assert.strictEqual(codePointAt(text, NaN), 0x61);
			assert.strictEqual(codePointAt(text, null), 0x61);
			assert.strictEqual(codePointAt(text, undefined), 0x61);

			// Cases expected to return undefined (i.e. position out of range)
			assert.strictEqual(codePointAt(text, -Infinity), undefined);
			assert.strictEqual(codePointAt(text, Infinity), undefined);
			assert.strictEqual(codePointAt(text, -1), undefined);
			assert.strictEqual(codePointAt(text, 42), undefined);

			// Test various code points in the string
			assert.strictEqual(codePointAt(text, 3), 0x1D306);
			assert.strictEqual(codePointAt(text, 4), 0xDF06);
			assert.strictEqual(codePointAt(text, 5), 0x64);
		},

		'string starting with an astral symbol'() {
			var text = '\uD834\uDF06def';
			assert.strictEqual(codePointAt(text, 0), 0x1D306);
			assert.strictEqual(codePointAt(text, 1), 0xDF06);
		},

		'lone high/low surrogates'() {
			assert.strictEqual(codePointAt('\uD834abc', 0), 0xD834);
			assert.strictEqual(codePointAt('\uDF06abc', 0), 0xDF06);
		}
	},

	'.endsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				endsWith(undefined, 'abc');
			});
			assert.throws(function () {
				endsWith(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(endsWith('undefined', undefined));
			assert.isFalse(endsWith('undefined', null));
			assert.isTrue(endsWith('null', null));
			assert.isFalse(endsWith('null', undefined));
		},

		'position is Infinity, not included, or NaN'() {
			let counts = [ Infinity, undefined, null, NaN ];
			for (let i = counts.length; i--;) {
				assert.isTrue(endsWith('abc', '', counts[i]));
				assert.isFalse(endsWith('abc', '\0', counts[i]));
				assert.isTrue(endsWith('abc', 'c', counts[i]));
				assert.isFalse(endsWith('abc', 'b', counts[i]));
				assert.isTrue(endsWith('abc', 'bc', counts[i]));
				assert.isTrue(endsWith('abc', 'abc', counts[i]));
				assert.isFalse(endsWith('abc', 'abcd', counts[i]));
			}
		},

		'position is 0 or negative'() {
			let counts = [ 0, -1 ];
			for (let i = counts.length; i--;) {
				assert.isTrue(endsWith('abc', '', counts[i]));
				assert.isFalse(endsWith('abc', '\0', counts[i]));
				assert.isFalse(endsWith('abc', 'a', counts[i]));
				assert.isFalse(endsWith('abc', 'b', counts[i]));
				assert.isFalse(endsWith('abc', 'ab', counts[i]));
				assert.isFalse(endsWith('abc', 'abc', counts[i]));
				assert.isFalse(endsWith('abc', 'abcd', counts[i]));
			}
		},

		'position is 1'() {
			assert.isTrue(endsWith('abc', '', 1));
			assert.isFalse(endsWith('abc', '\0', 1));
			assert.isTrue(endsWith('abc', 'a', 1));
			assert.isFalse(endsWith('abc', 'b', 1));
			assert.isFalse(endsWith('abc', 'bc', 1));
			assert.isFalse(endsWith('abc', 'abc', 1));
			assert.isFalse(endsWith('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(endsWith('\xA2fa\xA3', 'fa\xA3'));
			assert.isTrue(endsWith('\xA2fa', '\xA2', 1));
			assert.isTrue(endsWith('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(endsWith('\xA2fa\uDA04', 'fa', 3));
			assert.isTrue(endsWith('\xA2fa\uDA04', '\uDA04'));
		}
	},

	'.escapeRegExp()'() {
		assert.strictEqual(escapeRegExp(''), '');
		assert.strictEqual(escapeRegExp('[]{}()|\\^$.*+?'), '\\[\\]\\{\\}\\(\\)\\|\\\\\\^\\$\\.\\*\\+\\?');
	},

	'.escapeXml()'() {
		let html = '<p class="text">Fox & Hound\'s</p>';

		assert.strictEqual(escapeXml(''), '');
		assert.strictEqual(escapeXml(html, false), '&lt;p class="text">Fox &amp; Hound\'s&lt;/p>');
		assert.strictEqual(escapeXml(html), '&lt;p class=&quot;text&quot;&gt;Fox &amp; Hound&#39;s&lt;/p&gt;');
	},

	'.fromCodePoint()': {
		'error cases'() {
			let codePoints = [ -1, 0x10FFFF + 1, 3.14, 3e-2, Infinity, -Infinity, NaN, undefined ];
			for (var i = codePoints.length; i--;) {
				assert.throws(function () {
					fromCodePoint(codePoints[i]);
				}, RangeError);
			}
		},

		'basic cases'() {
			assert.strictEqual(fromCodePoint(null), '\0');
			assert.strictEqual(fromCodePoint(0), '\0');
			assert.strictEqual(fromCodePoint(), '');
			assert.strictEqual(fromCodePoint(0x1D306), '\uD834\uDF06');
			assert.strictEqual(fromCodePoint(0x1D306, 0x61, 0x1D307), '\uD834\uDF06a\uD834\uDF07');
			assert.strictEqual(fromCodePoint(0x61, 0x62, 0x1D307), 'ab\uD834\uDF07');
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
				fromCodePoint.apply(null, oneUnitArgs);
				fromCodePoint.apply(null, twoUnitArgs);
			});
		}
	},

	'.includes()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				includes(undefined, 'abc');
			});
			assert.throws(function () {
				includes(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(includes('undefined', undefined));
			assert.isFalse(includes('undefined', null));
			assert.isTrue(includes('null', null));
			assert.isFalse(includes('null', undefined));
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [ 0, -1, NaN, undefined, null ];
			for (let i = counts.length; i--;) {
				assert.isTrue(includes('abc', '', counts[i]));
				assert.isFalse(includes('abc', '\0', counts[i]));
				assert.isTrue(includes('abc', 'a', counts[i]));
				assert.isTrue(includes('abc', 'b', counts[i]));
				assert.isTrue(includes('abc', 'ab', counts[i]));
				assert.isTrue(includes('abc', 'abc', counts[i]));
				assert.isFalse(includes('abc', 'abcd', counts[i]));
			}
		},

		'position is Infinity'() {
			assert.isTrue(includes('abc', '', Infinity));
			assert.isFalse(includes('abc', '\0', Infinity));
			assert.isFalse(includes('abc', 'a', Infinity));
			assert.isFalse(includes('abc', 'b', Infinity));
			assert.isFalse(includes('abc', 'ab', Infinity));
			assert.isFalse(includes('abc', 'abc', Infinity));
			assert.isFalse(includes('abc', 'abcd', Infinity));
		},

		'position is 1'() {
			assert.isTrue(includes('abc', '', 1));
			assert.isFalse(includes('abc', '\0', 1));
			assert.isFalse(includes('abc', 'a', 1));
			assert.isTrue(includes('abc', 'b', 1));
			assert.isTrue(includes('abc', 'bc', 1));
			assert.isFalse(includes('abc', 'abc', 1));
			assert.isFalse(includes('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(includes('\xA2fa', '\xA2'));
			assert.isTrue(includes('\xA2fa', 'fa', 1));
			assert.isTrue(includes('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(includes('\xA2fa\uDA04', 'fa\uDA04', 1));
			assert.isTrue(includes('\xA2fa\uDA04', '\uDA04', 3));
		}
	},

	'.padEnd()': {
		'error cases': createPaddingErrorTests(padEnd),
		'basic tests'() {
			assert.strictEqual(padEnd('Lorem', 10), 'Lorem00000');
			assert.strictEqual(padEnd('Lorem', 10, ' '), 'Lorem     ');
			assert.strictEqual(padEnd('Lorem', 5), 'Lorem');
			assert.strictEqual(padEnd('Lorem', 1), 'Lorem');
		}
	},

	'.padStart()': {
		'error cases': createPaddingErrorTests(padStart),
		'basic tests'() {
			assert.strictEqual(padStart('Lorem', 10), '00000Lorem');
			assert.strictEqual(padStart('Lorem', 10, ' '), '     Lorem');
			assert.strictEqual(padStart('Lorem', 5), 'Lorem');
			assert.strictEqual(padStart('Lorem', 1), 'Lorem');
		}
	},

	'.repeat()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				repeat(undefined);
			}, TypeError);
			assert.throws(function () {
				repeat(null);
			}, TypeError);
		},

		'throws on negative or infinite count'() {
			let counts = [ -Infinity, -1, Infinity ];
			for (var i = counts.length; i--;) {
				assert.throws(function () {
					repeat('abc', counts[i]);
				}, RangeError);
			}
		},

		'returns empty string when passed 0, NaN, or no count'() {
			assert.strictEqual(repeat('abc'), '');
			let counts = [ undefined, null, 0, NaN ];
			for (let i = counts.length; i--;) {
				assert.strictEqual(repeat('abc', counts[i]), '');
			}
		},

		'returns expected string for positive numbers'() {
			assert.strictEqual(repeat('abc', 1), 'abc');
			assert.strictEqual(repeat('abc', 2), 'abcabc');
			assert.strictEqual(repeat('abc', 3), 'abcabcabc');
			assert.strictEqual(repeat('abc', 4), 'abcabcabcabc');
		}
	},

	'.startsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				startsWith(undefined, 'abc');
			});
			assert.throws(function () {
				startsWith(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(startsWith('undefined', undefined));
			assert.isFalse(startsWith('undefined', null));
			assert.isTrue(startsWith('null', null));
			assert.isFalse(startsWith('null', undefined));
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [ 0, -1, NaN, undefined, null ];
			for (let i = counts.length; i--;) {
				assert.isTrue(startsWith('abc', '', counts[i]));
				assert.isFalse(startsWith('abc', '\0', counts[i]));
				assert.isTrue(startsWith('abc', 'a', counts[i]));
				assert.isFalse(startsWith('abc', 'b', counts[i]));
				assert.isTrue(startsWith('abc', 'ab', counts[i]));
				assert.isTrue(startsWith('abc', 'abc', counts[i]));
				assert.isFalse(startsWith('abc', 'abcd', counts[i]));
			}
		},

		'position is Infinity'() {
			assert.isTrue(includes('abc', '', Infinity));
			assert.isFalse(startsWith('abc', '\0', Infinity));
			assert.isFalse(startsWith('abc', 'a', Infinity));
			assert.isFalse(startsWith('abc', 'b', Infinity));
			assert.isFalse(startsWith('abc', 'ab', Infinity));
			assert.isFalse(startsWith('abc', 'abc', Infinity));
			assert.isFalse(startsWith('abc', 'abcd', Infinity));
		},

		'position is 1'() {
			assert.isTrue(startsWith('abc', '', 1));
			assert.isFalse(startsWith('abc', '\0', 1));
			assert.isFalse(startsWith('abc', 'a', 1));
			assert.isTrue(startsWith('abc', 'b', 1));
			assert.isTrue(startsWith('abc', 'bc', 1));
			assert.isFalse(startsWith('abc', 'abc', 1));
			assert.isFalse(startsWith('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(startsWith('\xA2fa', '\xA2'));
			assert.isTrue(startsWith('\xA2fa', 'fa', 1));
			assert.isTrue(startsWith('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(startsWith('\xA2fa\uDA04', 'fa\uDA04', 1));
			assert.isTrue(startsWith('\xA2fa\uDA04', '\uDA04', 3));
		}
	}
});
