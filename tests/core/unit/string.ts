import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import {escapeRegExp, escapeXml, padStart, padEnd} from 'src/string';

registerSuite({
	name: 'string functions',

	'.escapeRegExp()': function () {
		assert.equal(escapeRegExp('[]{}()|\\^$.*+?'), '\\[\\]\\{\\}\\(\\)\\|\\\\\\^\\$\\.\\*\\+\\?');
	},

	'.escapeXml()': function () {
		var html: string = '<p class="text">Fox & Hound\'s</p>';

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
	}
});
