import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from '../../../src/support/has';
import global from '../../../src/global';

registerSuite({
	name: 'native/Set',
	'verify API'(this: any) {
		if (!has('es6-set')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		(<any> require)([ 'src/native/Set' ], dfd.callback((m: any) => {
			/* tslint:disable-next-line:variable-name */
			const Set = m.default;
			const set = new Set();
			assert.instanceOf(set, global.Set);
		}));
	}
});
