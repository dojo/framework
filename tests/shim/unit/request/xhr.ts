import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/has';
import { default as xhrRequest } from 'src/request/xhr';

function getRequestUrl(dataKey: string): string {
	return (<any> require).toUrl('../../support/data/' + dataKey);
}

registerSuite({
	name: 'request/xhr',

	'HTTP methods': {
		specified(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'), { method: 'get' })
				.then(
					dfd.callback(function (response: any): void {
						assert.strictEqual(response.requestOptions.method, 'get');
					}),
					dfd.reject.bind(dfd)
				);
		},

		'default'(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any): void {
						assert.strictEqual(response.requestOptions.method, 'GET');
					}),
					dfd.reject.bind(dfd)
				);
		}
	},

	'request options': {
		'timeout'(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'), { timeout: 1 })
				.then(
					dfd.resolve.bind(dfd),
					dfd.callback(function (error: Error): void {
						assert.strictEqual(error.name, 'RequestTimeoutError');
					})
				);
		},

		'user and password'(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'), {
				user: 'user',
				password: 'password'
			}).then(
				dfd.callback(function (response: any): void {
					assert.strictEqual(response.requestOptions.user, 'user');
					assert.strictEqual(response.requestOptions.password, 'password');
				}),
				dfd.reject.bind(dfd)
			);
		},

		'auth, without user or password'(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'), {
				auth: 'user:password'
			}).then(
				dfd.callback(function (response: any): void {
					assert.strictEqual(response.requestOptions.user, 'user');
					assert.strictEqual(response.requestOptions.password, 'password');
				}),
				dfd.reject.bind(dfd)
			);
		},

		'headers': {
			'custom headers'() {
				// TODO: Use sinon
				const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
				const headers: { [key: string]: string; } = {};
				XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
					headers[name] = value;
				};
				xhrRequest(getRequestUrl('foo.json'), {
					headers: {
						'X-Requested-With': 'arbitrary-value'
					}
				});
				assert.strictEqual(headers['X-Requested-With'], 'arbitrary-value');
				XMLHttpRequest.prototype.setRequestHeader = setRequestHeader;
			},

			'default headers'() {
				// TODO: Use sinon
				const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
				const headers: { [key: string]: string; } = {};
				const options = has('formdata') ? { data: new FormData() } : {};
				XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
					headers[name] = value;
				};
				xhrRequest(getRequestUrl('foo.json'), options);
				assert.strictEqual(headers['X-Requested-With'], 'XMLHttpRequest');

				if (has('formdata')) {
					assert.strictEqual(headers['Content-Type'], 'application/x-www-form-urlencoded');
				}

				XMLHttpRequest.prototype.setRequestHeader = setRequestHeader;
			}
		}
	},

	'response object': {
		properties(): void {
			const dfd = this.async();
			const url: string = getRequestUrl('foo.json');
			xhrRequest(url)
				.then(
					dfd.callback(function (response: any): void {
						assert.strictEqual(response.statusCode, 200);
						assert.strictEqual(response.statusText, 'OK');
						assert.isTrue(response.nativeResponse instanceof XMLHttpRequest);
						assert.strictEqual(response.url, url);
						assert.deepEqual(response.requestOptions, { method: 'GET' });
					}),
					dfd.reject.bind(dfd)
				);
		},

		'.getHeader'(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any): void {
						const length: number = Number(response.getHeader('content-length'));
						assert.strictEqual(length, response.data.length);
					}),
					dfd.reject.bind(dfd)
				);
		}
	},

	'response types': {
		xml(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.xml'), { responseType: 'xml' })
				.then(
					dfd.callback(function (response: any): void {
						const foo: string = response.data.getElementsByTagName('foo')[0].getAttribute('value');
						assert.strictEqual(foo, 'bar');
					}),
					dfd.reject.bind(dfd)
				);
		},

		'default'(): void {
			const dfd = this.async();
			xhrRequest(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any): void {
						const data: {} = JSON.parse(response.data);
						assert.deepEqual(data, { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
		}
	}
});
