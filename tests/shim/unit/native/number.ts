import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has, { add as hasAdd } from '../../../src/support/has';
import global from '../../../src/global';

hasAdd('es6-number', 'EPSILON' in global.Number);

registerSuite({
	name: 'native/number',
	'verify API'(this: any) {
		if (!has('es6-number')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		(<any> require)([ 'src/native/number' ], dfd.callback((num: any) => {
			[
				'EPSILON',
				'MAX_SAFE_INTEGER',
				'MIN_SAFE_INTEGER'
			].forEach((value) => assert.isNumber(num[value]));
			[
				'isNaN',
				'isFinite',
				'isInteger',
				'isSafeInteger'
			].forEach((method) => assert.isFunction(num[method], `'${method}' should be a function`));
			assert.strictEqual(Object.keys(num).length, 7);
		}));
	}
});
