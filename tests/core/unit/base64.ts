import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as base64 from '../../src/base64';

registerSuite({
	name: 'support/base64',

	'encode()': {
		'normal string'() {
			assert.strictEqual(base64.encode('foo bar baz'), 'Zm9vIGJhciBiYXo=', 'should have encoded properly');
		},

		'utf8 string'() {
			assert.strictEqual(base64.encode('💩😱🦄'), '8J+SqfCfmLHwn6aE', 'should have encoded properly');
		}
	},

	'decode()': {
		'normal string'() {
			assert.strictEqual(base64.decode('Zm9vIGJhciBiYXo='), 'foo bar baz', 'should have decoded properly');
		},

		'utf8 string'() {
			assert.strictEqual(base64.decode('8J+SqfCfmLHwn6aE'), '💩😱🦄', 'should have decoded properly');
		}
	}
});
