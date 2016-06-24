import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';
import global from 'src/support/global';

registerSuite({
	name: 'native/WeakMap',
	'verify API'() {
		if (!has('es6-weakmap')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/WeakMap' ], dfd.callback((m: any) => {
			/* tslint:disable-next-line:variable-name */
			const WeakMap = m.default;
			const weakmap = new WeakMap();
			assert.instanceOf(weakmap, global.WeakMap);
		}));
	}
});
