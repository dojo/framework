const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import AbortController from '../../../../src/shim/AbortController';
import xhrRequest, { XhrResponse } from '../../../../src/core/request/providers/xhr';
import { Response } from '../../../../src/core/request/interfaces';
import UrlSearchParams from '../../../../src/core/UrlSearchParams';
import has from '../../../../src/has/has';
import DojoPromise from '../../../../src/shim/Promise';

let echoServerAvailable = false;

registerSuite('request/providers/xhr', {
	async before(this: any) {
		const coreHasId = '../../../../src/core/has';
		if (typeof (require as any).undef === 'undefined') {
			const path = require('path');
			delete require.cache[path.resolve(__dirname, coreHasId) + '.js'];
		} else {
			(require as any).undef((require as any).toAbsMid(coreHasId));
		}

		await import(coreHasId);

		const response = await xhrRequest('/__echo/', {
			method: 'GET',
			timeout: 10000
		});

		if (response && response.status === 200) {
			echoServerAvailable = true;
		}
	},

	tests: {
		'HTTP methods': {
			specified(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/foo.json', { method: 'get' }).then(function(response: any) {
					assert.strictEqual(response.requestOptions.method, 'get');
				});
			},

			default(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/foo.json').then(function(response: any) {
					assert.strictEqual(response.requestOptions.method, 'GET');
				});
			},

			'.get with URL query'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr?color=blue&numbers=one&numbers=two').then(function(response: any) {
					return response.json().then((data: any) => {
						const query = data.query;
						assert.deepEqual(query, {
							color: 'blue',
							numbers: ['one', 'two']
						});
						assert.strictEqual(response.url, '/__echo/xhr?color=blue&numbers=one&numbers=two');
					});
				});
			},

			'.post': function(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/post', {
					method: 'POST',
					body: new UrlSearchParams({ color: 'blue' }).toString(),
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}).then(function(response: any) {
					return response.json().then((data: any) => {
						assert.strictEqual(data.method, 'POST');
						const payload = data.payload;

						assert.ok(payload && payload.color);
						assert.strictEqual(payload.color, 'blue');
					});
				});
			}
		},

		'request options': {
			'"timeout"'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr?delay=5000', { timeout: 10 }).then(
					function() {
						assert(false, 'Should have timed out');
					},
					function(error: Error) {
						assert.strictEqual(error.name, 'TimeoutError');
					}
				);
			},

			'"signal"'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				const dfd = this.async();
				const controller = new AbortController();
				const { signal } = controller;
				const request = xhrRequest('/__echo/foo.json?delay=10000', { signal });
				request.then(
					() => dfd.rejectOnError(() => assert.fail('Request should have been aborted')),
					dfd.callback((error: Error) => {
						assert.strictEqual(error.name, 'AbortError');
					})
				);

				controller.abort();
			},

			'user and password'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/foo.json', {
					user: 'user',
					password: 'password'
				}).then(function(response: any) {
					assert.strictEqual(response.requestOptions.user, 'user');
					assert.strictEqual(response.requestOptions.password, 'password');
				});
			},

			async credentials(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				const makeRequest = async (credentials: 'include' | 'omit' | 'same-origin') =>
					await xhrRequest('/__echo/foo.json', { credentials });

				assert.isTrue((await makeRequest('include')).nativeResponse.withCredentials);
				assert.isFalse((await makeRequest('omit')).nativeResponse.withCredentials);
				assert.isFalse((await makeRequest('same-origin')).nativeResponse.withCredentials);
			},

			'upload monitoring'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				let events: any[] = [];

				const req = xhrRequest('/__echo/post', {
					method: 'POST',
					body: '12345'
				});

				req.upload.subscribe((totalBytesUploaded) => {
					events.push(totalBytesUploaded);
				});

				return req.then((res) => {
					assert.isTrue(events.length > 0, 'was expecting at least one monitor event');
					assert.equal(events[events.length - 1].loaded, 5);
					assert.equal(events[events.length - 1].total, 5);
					assert.equal(events[events.length - 1].lengthComputable, true);
				});
			},

			'includeUploadProgress=false'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				const req = xhrRequest('/__echo/post', {
					method: 'POST',
					body: '12345',
					includeUploadProgress: false
				});

				assert.isUndefined(req.upload);
			},

			query: {
				'.get with query URL and query option string'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					return xhrRequest('/__echo/xhr?color=blue&numbers=one&numbers=two', {
						query: new UrlSearchParams({
							foo: ['bar', 'baz'],
							thud: 'thonk',
							xyzzy: '3'
						}).toString()
					}).then(function(response: any) {
						return response.json().then((data: any) => {
							const query = data.query;
							assert.deepEqual(query, {
								color: 'blue',
								numbers: ['one', 'two'],
								thud: 'thonk',
								foo: ['bar', 'baz'],
								xyzzy: '3'
							});
							assert.strictEqual(
								response.url,
								'/__echo/xhr?color=blue&numbers=one&numbers=two&foo=bar&foo=baz&thud=thonk&xyzzy=3'
							);
						});
					});
				},

				'.get with query option string'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					return xhrRequest('/__echo/xhr', {
						query: new UrlSearchParams({
							foo: ['bar', 'baz'],
							thud: 'thonk',
							xyzzy: '3'
						}).toString()
					}).then(function(response: any) {
						return response.json().then((data: any) => {
							const query = data.query;
							assert.deepEqual(query, {
								foo: ['bar', 'baz'],
								thud: 'thonk',
								xyzzy: '3'
							});
							assert.strictEqual(response.url, '/__echo/xhr?foo=bar&foo=baz&thud=thonk&xyzzy=3');
						});
					});
				},

				'.get with query option object'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					return xhrRequest('/__echo/xhr', {
						query: {
							foo: ['bar', 'baz'],
							thud: 'thonk',
							xyzzy: '3'
						}
					}).then(function(response: any) {
						return response.json().then((data: any) => {
							const query = data.query;
							assert.deepEqual(query, {
								foo: ['bar', 'baz'],
								thud: 'thonk',
								xyzzy: '3'
							});
							assert.strictEqual(response.url, '/__echo/xhr?foo=bar&foo=baz&thud=thonk&xyzzy=3');
						});
					});
				},

				'.get with cacheBust w/query string w/o/query option'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					let cacheBustStringA: string;
					let cacheBustStringB: string;
					return xhrRequest('/__echo/xhr?foo=bar', {
						cacheBust: true
					})
						.then(function(response: any) {
							assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
							cacheBustStringA = response.url.split('&')[1];
							assert.isFalse(isNaN(Number(cacheBustStringA)));
							return new DojoPromise<Response>(function(resolve, reject) {
								setTimeout(function() {
									xhrRequest('/__echo/xhr?foo=bar', {
										cacheBust: true
									}).then(resolve, reject);
								}, 5);
							});
						})
						.then(function(response: any) {
							assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
							cacheBustStringB = response.url.split('&')[1];
							assert.isFalse(isNaN(Number(cacheBustStringB)));

							assert.notEqual(cacheBustStringA, cacheBustStringB);
						});
				},

				'.get with cacheBust w/query string w/query option'(this: any) {
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
					})
						.then(function(response: any) {
							assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar&bar=baz'), 0);
							cacheBustStringA = response.url.split('&')[2];
							assert.isFalse(isNaN(Number(cacheBustStringA)));

							return new DojoPromise<Response>(function(resolve, reject) {
								setTimeout(function() {
									xhrRequest('/__echo/xhr?foo=bar', {
										cacheBust: true,
										query: {
											bar: 'baz'
										}
									}).then(resolve, reject);
								}, 5);
							});
						})
						.then(function(response: any) {
							assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar&bar=baz'), 0);
							cacheBustStringB = response.url.split('&')[2];
							assert.isFalse(isNaN(Number(cacheBustStringB)));

							assert.notEqual(cacheBustStringA, cacheBustStringB);
						});
				},

				'.get with cacheBust w/o/query string w/query option'(this: any) {
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
					})
						.then(function(response: any) {
							assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
							cacheBustStringA = response.url.split('&')[1];
							assert.isFalse(isNaN(Number(cacheBustStringA)));

							return new DojoPromise<Response>(function(resolve, reject) {
								setTimeout(function() {
									xhrRequest('/__echo/xhr', {
										cacheBust: true,
										query: {
											foo: 'bar'
										}
									}).then(resolve, reject);
								}, 5);
							});
						})
						.then(function(response: any) {
							assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
							cacheBustStringB = response.url.split('&')[1];
							assert.isFalse(isNaN(Number(cacheBustStringB)));

							assert.notEqual(cacheBustStringA, cacheBustStringB);
						});
				},

				'.get with cacheBust and no query'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					let cacheBustStringA: string;
					let cacheBustStringB: string;
					return xhrRequest('/__echo/xhr', {
						cacheBust: true
					})
						.then(function(response: any) {
							cacheBustStringA = response.url.split('?')[1];
							assert.ok(cacheBustStringA);
							assert.isFalse(isNaN(Number(cacheBustStringA)));

							return xhrRequest('/__echo/xhr', {
								cacheBust: true
							});
						})
						.then(function(response: any) {
							cacheBustStringB = response.url.split('?')[1];
							assert.ok(cacheBustStringB);
							assert.isFalse(isNaN(Number(cacheBustStringB)));
							assert.notEqual(cacheBustStringA, cacheBustStringB);
						});
				}
			},

			headers: {
				'normalize header names'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					return xhrRequest('/__echo/normalize', {
						headers: {
							'CONTENT-TYPE': 'arbitrary-value',
							'X-REQUESTED-WITH': 'test'
						}
					}).then(function(response: any) {
						return response.json().then((data: any) => {
							assert.isUndefined(data.headers['CONTENT-TYPE']);
							assert.propertyVal(data.headers, 'content-type', 'arbitrary-value');

							assert.isUndefined(data.headers['X-REQUESTED-WITH']);
							assert.propertyVal(data.headers, 'x-requested-with', 'test');
						});
					});
				},

				'custom headers'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					return xhrRequest('/__echo/custom', {
						headers: {
							'Content-Type': 'application/arbitrary-value'
						}
					})
						.then(function(response: any) {
							return response.json().then((data: any) => {
								assert.propertyVal(data.headers, 'content-type', 'application/arbitrary-value');

								return xhrRequest('/__echo/custom', {
									headers: {
										Range: 'bytes=0-1024'
									}
								});
							});
						})
						.then((response: any) => {
							return response.json().then((data: any) => {
								assert.isDefined(data.headers, 'range');
							});
						});
				},

				'default headers'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					const options = has('formdata') ? { body: new FormData() } : {};
					return xhrRequest('/__echo/default', options).then(function(response: any) {
						return response.json().then((data: any) => {
							assert.strictEqual(data.headers['x-requested-with'], 'XMLHttpRequest');
							if (has('formdata')) {
								assert.include(data.headers['content-type'], 'application/x-www-form-urlencoded');
							}
						});
					});
				},

				'X-Requested-With headers can be disabled'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}
					const options = { includeRequestedWithHeader: false };
					return xhrRequest('/__echo/default?norequestedwith', options).then(function(response: any) {
						return response.json().then((data: any) => {
							assert.isUndefined(data.headers['x-requested-with']);
						});
					});
				}
			}
		},

		'response object': {
			properties(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/foo.json').then(function(response: XhrResponse) {
					assert.strictEqual(response.status, 200);
					assert.strictEqual(response.statusText, 'OK');
					assert.isTrue(response.nativeResponse instanceof XMLHttpRequest);
					assert.strictEqual(response.url, '/__echo/foo.json');
					assert.deepEqual(response.requestOptions, { method: 'GET' });
				});
			},

			'.header'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/foo.json').then(function(response: any) {
					return response.text().then((data: any) => {
						const length: number = Number(response.headers.get('content-length'));
						assert.strictEqual(length, data.length);
					});
				});
			},

			'body cannot be used twice'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				return xhrRequest('/__echo/foo.json').then((response: any) => {
					assert.isFalse(response.bodyUsed);

					return response.text().then(() => {
						assert.isTrue(response.bodyUsed);

						return response.text().then(
							() => {
								throw new Error('should not have succeeded');
							},
							() => {
								return 'success';
							}
						);
					});
				});
			},

			'response types': {
				arrayBuffer(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}

					if (!has('blob') || !has('arraybuffer')) {
						this.skip('ArrayBuffer not available');
					}

					return xhrRequest('/__echo/foo.json').then((response: any) => {
						return response.arrayBuffer().then((arrayBuffer: any) => {
							assert.isTrue(arrayBuffer instanceof ArrayBuffer);
						});
					});
				},

				blob(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}

					if (!has('blob')) {
						this.skip('Blob not available');
					}

					return xhrRequest('/__echo/foo.json').then((response: any) => {
						return response.blob().then((blob: any) => {
							assert.isTrue(blob instanceof Blob);
						});
					});
				},

				formData(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}

					if (!has('formdata')) {
						this.skip('FormData is not available');
					}

					return xhrRequest('/__echo/foo.json').then((response: any) => {
						return response.formData().then((formData: any) => {
							assert.isTrue(formData instanceof FormData);
						});
					});
				},

				xml(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}

					return xhrRequest('/__echo/xhr?responseType=xml').then((response: any) => {
						return response.xml().then((xml: any) => {
							assert.isTrue(xml instanceof Document);
						});
					});
				}
			},

			'response progress': {
				'data event'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}

					let timesCalled = 0;

					return xhrRequest('/__echo/foo.json').then((response) => {
						response.data.subscribe((chunk) => {
							assert.isNotNull(chunk);
							timesCalled++;
						});

						return response.text().then(() => {
							assert.equal(timesCalled, 1);
						});
					});
				},

				'download event'(this: any) {
					if (!echoServerAvailable) {
						this.skip('No echo server available');
					}

					let downloadEvents: number[] = [];

					return xhrRequest('/__echo/foo.json').then((response) => {
						response.download.subscribe((totalBytesDownloaded) => {
							downloadEvents.push(totalBytesDownloaded);
						});

						return response.text().then(() => {
							assert.isTrue(downloadEvents.length > 0);
						});
					});
				}
			}
		},

		'Web Workers': {
			'from blob'(this: any) {
				if (!has('web-worker-xhr-upload')) {
					this.skip('No web worker upload support');
				}

				const baseUrl = location.origin;
				const testUrl = baseUrl + '/__echo/foo.json';
				const srcUrl = baseUrl + (require as any).toUrl('src');
				const nodeModulesUrl = baseUrl + (require as any).toUrl('node_modules');

				const dfd = this.async();

				const blob = new Blob(
					[
						`(function() {
self.addEventListener('message', function (event) {
	testXhr(event.data);
});

function testXhr(data) {
	var nodeModulesUrl = data.nodeModulesUrl;
	var srcUrl = data.srcUrl;
	var testUrl = data.testUrl;

	importScripts(nodeModulesUrl + '/@dojo/loader/loader.js', srcUrl + '/shim/util/amd.js');

	require.config(shimAmdDependencies({
		baseUrl: nodeModulesUrl + '/..'
	}));

	require(['dist/dev/src/shim/main', 'dist/dev/src/core/request/providers/xhr'], function (_, xhr) {
		xhr.default(testUrl).then(function (response) {
			return response.json();
		}).then(function (json) {
			self.postMessage({ status: 'success' });
		}).catch(function (e) {
			self.postMessage({ status: 'error', message: e.message });
		});
	});
}
				})()`
					],
					{ type: 'application/javascript' }
				);
				const worker = new Worker(URL.createObjectURL(blob));
				worker.addEventListener('error', (error) => {
					dfd.reject(error.message);
				});
				worker.addEventListener('message', ({ data: result }) => {
					const { status } = result;

					if (status === 'success') {
						dfd.resolve();
					} else if (status === 'error') {
						dfd.reject(result.message);
					}
				});

				worker.postMessage({
					nodeModulesUrl,
					srcUrl,
					testUrl
				});
			}
		}
	}
});
