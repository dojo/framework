import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as stringUtil from 'src/string';

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
				stringUtil.codePointAt(undefined);
			}, TypeError);
			assert.throws(function () {
				stringUtil.codePointAt(null);
			}, TypeError);
		},

		'string starting with a BMP symbol'() {
			const text = 'abc\uD834\uDF06def';

			// Cases expected to return the first code point (i.e. position 0)
			assert.strictEqual(stringUtil.codePointAt(text), 0x61);
			assert.strictEqual(stringUtil.codePointAt(text, 0), 0x61);
			assert.strictEqual(stringUtil.codePointAt(text, NaN), 0x61);
			assert.strictEqual(stringUtil.codePointAt(text, null), 0x61);
			assert.strictEqual(stringUtil.codePointAt(text, undefined), 0x61);

			// Cases expected to return undefined (i.e. position out of range)
			assert.strictEqual(stringUtil.codePointAt(text, -Infinity), undefined);
			assert.strictEqual(stringUtil.codePointAt(text, Infinity), undefined);
			assert.strictEqual(stringUtil.codePointAt(text, -1), undefined);
			assert.strictEqual(stringUtil.codePointAt(text, 42), undefined);

			// Test various code points in the string
			assert.strictEqual(stringUtil.codePointAt(text, 3), 0x1D306);
			assert.strictEqual(stringUtil.codePointAt(text, 4), 0xDF06);
			assert.strictEqual(stringUtil.codePointAt(text, 5), 0x64);
		},

		'string starting with an astral symbol'() {
			const text = '\uD834\uDF06def';
			assert.strictEqual(stringUtil.codePointAt(text, 0), 0x1D306);
			assert.strictEqual(stringUtil.codePointAt(text, 1), 0xDF06);
		},

		'lone high/low surrogates'() {
			assert.strictEqual(stringUtil.codePointAt('\uD834abc', 0), 0xD834);
			assert.strictEqual(stringUtil.codePointAt('\uDF06abc', 0), 0xDF06);
		}
	},

	'.endsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				stringUtil.endsWith(undefined, 'abc');
			});
			assert.throws(function () {
				stringUtil.endsWith(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(stringUtil.endsWith('undefined', undefined));
			assert.isFalse(stringUtil.endsWith('undefined', null));
			assert.isTrue(stringUtil.endsWith('null', null));
			assert.isFalse(stringUtil.endsWith('null', undefined));
		},

		'position is Infinity, not included, or NaN'() {
			let counts = [ Infinity, undefined, null, NaN ];
			for (let count of counts) {
				assert.isTrue(stringUtil.endsWith('abc', '', count));
				assert.isFalse(stringUtil.endsWith('abc', '\0', count));
				assert.isTrue(stringUtil.endsWith('abc', 'c', count));
				assert.isFalse(stringUtil.endsWith('abc', 'b', count));
				assert.isTrue(stringUtil.endsWith('abc', 'bc', count));
				assert.isTrue(stringUtil.endsWith('abc', 'abc', count));
				assert.isFalse(stringUtil.endsWith('abc', 'abcd', count));
			}
		},

		'position is 0 or negative'() {
			let counts = [ 0, -1 ];
			for (let count of counts) {
				assert.isTrue(stringUtil.endsWith('abc', '', count));
				assert.isFalse(stringUtil.endsWith('abc', '\0', count));
				assert.isFalse(stringUtil.endsWith('abc', 'a', count));
				assert.isFalse(stringUtil.endsWith('abc', 'b', count));
				assert.isFalse(stringUtil.endsWith('abc', 'ab', count));
				assert.isFalse(stringUtil.endsWith('abc', 'abc', count));
				assert.isFalse(stringUtil.endsWith('abc', 'abcd', count));
			}
		},

		'position is 1'() {
			assert.isTrue(stringUtil.endsWith('abc', '', 1));
			assert.isFalse(stringUtil.endsWith('abc', '\0', 1));
			assert.isTrue(stringUtil.endsWith('abc', 'a', 1));
			assert.isFalse(stringUtil.endsWith('abc', 'b', 1));
			assert.isFalse(stringUtil.endsWith('abc', 'bc', 1));
			assert.isFalse(stringUtil.endsWith('abc', 'abc', 1));
			assert.isFalse(stringUtil.endsWith('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(stringUtil.endsWith('\xA2fa\xA3', 'fa\xA3'));
			assert.isTrue(stringUtil.endsWith('\xA2fa', '\xA2', 1));
			assert.isTrue(stringUtil.endsWith('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(stringUtil.endsWith('\xA2fa\uDA04', 'fa', 3));
			assert.isTrue(stringUtil.endsWith('\xA2fa\uDA04', '\uDA04'));
		}
	},

	'.escapeRegExp()'() {
		assert.strictEqual(stringUtil.escapeRegExp(''), '');
		assert.strictEqual(stringUtil.escapeRegExp('[]{}()|/\\^$.*+?'), '\\[\\]\\{\\}\\(\\)\\|\\/\\\\\\^\\$\\.\\*\\+\\?');
	},

	'.escapeXml()'() {
		let html = '<p class="text">Fox & Hound\'s</p>';

		assert.strictEqual(stringUtil.escapeXml(''), '');
		assert.strictEqual(stringUtil.escapeXml(html, false), '&lt;p class="text">Fox &amp; Hound\'s&lt;/p>');
		assert.strictEqual(stringUtil.escapeXml(html), '&lt;p class=&quot;text&quot;&gt;Fox &amp; Hound&#39;s&lt;/p&gt;');
	},

	'.fromCodePoint()': {
		'error cases'() {
			let codePoints = [-1, 0x10FFFF + 1, 3.14, 3e-2, Infinity, -Infinity, NaN, undefined];
			let codePoint: any;
			for (codePoint of codePoints) {
				assert.throws(function () {
					stringUtil.fromCodePoint(codePoint);
				}, RangeError);
			}
		},

		'basic cases'() {
			assert.strictEqual(stringUtil.fromCodePoint(null), '\0');
			assert.strictEqual(stringUtil.fromCodePoint(0), '\0');
			assert.strictEqual(stringUtil.fromCodePoint(), '');
			assert.strictEqual(stringUtil.fromCodePoint(0x1D306), '\uD834\uDF06');
			assert.strictEqual(stringUtil.fromCodePoint(0x1D306, 0x61, 0x1D307), '\uD834\uDF06a\uD834\uDF07');
			assert.strictEqual(stringUtil.fromCodePoint(0x61, 0x62, 0x1D307), 'ab\uD834\uDF07');
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
				stringUtil.fromCodePoint.apply(null, oneUnitArgs);
				stringUtil.fromCodePoint.apply(null, twoUnitArgs);
			});
		}
	},

	'.includes()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				stringUtil.includes(undefined, 'abc');
			});
			assert.throws(function () {
				stringUtil.includes(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(stringUtil.includes('undefined', undefined));
			assert.isFalse(stringUtil.includes('undefined', null));
			assert.isTrue(stringUtil.includes('null', null));
			assert.isFalse(stringUtil.includes('null', undefined));
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [ 0, -1, NaN, undefined, null ];
			for (let count of counts) {
				assert.isTrue(stringUtil.includes('abc', '', count));
				assert.isFalse(stringUtil.includes('abc', '\0', count));
				assert.isTrue(stringUtil.includes('abc', 'a', count));
				assert.isTrue(stringUtil.includes('abc', 'b', count));
				assert.isTrue(stringUtil.includes('abc', 'ab', count));
				assert.isTrue(stringUtil.includes('abc', 'abc', count));
				assert.isFalse(stringUtil.includes('abc', 'abcd', count));
			}
		},

		'position is Infinity'() {
			assert.isTrue(stringUtil.includes('abc', '', Infinity));
			assert.isFalse(stringUtil.includes('abc', '\0', Infinity));
			assert.isFalse(stringUtil.includes('abc', 'a', Infinity));
			assert.isFalse(stringUtil.includes('abc', 'b', Infinity));
			assert.isFalse(stringUtil.includes('abc', 'ab', Infinity));
			assert.isFalse(stringUtil.includes('abc', 'abc', Infinity));
			assert.isFalse(stringUtil.includes('abc', 'abcd', Infinity));
		},

		'position is 1'() {
			assert.isTrue(stringUtil.includes('abc', '', 1));
			assert.isFalse(stringUtil.includes('abc', '\0', 1));
			assert.isFalse(stringUtil.includes('abc', 'a', 1));
			assert.isTrue(stringUtil.includes('abc', 'b', 1));
			assert.isTrue(stringUtil.includes('abc', 'bc', 1));
			assert.isFalse(stringUtil.includes('abc', 'abc', 1));
			assert.isFalse(stringUtil.includes('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(stringUtil.includes('\xA2fa', '\xA2'));
			assert.isTrue(stringUtil.includes('\xA2fa', 'fa', 1));
			assert.isTrue(stringUtil.includes('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(stringUtil.includes('\xA2fa\uDA04', 'fa\uDA04', 1));
			assert.isTrue(stringUtil.includes('\xA2fa\uDA04', '\uDA04', 3));
		}
	},

	'.padEnd()': {
		'error cases': createPaddingErrorTests(stringUtil.padEnd),
		'basic tests'() {
			assert.strictEqual(stringUtil.padEnd('Lorem', 10), 'Lorem00000');
			assert.strictEqual(stringUtil.padEnd('Lorem', 10, ' '), 'Lorem     ');
			assert.strictEqual(stringUtil.padEnd('Lorem', 5), 'Lorem');
			assert.strictEqual(stringUtil.padEnd('Lorem', 1), 'Lorem');
		}
	},

	'.padStart()': {
		'error cases': createPaddingErrorTests(stringUtil.padStart),
		'basic tests'() {
			assert.strictEqual(stringUtil.padStart('Lorem', 10), '00000Lorem');
			assert.strictEqual(stringUtil.padStart('Lorem', 10, ' '), '     Lorem');
			assert.strictEqual(stringUtil.padStart('Lorem', 5), 'Lorem');
			assert.strictEqual(stringUtil.padStart('Lorem', 1), 'Lorem');
		}
	},

	'.raw()': {
		'error cases'() {
			assert.throws(function () {
				stringUtil.raw(null);
			}, TypeError);
		},

		'basic tests'() {
			let answer = 42;
			assert.strictEqual(stringUtil.raw`The answer is:\n${answer}`, 'The answer is:\\n42',
				'stringUtil.raw applied to template string should result in expected value');

			function getCallSite(callSite: TemplateStringsArray, ...substitutions: any[]) {
				return callSite;
			}

			let callSite = getCallSite`The answer is:\n${answer}`;
			assert.strictEqual(stringUtil.raw(callSite), 'The answer is:\\n',
				'stringUtil.raw applied with insufficient arguments should result in no substitution');

			callSite.raw = [ 'The answer is:\\n' ];
			assert.strictEqual(stringUtil.raw(callSite, 42), 'The answer is:\\n',
				'stringUtil.raw applied with insufficient raw fragments should result in truncation before substitution');
		}
	},

	'.repeat()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				stringUtil.repeat(undefined);
			}, TypeError);
			assert.throws(function () {
				stringUtil.repeat(null);
			}, TypeError);
		},

		'throws on negative or infinite count'() {
			let counts = [-Infinity, -1, Infinity];
			let count: number;
			for (count of counts) {
				assert.throws(function () {
					stringUtil.repeat('abc', count);
				}, RangeError);
			}
		},

		'returns empty string when passed 0, NaN, or no count'() {
			assert.strictEqual(stringUtil.repeat('abc'), '');
			let counts = [ undefined, null, 0, NaN ];
			for (let count of counts) {
				assert.strictEqual(stringUtil.repeat('abc', count), '');
			}
		},

		'returns expected string for positive numbers'() {
			assert.strictEqual(stringUtil.repeat('abc', 1), 'abc');
			assert.strictEqual(stringUtil.repeat('abc', 2), 'abcabc');
			assert.strictEqual(stringUtil.repeat('abc', 3), 'abcabcabc');
			assert.strictEqual(stringUtil.repeat('abc', 4), 'abcabcabcabc');
		}
	},

	'.startsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function () {
				stringUtil.startsWith(undefined, 'abc');
			});
			assert.throws(function () {
				stringUtil.startsWith(null, 'abc');
			});
		},

		'null or undefined search value'() {
			assert.isTrue(stringUtil.startsWith('undefined', undefined));
			assert.isFalse(stringUtil.startsWith('undefined', null));
			assert.isTrue(stringUtil.startsWith('null', null));
			assert.isFalse(stringUtil.startsWith('null', undefined));
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [ 0, -1, NaN, undefined, null ];
			for (let count of counts) {
				assert.isTrue(stringUtil.startsWith('abc', '', count));
				assert.isFalse(stringUtil.startsWith('abc', '\0', count));
				assert.isTrue(stringUtil.startsWith('abc', 'a', count));
				assert.isFalse(stringUtil.startsWith('abc', 'b', count));
				assert.isTrue(stringUtil.startsWith('abc', 'ab', count));
				assert.isTrue(stringUtil.startsWith('abc', 'abc', count));
				assert.isFalse(stringUtil.startsWith('abc', 'abcd', count));
			}
		},

		'position is Infinity'() {
			assert.isTrue(stringUtil.startsWith('abc', '', Infinity));
			assert.isFalse(stringUtil.startsWith('abc', '\0', Infinity));
			assert.isFalse(stringUtil.startsWith('abc', 'a', Infinity));
			assert.isFalse(stringUtil.startsWith('abc', 'b', Infinity));
			assert.isFalse(stringUtil.startsWith('abc', 'ab', Infinity));
			assert.isFalse(stringUtil.startsWith('abc', 'abc', Infinity));
			assert.isFalse(stringUtil.startsWith('abc', 'abcd', Infinity));
		},

		'position is 1'() {
			assert.isTrue(stringUtil.startsWith('abc', '', 1));
			assert.isFalse(stringUtil.startsWith('abc', '\0', 1));
			assert.isFalse(stringUtil.startsWith('abc', 'a', 1));
			assert.isTrue(stringUtil.startsWith('abc', 'b', 1));
			assert.isTrue(stringUtil.startsWith('abc', 'bc', 1));
			assert.isFalse(stringUtil.startsWith('abc', 'abc', 1));
			assert.isFalse(stringUtil.startsWith('abc', 'abcd', 1));
		},

		'unicode support'() {
			assert.isTrue(stringUtil.startsWith('\xA2fa', '\xA2'));
			assert.isTrue(stringUtil.startsWith('\xA2fa', 'fa', 1));
			assert.isTrue(stringUtil.startsWith('\xA2fa\uDA04', '\xA2fa\uDA04'));
			assert.isTrue(stringUtil.startsWith('\xA2fa\uDA04', 'fa\uDA04', 1));
			assert.isTrue(stringUtil.startsWith('\xA2fa\uDA04', '\uDA04', 3));
		}
	}
});
