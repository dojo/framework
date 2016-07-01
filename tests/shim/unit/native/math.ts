import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';

registerSuite({
	name: 'native/math',
	'verify API'() {
		if (!has('es6-math-acosh')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/math' ], dfd.callback((math: any) => {
			[
				'acosh',
				'asinh',
				'atanh',
				'cbrt',
				'clz32',
				'cosh',
				'expm1',
				'fround',
				'hypot',
				'imul',
				'log2',
				'log10',
				'log1p',
				'sign',
				'sinh',
				'tanh',
				'trunc'
			].forEach((method: string) => assert.isFunction(math[method], `Math "${method}" is not defined`));
			assert.strictEqual(Object.keys(math).length, 17);
		}));
	}
});
