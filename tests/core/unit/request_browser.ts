const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import request from '../../../src/core/request';
import { AmdRequire } from '../../../src/core/interfaces';

declare const require: AmdRequire;

const getRequestUrl = function(dataKey: string): string {
	return require.toUrl('../support/data/' + dataKey);
};

registerSuite('request_browser', {
	'.get'() {
		return request
			.get(getRequestUrl('foo.json'))
			.then((response) => {
				return response.json();
			})
			.then((json) => {
				assert.deepEqual(json, { foo: 'bar' });
			});
	}
});
