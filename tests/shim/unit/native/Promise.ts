import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from '../../../src/support/has';
import global from '../../../src/global';

registerSuite({
	name: 'native/Promise',
	'verify API'(this: any) {
		if (!has('es6-promise')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		(<any> require)([ 'src/native/Promise' ], dfd.callback((m: any) => {
			/* tslint:disable-next-line:variable-name */
			const Promise = m.default;
			const promise = new Promise((resolve: () => void) => {
				resolve();
			});
			assert.instanceOf(promise, global.Promise);
		}));
	}
});
