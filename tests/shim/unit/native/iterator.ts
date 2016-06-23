import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has, { add as hasAdd } from 'src/support/has';
import global from 'src/support/global';

hasAdd('es6-iterator', Boolean(global.Symbol && global.Symbol.iterator && global.Array.prototype[Symbol.iterator]));

registerSuite({
	name: 'native/iterator',
	'verify API'() {
		if (!has('es6-iterator')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/iterator' ], dfd.callback(function (iterator: any) {
			assert.isFunction(iterator.isIterable);
			assert.isFunction(iterator.isArrayLike);
			assert.isFunction(iterator.get);
			assert.isFunction(iterator.forOf);
			assert.strictEqual(Object.keys(iterator).length, 4);
			assert.isFunction(iterator.get([ 1, 2, 3 ]).next);
			assert.isFunction(iterator.get('foo').next);
			assert.isUndefined(iterator.get(1));

			const results: any[] = [];
			iterator.forOf([ 1, 2, 3, 4 ], (item: number, source: number[], doBreak: () => void) => {
				results.push(item);
				if (results.length === 3) {
					doBreak();
				}
			});
			assert.deepEqual(results, [ 1, 2, 3 ]);
			assert.throws(() => {
				iterator.forOf(true);
			}, TypeError);

			assert.isTrue(iterator.isArrayLike(arguments));
			assert.isFalse(iterator.isArrayLike(false));
		}));
	}
});
