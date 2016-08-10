import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';

registerSuite({
	name: 'native/main',
	'verify API'(this: any) {
		if (!has('es6-array-from')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/main' ], dfd.callback((main: any) => {
			assert.isObject(main.array);
			assert.isObject(main.iterator);
			assert.isFunction(main.Map);
			assert.isObject(main.math);
			assert.isObject(main.number);
			assert.isObject(main.object);
			assert.isFunction(main.Promise);
			assert.isFunction(main.Set);
			assert.isObject(main.string);
			assert.isFunction(main.Symbol);
			assert.isFunction(main.WeakMap);
			assert.strictEqual(Object.keys(main).length, 11);
		}));
	}
});
