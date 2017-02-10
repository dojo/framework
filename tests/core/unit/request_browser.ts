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
			.then(response => {
				return response.json();
			}).then(json => {
				assert.deepEqual(json, { foo: 'bar' });
			})
		;
	}
});
