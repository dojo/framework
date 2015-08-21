import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import UrlSearchParams from 'src/UrlSearchParams';

registerSuite({
	name: 'UrlSearchParams',

	construct: (function () {
		function checkParams(params: UrlSearchParams) {
			assert.deepEqual(params.getAll('foo'), [ 'bar', 'baz' ]);
			assert.deepEqual(params.getAll('bar'), [ 'foo' ]);
			assert.deepEqual(params.getAll('baz'), [ '' ]);
		}

		return {
			empty() {
				// Empty UrlSearchParams should have no properties
				const params = new UrlSearchParams();
				assert.isNull(params.get('foo'));
			},

			// Next three tests should generate 'params' objects with same contents

			object() {
				const params = new UrlSearchParams({ foo: [ 'bar', 'baz' ], bar: 'foo', baz: null });
				checkParams(params);
			},

			string() {
				let params = new UrlSearchParams('foo=bar&foo=baz&bar=foo&baz');
				checkParams(params);

				// Equals signs after the first will be included in the value
				params = new UrlSearchParams('foo=bar=baz');
				assert.deepEqual(params.getAll('foo'), [ 'bar=baz' ]);

				// Handle empty keys
				params = new UrlSearchParams('=foo&');
				assert.deepEqual(params.getAll(''), [ 'foo', '' ]);
			},

			UrlSearchParams() {
				const params1 = new UrlSearchParams({ foo: [ 'bar', 'baz' ], bar: 'foo', baz: null });
				const params = new UrlSearchParams(params1);
				checkParams(params);
			}
		};
	})(),

	'#append': {
		'new key'() {
			// Appending with a new key is the same as 'set'
			const params = new UrlSearchParams();
			params.append('foo', 'bar');
			assert.deepEqual(params.getAll('foo'), [ 'bar' ]);
		},

		'existing key'() {
			const params = new UrlSearchParams({ foo: 'bar' });
			params.append('foo', 'baz');
			assert.deepEqual(params.getAll('foo'), [ 'bar', 'baz' ]);
		}
	},

	'#delete'() {
		const params = new UrlSearchParams({ foo: 'bar' });
		params.delete('foo');
		assert.isNull(params.get('foo'));
	},

	'#get'() {
		// Get should always return the first entry for a key
		const params1 = new UrlSearchParams({ foo: [ 'bar', 'baz' ] });
		const params2 = new UrlSearchParams({ foo: [ 'baz', 'bar' ] });
		assert.strictEqual(params1.get('foo'), 'bar');
		assert.strictEqual(params2.get('foo'), 'baz');
		assert.isNull(params2.get('bar'));
	},

	'#getAll'() {
		const params = new UrlSearchParams({ foo: [ 'bar', 'baz' ] });
		assert.deepEqual(params.getAll('foo'), [ 'bar', 'baz' ]);
		assert.isNull(params.getAll('bar'));
	},

	'#has'() {
		const params = new UrlSearchParams({ foo: 'bar', bar: undefined, baz: [] });
		assert.isTrue(params.has('foo'), 'expected string property to be present');
		assert.isTrue(params.has('bar'), 'expected undefined property to be present');
		assert.isTrue(params.has('baz'), 'expected empty array property to be present');
		assert.isFalse(params.has('qux'), 'expected unassigned property to be false');
	},

	'#keys'() {
		const params = new UrlSearchParams({ foo: 'bar', bar: undefined, baz: [] });
		assert.deepEqual(params.keys(), [ 'foo', 'bar', 'baz' ]);
		params.delete('foo');
		assert.deepEqual(params.keys(), [ 'bar', 'baz' ]);

		// Re-add to test consistent ordering across all platforms
		params.append('foo', 'bar');
		assert.deepEqual(params.keys(), [ 'foo', 'bar', 'baz' ]);
	},

	'#set'() {
		const params = new UrlSearchParams({ foo: 'bar' });
		params.set('foo', 'baz');
		assert.deepEqual(params.getAll('foo'), [ 'baz' ]);
		params.set('foo', 'qux');
		assert.deepEqual(params.getAll('foo'), [ 'qux' ]);
		params.set('bar', 'foo');
		assert.deepEqual(params.getAll('foo'), [ 'qux' ]);
		assert.deepEqual(params.getAll('bar'), [ 'foo' ]);
	},

	'#toString'() {
		let params = new UrlSearchParams({ foo: [ 'bar', 'baz' ], bar: 'foo' });
		assert.strictEqual(params.toString(), 'foo=bar&foo=baz&bar=foo');

		params = new UrlSearchParams({ foo: 'bar', baz: null });
		assert.strictEqual(params.toString(), 'foo=bar&baz');

		params = new UrlSearchParams({ foo: 'bar', bar: null, baz: null });
		assert.strictEqual(params.toString(), 'foo=bar&bar&baz');

		params = new UrlSearchParams({ foo: 'bar', bar: undefined, baz: [] });
		assert.strictEqual(params.toString(), 'foo=bar&bar&baz');
		params.delete('foo');
		assert.strictEqual(params.toString(), 'bar&baz');

		params = new UrlSearchParams({ foo: [ null ] });
		assert.strictEqual(params.toString(), 'foo');
	},

	'list not enumerable'() {
		const params = new UrlSearchParams();
		for (let key in params) {
			assert.notEqual(key, 'list');
		}
	},

	'no data sharing'() {
		const params1 = new UrlSearchParams({ foo: [ 'bar', 'baz' ], bar: 'foo' });
		const params2 = new UrlSearchParams(params1);

		assert.deepEqual(params1.getAll('foo'), params2.getAll('foo'));
		assert.deepEqual(params1.getAll('bar'), params2.getAll('bar'));

		params1.append('foo', 'qux');
		assert.strictEqual(params1.get('foo'), params2.get('foo'));
		assert.notDeepEqual(params1.getAll('foo'), params2.getAll('foo'));

		params1.set('bar', 'qux');
		assert.notEqual(params1.get('bar'), params2.get('bar'));
	}
});
