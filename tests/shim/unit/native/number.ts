import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';

registerSuite({
	name: 'native/number',
	'verify API'() {
		if (!has('es6-math-imul')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/number' ], dfd.callback((num: any) => {
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
