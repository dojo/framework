import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as object from 'src/object';
import 'src/Symbol';

registerSuite({
	name: 'object',

	'.is()': {
		'two identical strings'() {
			assert.isTrue(object.is('foo', 'foo'));
		},

		'two different strings'() {
			assert.isFalse(object.is('foo', 'bar'));
		},

		'two NaNs'() {
			assert.isTrue(object.is(NaN, NaN));
		},

		'the same object'() {
			let obj = {};
			assert.isTrue(object.is(obj, obj));
		},

		'two nulls'() {
			assert.isTrue(object.is(null, null));
		},

		'two undefineds'() {
			assert.isTrue(object.is(undefined, undefined));
		},

		'null and undefined'() {
			assert.isFalse(object.is(null, undefined));
		},

		'two arrays'() {
			assert.isFalse(object.is([], []));
		},

		'zero and negative zero'() {
			assert.isFalse(object.is(0, -0));
		},

		'two positive zeros'() {
			assert.isTrue(object.is(0, 0));
		},

		'two negative zeros'() {
			assert.isTrue(object.is(-0, -0));
		},

		'two of the same boolean'() {
			assert.isTrue(object.is(true, true));
		},

		'two different booleans'() {
			assert.isFalse(object.is(true, false));
		},

		'two different Date objects with the same value'() {
			let date = new Date();
			assert.isFalse(object.is(date, new Date(Number(date))));
		}
	},

	'.getOwnPropertySymbols()': {
		'well-known'() {
			const o = {
				[Symbol.iterator]() {
					return 'foo';
				},
				bar() {
					return 'foo';
				}
			};
			const [ sym, ...other ] = object.getOwnPropertySymbols(o);
			assert.strictEqual(sym, Symbol.iterator);
			assert.strictEqual(other.length, 0);
		},
		'Symbol.for'() {
			const foo = Symbol.for('foo');
			const o = {
				[foo]: 'bar',
				bar: 1
			};
			const [ sym, ...other ] = object.getOwnPropertySymbols(o);
			assert.strictEqual(sym, foo);
			assert.strictEqual(other.length, 0);
		}
	},

	'.getOwnPropertyNames()'() {
		const sym = Symbol('foo');
		const o = {
			[Symbol.iterator]() {
				return 'foo';
			},
			[sym]: 'bar',
			bar: 1
		};
		assert.deepEqual(object.getOwnPropertyNames(o), [ 'bar' ]);
	}
});
