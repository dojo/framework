import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/has';
import Promise from 'src/Promise';
import xhrRequest from 'src/request/xhr';
import { Response } from 'src/request';
import UrlSearchParams from 'src/UrlSearchParams';

function requestResponseType(responseType?: string, options?: any) {
	if (options) {
		return xhrRequest('/__echo/xhr' + (responseType ? '?responseType=' + responseType : ''), options);
	}
	else {
		return xhrRequest('/__echo/xhr' + (responseType ? '?responseType=' + responseType : ''));
	}
}

let echoServerAvailable = false;
registerSuite({
	name: 'request/xhr',

	before: function () {
		return new Promise(function (resolve, reject) {
			xhrRequest('/__echo/', {
				method: 'get',
				timeout: 10000
			}).then(
				function (response) {
					if (response && response.statusCode === 200) {
						echoServerAvailable = true;
					}
					resolve();
				},
				function () {
					resolve();
				}
			);
		});
	},

	'HTTP methods': {
		specified() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json', { method: 'get' })
				.then(function (response: any) {
					assert.strictEqual(response.requestOptions.method, 'get');
				});
		},

		'default'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json')
				.then(function (response: any) {
					assert.strictEqual(response.requestOptions.method, 'GET');
				});
		},

		'.get with URL query'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/xhr?color=blue&numbers=one&numbers=two', {
				responseType: 'json'
			}).then(function (response: any) {
				const query = JSON.parse(response.data).query;
				assert.deepEqual(query, {
					color: 'blue',
					numbers: [ 'one', 'two' ]
				});
				assert.strictEqual(
					response.url,
					'/__echo/xhr?color=blue&numbers=one&numbers=two'
				);
			});
		},

		'.post': function () {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/post', {
				method: 'POST',
				data: new UrlSearchParams({ color: 'blue' }).toString(),
				responseType: 'json'
			}).then(function (response: any) {
				const data = JSON.parse(response.data);
				assert.strictEqual(data.method, 'POST');
				const payload = data.payload;

				assert.ok(payload && payload.color);
				assert.strictEqual(payload.color, 'blue');
			});
		}
	},

	'request options': {
		'"timeout"'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/xhr?delay=5000', { timeout: 10 })
				.then(
					function () {
						assert(false, 'Should have timed out');
					},
					function (error: Error) {
						assert.strictEqual(error.name, 'RequestTimeoutError');
					}
				);
		},

		'user and password'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json', {
				user: 'user',
				password: 'password'
			}).then(function (response: any) {
				assert.strictEqual(response.requestOptions.user, 'user');
				assert.strictEqual(response.requestOptions.password, 'password');
			});
		},

		'auth, without user or password'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json', {
				auth: 'user:password'
			}).then(function (response: any) {
				assert.strictEqual(response.requestOptions.user, 'user');
				assert.strictEqual(response.requestOptions.password, 'password');
			});
		},

		'query': {
			'.get with query URL and query option string'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr?color=blue&numbers=one&numbers=two', {
					query: new UrlSearchParams({
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					}).toString(),
					responseType: 'json'
				}).then(function (response: any) {
					const query = JSON.parse(response.data).query;
					assert.deepEqual(query, {
						color: 'blue',
						numbers: [ 'one', 'two' ],
						thud: 'thonk',
						foo: [ 'bar', 'baz' ],
						xyzzy: '3'
					});
					assert.strictEqual(
						response.url,
						'/__echo/xhr?color=blue&numbers=one&numbers=two&foo=bar&foo=baz&thud=thonk&xyzzy=3'
					);
				});
			},

			'.get with query option string'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr', {
					query: new UrlSearchParams({
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					}).toString(),
					responseType: 'json'
				}).then(function (response: any) {
					const query = JSON.parse(response.data).query;
					assert.deepEqual(query, {
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					});
					assert.strictEqual(
						response.url,
						'/__echo/xhr?foo=bar&foo=baz&thud=thonk&xyzzy=3'
					);
				});
			},

			'.get with query option object'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr', {
					query: {
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					},
					responseType: 'json'
				}).then(function (response: any) {
					const query = JSON.parse(response.data).query;
					assert.deepEqual(query, {
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					});
					assert.strictEqual(
						response.url,
						'/__echo/xhr?foo=bar&foo=baz&thud=thonk&xyzzy=3'
					);
				});
			},

			'.get with cacheBust w/query string w/o/query option'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr?foo=bar', {
					cacheBust: true
				}).then(function (response) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringA = response.url.split('&')[1];
					assert.isFalse(isNaN(Number(cacheBustStringA)));
					return new Promise<Response<any>>(function (resolve, reject) {
						setTimeout(function () {
							xhrRequest('/__echo/xhr?foo=bar', {
								cacheBust: true
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringB = response.url.split('&')[1];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust w/query string w/query option'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr?foo=bar', {
					cacheBust: true,
					query: {
						bar: 'baz'
					}
				}).then(function (response) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar&bar=baz'), 0);
					cacheBustStringA = response.url.split('&')[2];
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return new Promise<Response<any>>(function (resolve, reject) {
						setTimeout(function () {
							xhrRequest('/__echo/xhr?foo=bar', {
								cacheBust: true,
								query: {
									bar: 'baz'
								}
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar&bar=baz'), 0);
					cacheBustStringB = response.url.split('&')[2];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust w/o/query string w/query option'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr', {
					cacheBust: true,
					query: {
						foo: 'bar'
					}
				}).then(function (response) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringA = response.url.split('&')[1];
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return new Promise<Response<any>>(function (resolve, reject) {
						setTimeout(function () {
							xhrRequest('/__echo/xhr', {
								cacheBust: true,
								query: {
									foo: 'bar'
								}
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringB = response.url.split('&')[1];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust and no query'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr', {
					cacheBust: true
				}).then(function (response: any) {
					cacheBustStringA = response.url.split('?')[1];
					assert.ok(cacheBustStringA);
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return xhrRequest('/__echo/xhr', {
						cacheBust: true
					});
				}).then(function (response: any) {
					cacheBustStringB = response.url.split('?')[1];
					assert.ok(cacheBustStringB);
					assert.isFalse(isNaN(Number(cacheBustStringB)));
					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			}
		},

		'headers': {
			'normalize header names'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/normalize', {
					headers: {
						'CONTENT-TYPE': 'arbitrary-value'
					}
				}).then(function (response: any) {
					const data = JSON.parse(response.data);
					assert.isUndefined(data.headers['CONTENT-TYPE']);
					assert.propertyVal(data.headers, 'content-type', 'arbitrary-value');
				});
			},

			'custom headers'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/custom', {
					headers: {
						'Content-Type': 'application/arbitrary-value'
					}
				}).then(function (response: any) {
					const data = JSON.parse(response.data);
					assert.propertyVal(data.headers, 'content-type', 'application/arbitrary-value');
				});
			},

			'default headers'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				const options = has('formdata') ? { data: new FormData() } : {};
				return xhrRequest('/__echo/default', options).then(function (response: any) {
					const data = JSON.parse(response.data);
					assert.strictEqual(data.headers['x-requested-with'], 'XMLHttpRequest');
					if (has('formdata')) {
						assert.include(data.headers['content-type'], 'application/x-www-form-urlencoded');
					}
				});
			}
		},

		'responseType': {
			'xml'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return requestResponseType('xml', { responseType: 'xml' }).then(function (response: any) {
					const foo: string = response.data.getElementsByTagName('foo')[0].getAttribute('value');
					assert.strictEqual(foo, 'bar');
				});
			},

			'blob'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				if (!has('xhr2-blob')) {
					this.skip('Blob doesn\'t exist in this environment');
				}
				return requestResponseType('gif', { responseType: 'blob' }).then(function (response: any) {
					assert.instanceOf(response.data, Blob);
				});
			},

			'arrayBuffer'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				if (!has('arraybuffer')) {
					this.skip('ArrayBuffer doesn\'t exist in this environment');
				}
				return requestResponseType('gif', { responseType: 'arraybuffer' }).then(function (response: any) {
					assert.instanceOf(response.data, ArrayBuffer);
				});
			}
		}
	},

	'response object': {
		properties() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json').then(function (response: any) {
				assert.strictEqual(response.statusCode, 200);
				assert.strictEqual(response.statusText, 'OK');
				assert.isTrue(response.nativeResponse instanceof XMLHttpRequest);
				assert.strictEqual(response.url, '/__echo/foo.json');
				assert.deepEqual(response.requestOptions, { method: 'GET' });
			});
		},

		'.getHeader'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json').then(function (response: any) {
				const length: number = Number(response.getHeader('content-length'));
				assert.strictEqual(length, response.data.length);
			});
		}
	}
});
