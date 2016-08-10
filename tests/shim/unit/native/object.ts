import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has, { add as hasAdd } from 'src/support/has';
import global from 'src/support/global';

hasAdd('es6-object', 'getOwnPropertySymbols' in global.Object);

registerSuite({
	name: 'native/object',
	'verify API'(this: any) {
		if (!has('es6-object')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/object' ], dfd.callback((object: any) => {
			[
				'is',
				'getOwnPropertySymbols',
				'getOwnPropertyNames'
			].forEach((method) => assert.isFunction(object[method]));
			assert.strictEqual(Object.keys(object).length, 3);
		}));
	}
});
