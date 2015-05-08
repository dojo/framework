import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import { escapeRegExp, escapeXml, padStart, padEnd, startsWith, includes, endsWith } from 'src/string';

registerSuite({
	name: 'string functions',

	'.escapeRegExp()': function () {
		assert.equal(escapeRegExp('[]{}()|\\^$.*+?'), '\\[\\]\\{\\}\\(\\)\\|\\\\\\^\\$\\.\\*\\+\\?');
	},

	'.escapeXml()': function () {
		let html = '<p class="text">Fox & Hound\'s</p>';

		assert.equal(escapeXml(html, false), '&lt;p class="text">Fox &amp; Hound\'s&lt;/p>');
		assert.equal(escapeXml(html), '&lt;p class=&quot;text&quot;&gt;Fox &amp; Hound&#39;s&lt;/p&gt;');
	},

	'.padStart()': function () {
		assert.equal(padStart('Lorem', 10), '00000Lorem');
		assert.equal(padStart('Lorem', 10, ' '), '     Lorem');
		assert.equal(padStart('Lorem', 5), 'Lorem');
		assert.equal(padStart('Lorem', 1), 'Lorem');
		assert.throw(function () {
			padStart('Lorem', 10, '');
		}, TypeError);
		assert.throw(function () {
			padStart('Lorem', -5);
		}, RangeError);
		assert.throw(function () {
			padStart('Lorem', Infinity);
		}, RangeError);
	},

	'.padEnd()': function () {
		assert.equal(padEnd('Lorem', 10), 'Lorem00000');
		assert.equal(padEnd('Lorem', 10, ' '), 'Lorem     ');
		assert.equal(padEnd('Lorem', 5), 'Lorem');
		assert.equal(padEnd('Lorem', 1), 'Lorem');
		assert.throw(function () {
			padEnd('Lorem', 10, '');
		}, TypeError);
		assert.throw(function () {
			padEnd('Lorem', -5);
		}, RangeError);
		assert.throw(function () {
			padEnd('Lorem', Infinity);
		}, RangeError);
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
	}
});
