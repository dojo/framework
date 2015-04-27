import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import {padStart, padEnd} from 'dist/string';

registerSuite({
	name: 'string functions',

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
