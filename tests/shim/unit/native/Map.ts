import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';
import global from 'src/support/global';

registerSuite({
	name: 'native/Map',
	'verify API'() {
		if (!has('es6-map')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/Map' ], dfd.callback((m: any) => {
			/* tslint:disable-next-line:variable-name */
			const Map = m.default;
			const map = new Map;
			assert.instanceOf(map, global.Map);
		}));
	}
});
