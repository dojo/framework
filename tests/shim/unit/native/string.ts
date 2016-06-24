import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';

registerSuite({
	name: 'native/string',
	'verify API'() {
		if (!has('es6-string-raw')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/string' ], dfd.callback((str: any) => {
			[
				'HIGH_SURROGATE_MIN',
				'HIGH_SURROGATE_MAX',
				'LOW_SURROGATE_MIN',
				'LOW_SURROGATE_MAX'
			].forEach((prop: string) => assert.isNumber(str[prop]));

			[
				'raw',
				'fromCodePoint',
				'codePointAt',
				'repeat',
				'startsWith',
				'endsWith',
				'includes'
			].forEach((method: string) => assert.isFunction(str[method]));

			assert.strictEqual(Object.keys(str).length, 11);
		}));
	}
});
