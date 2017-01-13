import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import request from '../../src/request';
import { Require } from '@dojo/interfaces/loader';

declare const require: Require;

const getRequestUrl = function (dataKey: string): string {
	return require.toUrl('../support/data/' + dataKey);
};

registerSuite({
	name: 'request_browser',

	'.get'() {
		return request.get(getRequestUrl('foo.json'))
			.then(function (response: any) {
				assert.deepEqual(JSON.parse(response.data), { foo: 'bar' });
			})
		;
	},

	'JSON responseType filter'() {
		return request.get(getRequestUrl('foo.json'), { responseType: 'json' })
			.then(function (response: any) {
				assert.deepEqual(response.data, { foo: 'bar' });
			})
		;
	}
});
