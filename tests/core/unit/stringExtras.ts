import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as stringExtras from '../../src/stringExtras';

function createPaddingErrorTests(func: (text: string, length: number, character?: string) => string) {
	// Tests error cases for padStart and padEnd.
	return function () {
		assert.throw(function () {
			func(<any> null, 10);
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

	'.escapeRegExp()'() {
		assert.strictEqual(stringExtras.escapeRegExp(''), '');
		assert.strictEqual(stringExtras.escapeRegExp('[]{}()|/\\^$.*+?'), '\\[\\]\\{\\}\\(\\)\\|\\/\\\\\\^\\$\\.\\*\\+\\?');
	},

	'.escapeXml()'() {
		let html = '<p class="text">Fox & Hound\'s</p>';

		assert.strictEqual(stringExtras.escapeXml(''), '');
		assert.strictEqual(stringExtras.escapeXml(html, false), '&lt;p class="text">Fox &amp; Hound\'s&lt;/p>');
		assert.strictEqual(stringExtras.escapeXml(html), '&lt;p class=&quot;text&quot;&gt;Fox &amp; Hound&#39;s&lt;/p&gt;');
	},

	'.padEnd()': {
		'error cases': createPaddingErrorTests(stringExtras.padEnd),
		'basic tests'() {
			assert.strictEqual(stringExtras.padEnd('Lorem', 10), 'Lorem00000');
			assert.strictEqual(stringExtras.padEnd('Lorem', 10, ' '), 'Lorem     ');
			assert.strictEqual(stringExtras.padEnd('Lorem', 5), 'Lorem');
			assert.strictEqual(stringExtras.padEnd('Lorem', 1), 'Lorem');
		}
	},

	'.padStart()': {
		'error cases': createPaddingErrorTests(stringExtras.padStart),
		'basic tests'() {
			assert.strictEqual(stringExtras.padStart('Lorem', 10), '00000Lorem');
			assert.strictEqual(stringExtras.padStart('Lorem', 10, ' '), '     Lorem');
			assert.strictEqual(stringExtras.padStart('Lorem', 5), 'Lorem');
			assert.strictEqual(stringExtras.padStart('Lorem', 1), 'Lorem');
		}
	}
});
