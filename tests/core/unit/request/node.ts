import * as fs from 'fs';
import { createServer } from 'http';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { parse } from 'url';
import * as zlib from 'zlib';
import { Response } from '../../../../src/core/request/interfaces';
import { default as nodeRequest, NodeResponse } from '../../../../src/core/request/providers/node';
import TimeoutError from '../../../../src/core/request/TimeoutError';

const serverPort = 8124;
const serverUrl = 'http://localhost:' + serverPort;
let server: any;
let proxy: any;
let requestData: string;

const blobFileSize = fs.statSync('tests/core/support/data/blob.gif').size;

interface DummyResponse {
	body?: string | ((callback: Function) => void);
	headers?: { [key: string]: string };
	statusCode?: number;
}

interface RedirectTestData {
	title?: string;
	method?: string;
	url: string;
	expectedPage?: string;
	expectedCount?: number;
	expectedMethod?: string;
	expectedData?: any;
	expectedToError?: boolean;
	followRedirects?: boolean;
	callback?: (_: any) => void;
	keepOriginalMethod?: boolean;
}

const responseData: { [url: string]: DummyResponse } = {
	'foo.json': {
		body: JSON.stringify({ foo: 'bar' })
	},
	cookies: {
		body: JSON.stringify({ foo: 'bar' }),
		headers: {
			'Set-cookie': 'one'
		}
	},
	invalidJson: {
		body: '<not>JSON</not>'
	},
	'redirect-success': {
		body: JSON.stringify({ success: true })
	},
	'300-redirect': {
		statusCode: 300,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'301-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'302-redirect': {
		statusCode: 302,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'303-redirect': {
		statusCode: 303,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'304-redirect': {
		statusCode: 304,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'305-redirect': {
		statusCode: 305,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: 'http://localhost:1337'
		}
	},
	'305-redirect-broken': {
		statusCode: 305,
		body: JSON.stringify('beginning to redirect')
	},
	'306-redirect': {
		statusCode: 306,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'307-redirect': {
		statusCode: 307,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('redirect-success')
		}
	},
	'infinite-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			Location: getRequestUrl('infinite-redirect')
		}
	},
	'broken-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning to redirect'),
		headers: {}
	},
	'relative-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning redirect'),
		headers: {
			Location: '/redirect-success'
		}
	},
	'protocolless-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning redirect'),
		headers: {
			Location: getRequestUrl('redirect-success').replace('http:', '')
		}
	},
	'gzip-compressed': {
		statusCode: 200,
		body: function(callback: any) {
			zlib.gzip(new Buffer(JSON.stringify({ test: true }), 'utf8'), function(err: any, result: any) {
				callback(result);
			});
		},
		headers: {
			'Content-Encoding': 'gzip'
		}
	},
	'deflate-compressed': {
		statusCode: 200,
		body: function(callback: any) {
			zlib.deflate(new Buffer(JSON.stringify({ test: true }), 'utf8'), function(err: any, result: any) {
				callback(result);
			});
		},
		headers: {
			'Content-Encoding': 'deflate'
		}
	},
	'gzip-deflate-compressed': {
		statusCode: 200,
		body: function(callback: any) {
			zlib.gzip(new Buffer(JSON.stringify({ test: true }), 'utf8'), (err: any, result: any) => {
				zlib.deflate(result, function(err: any, result: any) {
					callback(result);
				});
			});
		},
		headers: {
			'Content-Encoding': 'gzip, deflate'
		}
	},
	'gzip-invalid': {
		statusCode: 200,
		body: 'hello',
		headers: {
			'Content-Encoding': 'gzip'
		}
	},
	'deflate-invalid': {
		statusCode: 200,
		body: 'hello',
		headers: {
			'Content-Encoding': 'deflate'
		}
	},
	'gzip-deflate-invalid': {
		statusCode: 200,
		body: 'hello',
		headers: {
			'Content-Encoding': 'gzip, deflate'
		}
	},
	'blob.gif': {
		statusCode: 200,
		body: function(callback: any) {
			callback(fs.readFileSync('tests/core/support/data/blob.gif'));
		}
	}
};

function buildRedirectTests(methods: RedirectTestData[]) {
	let tests: { [key: string]: () => void } = {};

	methods.forEach((details) => {
		const method = details.method;
		const { keepOriginalMethod = false } = details;
		const url = getRequestUrl(details.url);
		const expectedMethod = details.expectedMethod || method;
		const expectedPage = details.expectedPage ? getRequestUrl(details.expectedPage) : url;
		const followRedirects = details.followRedirects === undefined ? true : details.followRedirects;

		let title = details.title || method + ' ' + (keepOriginalMethod ? 'w/' : 'w/o') + ' keepOriginalMethod';

		tests[title] = () => {
			let error: any = null;

			return nodeRequest(getRequestUrl(details.url), {
				method: method,
				followRedirects: followRedirects,
				redirectOptions: {
					keepOriginalMethod
				}
			})
				.then((response?: Response) => {
					if (response) {
						return response.text().then((text: string) => {
							if (details.callback) {
								details.callback(response);
							}

							(assert as any).nestedPropertyVal(response, 'requestOptions.method', expectedMethod);
							assert.equal(response.url, expectedPage);

							if (details.expectedCount !== undefined) {
								const {
									redirectOptions: { count: redirectCount = 0 } = {}
								} = (<NodeResponse>response).requestOptions;

								assert.equal(redirectCount, details.expectedCount);
							}

							if (details.expectedData !== undefined) {
								if (text === null) {
									assert.isNull(details.expectedData);
								} else {
									let data = JSON.parse(text);
									assert.deepEqual(data, details.expectedData);
								}
							}
						});
					}
				})
				.catch((e: Error) => {
					error = e;
				})
				.finally(() => {
					if (details.expectedToError) {
						assert.isNotNull(error, 'Expected an error to occur but none did');
					} else if (error) {
						throw error;
					}
				});
		};
	});

	return tests;
}

function getResponseData(request: any): DummyResponse {
	const urlInfo = parse(request.url, true);

	if (urlInfo.query.dataKey === 'echo') {
		return {
			body: JSON.stringify({
				headers: request.headers
			})
		};
	}

	return responseData[urlInfo.query.dataKey as string] || {};
}

function getRequestUrl(dataKey: string): string {
	return serverUrl + '/?dataKey=' + dataKey;
}

function getAuthRequestUrl(dataKey: string, user: string = 'user', password: string = 'password'): string {
	const requestUrl = getRequestUrl(dataKey);
	return requestUrl.slice(0, 7) + user + ':' + password + '@' + requestUrl.slice(7);
}

function assertBasicAuthentication(options: { user?: string; password?: string }, expectedAuth: string, dfd: any) {
	nodeRequest(getRequestUrl('foo.json'), options).then(
		dfd.callback(function(response: any) {
			const actual: string = response.nativeResponse.req._headers.authorization;
			const expected = `Basic ${new Buffer(expectedAuth).toString('base64')}`;

			assert.strictEqual(actual, expected);
		}),
		dfd.reject.bind(dfd)
	);
}

registerSuite('request/node', {
	before(this: any) {
		const dfd = this.async();

		server = createServer(function(request, response) {
			const { statusCode = 200, headers = {}, body = '{}' } = getResponseData(request);

			const data: string[] = [];
			request.on('data', function(chunk: any) {
				data.push(chunk.toString('utf8'));
			});

			request.on('end', function() {
				requestData = data.length ? JSON.parse(data.join()) : null;

				if (!('Content-Type' in headers)) {
					headers['Content-Type'] = 'application/json';
				}

				response.writeHead(statusCode, headers);

				if (typeof body === 'function') {
					body(function(result: Buffer) {
						response.write(result);
						response.end();
					});
				} else {
					response.write(new Buffer(body, 'utf8'));
					response.end();
				}
			});
		});

		server.on('listening', dfd.resolve.bind(dfd));
		server.listen(serverPort);

		proxy = createServer((request, response) => {
			const statusCode = 200,
				headers: any = {},
				body = '{}';

			requestData = '';

			if (!('Content-Type' in headers)) {
				headers['Content-Type'] = 'application/json';
			}

			headers['Proxy-agent'] = 'nodejs';

			response.writeHead(statusCode, headers);

			response.write(new Buffer(body, 'utf8'));

			response.end();
		});

		proxy.listen(1337);

		return dfd.promise;
	},

	after() {
		server.close();
		proxy.close();
	},

	tests: {
		'request options': {
			body: {
				string(this: any): void {
					const dfd = this.async();
					nodeRequest(getRequestUrl('foo.json'), {
						body: '{ "foo": "bar" }',
						method: 'POST'
					}).then(
						dfd.callback(function() {
							assert.deepEqual(requestData, { foo: 'bar' } as any);
						}),
						dfd.reject.bind(dfd)
					);
				},
				buffer() {
					return nodeRequest(getRequestUrl('foo.json'), {
						body: Buffer.from('{ "foo": "bar" }', 'utf8'),
						method: 'POST'
					}).then(() => {
						assert.deepEqual(requestData, { foo: 'bar' } as any);
					});
				}
			},

			bodyStream: {
				'stream is read'(this: any) {
					return nodeRequest(getRequestUrl('echo'), {
						method: 'POST',
						bodyStream: fs.createReadStream('tests/core/support/data/foo.json')
					})
						.then((res) => res.json())
						.then((json) => {
							assert.deepEqual(requestData, { foo: 'bar' } as any);
						});
				}
			},

			'content encoding': (function(compressionTypes) {
				const suites: { [key: string]: any } = {};

				compressionTypes.map((type) => {
					suites[type] = {
						'gets decoded'() {
							return nodeRequest(getRequestUrl(`${type}-compressed`))
								.then((response) => {
									return response.json();
								})
								.then((obj) => {
									assert.deepEqual(obj, { test: true });
								});
						},
						'errors are caught'() {
							return nodeRequest(getRequestUrl(`${type}-invalid`))
								.then((response) => {
									return response.json();
								})
								.then(
									() => {
										assert.fail('Should not have succeeded');
									},
									(error) => {
										assert.isNotNull(error);
									}
								);
						}
					};
				});

				return suites;
			})(['gzip', 'deflate', 'gzip-deflate']),

			proxy(this: any): void {
				const dfd = this.async();
				const url = getRequestUrl('foo.json');
				nodeRequest(url, {
					proxy: url.slice(0, 7) + 'username:password@' + url.slice(7)
				}).then(
					dfd.callback(function(response: any) {
						const request = response.nativeResponse.req;

						assert.strictEqual(request.path, url);
						assert.strictEqual(
							request._headers['proxy-authorization'],
							'Basic ' + new Buffer('username:password').toString('base64')
						);
						assert.strictEqual(request._headers.host, serverUrl.slice(7));
					}),
					dfd.reject.bind(dfd)
				);
			},

			'user and password': {
				both(this: any): void {
					const user = 'user name';
					const password = 'pass word';
					assertBasicAuthentication(
						{
							user,
							password
						},
						`${user}:${password}`,
						this.async()
					);
				},

				'user only'(this: any): void {
					const user = 'user name';
					assertBasicAuthentication(
						{
							user
						},
						`${user}:`,
						this.async()
					);
				},

				'password only'(this: any): void {
					const password = 'pass word';
					assertBasicAuthentication(
						{
							password
						},
						`:${password}`,
						this.async()
					);
				},

				'special characters'(this: any): void {
					const user = '$pecialUser';
					const password = '__!passW@rd';
					assertBasicAuthentication(
						{
							user,
							password
						},
						`${user}:${password}`,
						this.async()
					);
				},

				error(this: any): void {
					const dfd = this.async();
					nodeRequest(getAuthRequestUrl('foo.json'), { timeout: 1 }).then(
						dfd.resolve.bind(dfd),
						dfd.callback(function(error: TimeoutError): void {
							assert.notInclude(error.message, 'user:password');
							assert.include(error.message, '(redacted)');
						})
					);
				}
			},

			socketOptions(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					socketOptions: {
						keepAlive: 100,
						noDelay: true,
						timeout: 100
					}
				}).then(
					dfd.callback(function(response: NodeResponse) {
						// TODO: Is it even possible to test this?
						const socketOptions = response.requestOptions.socketOptions || {};
						assert.strictEqual(socketOptions.keepAlive, 100);
						assert.strictEqual(socketOptions.noDelay, true);
						assert.strictEqual(socketOptions.timeout, 100);
					}),
					dfd.reject.bind(dfd)
				);
			},

			streamEncoding(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					streamEncoding: 'utf8'
				}).then((response: NodeResponse) => {
					response.json().then(
						dfd.callback(function(json: any) {
							assert.deepEqual(json, { foo: 'bar' });
						})
					);
				}, dfd.reject.bind(dfd));
			},

			'"timeout"'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), { timeout: 1 }).then(
					dfd.resolve.bind(dfd),
					dfd.callback(function(error: Error): void {
						assert.strictEqual(error.name, 'TimeoutError');
					})
				);
			},
			'upload monitoriting': {
				'with a stream'(this: any) {
					let events: number[] = [];

					const req = nodeRequest(getRequestUrl('foo.json'), {
						method: 'POST',
						bodyStream: fs.createReadStream('tests/core/support/data/foo.json')
					});

					req.upload.subscribe((totalBytesUploaded) => {
						events.push(totalBytesUploaded);
					});

					return req.then((res) => {
						assert.isTrue(events.length > 0, 'was expecting at least one monitor event');
						assert.equal(events[events.length - 1], 17);
					});
				},
				'without a stream'(this: any) {
					let events: number[] = [];

					const req = nodeRequest(getRequestUrl('foo.json'), {
						method: 'POST',
						body: '{ "foo": "bar" }\n'
					});

					req.upload.subscribe((totalBytesUploaded) => {
						events.push(totalBytesUploaded);
					});

					return req.then((res) => {
						assert.isTrue(events.length > 0, 'was expecting at least one monitor event');
						assert.equal(events[events.length - 1], 17);
					});
				}
			},
			'download events'() {
				let downloadEvents: number[] = [];

				return nodeRequest(getRequestUrl('foo.json')).then((response) => {
					response.download.subscribe((totalBytesDownloaded) => {
						downloadEvents.push(totalBytesDownloaded);
					});

					return response.text().then(() => {
						assert.isTrue(downloadEvents.length > 0);
					});
				});
			},

			'data events'() {
				let data: number[] = [];

				return nodeRequest(getRequestUrl('foo.json')).then((response) => {
					response.data.subscribe((chunk) => {
						data.push(chunk);
					});

					return response.text().then(() => {
						assert.isTrue(data.length > 0);
					});
				});
			}
		},

		headers: {
			'request headers should not be normalized'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					headers: {
						someThingCrAzY: 'some-arbitrary-value'
					}
				}).then(
					dfd.callback(function(response: NodeResponse) {
						const header: any = (<any>response.nativeResponse).req._header;

						assert.notInclude(header, 'somethingcrazy: some-arbitrary-value');
						assert.include(header, 'someThingCrAzY: some-arbitrary-value');
						assert.match(header, /dojo\/[^\s]+ Node\.js/);
					}),
					dfd.reject.bind(dfd)
				);
			},

			'user agent should be added if its not there'(this: any): any {
				return nodeRequest(getRequestUrl('foo.json'), {})
					.then((response: any) => {
						const header: any = response.nativeResponse.req._header;

						assert.include(header, 'user-agent:');

						return nodeRequest(getRequestUrl('food.json'), {
							headers: {
								'user-agent': 'already exists'
							}
						});
					})
					.then((response: any) => {
						const header: any = response.nativeResponse.req._header;

						assert.include(header, 'user-agent: already exists');

						return nodeRequest(getRequestUrl('food.json'), {
							headers: {
								'uSeR-AgEnT': 'mIxEd CaSe'
							}
						});
					})
					.then((response: any) => {
						const header: any = response.nativeResponse.req._header;

						assert.include(header, 'uSeR-AgEnT: mIxEd CaSe');
					});
			},

			'compression headers are present by default'() {
				return nodeRequest(getRequestUrl('foo.json')).then((response: any) => {
					const header: any = response.nativeResponse.req._header;
					assert.include(header, 'Accept-Encoding: gzip, deflate');
				});
			},

			'compression headers can be turned off'() {
				return nodeRequest(getRequestUrl('foo.json'), {
					acceptCompression: false
				}).then((response: any) => {
					const header: any = response.nativeResponse.req._header;
					assert.notInclude(header, 'Accept-Encoding:');
				});
			},

			'response headers': {
				'after response'(this: any): void {
					const dfd = this.async();
					nodeRequest(getRequestUrl('foo.json')).then(
						dfd.callback(function(response: Response): void {
							assert.strictEqual(response.headers.get('content-type'), 'application/json');
						}),
						dfd.reject.bind(dfd)
					);
				}
			},

			'set cookie makes separate headers'() {
				return nodeRequest(getRequestUrl('cookies')).then((response: any) => {
					assert.deepEqual(response.headers.getAll('set-cookie'), ['one']);
				});
			}
		},

		'response object': {
			properties(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json')).then(
					dfd.callback(function(response: Response): void {
						assert.strictEqual(response.status, 200);
					}),
					dfd.reject.bind(dfd)
				);
			},

			'data cannot be used twice'() {
				return nodeRequest(getRequestUrl('foo.json')).then((response) => {
					assert.isFalse(response.bodyUsed);

					return response.json().then(() => {
						assert.isTrue(response.bodyUsed);

						return response.json().then(
							() => {
								throw new Error('should not have succeeded');
							},
							() => {
								return true;
							}
						);
					});
				});
			},

			'response types': {
				'arrayBuffer with binary content'() {
					return nodeRequest(getRequestUrl('blob.gif')).then((response: any) => {
						return response.arrayBuffer().then((arrayBuffer: any) => {
							assert.strictEqual(arrayBuffer.byteLength, blobFileSize);
						});
					});
				},

				'arrayBuffer with text content'() {
					return nodeRequest(getRequestUrl('foo.json')).then((response: any) => {
						return response.arrayBuffer().then((arrayBuffer: any) => {
							assert.strictEqual(arrayBuffer.byteLength, JSON.stringify({ foo: 'bar' }).length);
						});
					});
				},

				blob() {
					return nodeRequest(getRequestUrl('foo.json')).then((response: any) => {
						return response.blob().then(
							(blob: any) => {
								assert.fail('should not have succeeded');
							},
							() => {
								return true;
							}
						);
					});
				}
			}
		},

		'status codes': {
			Redirects: {
				'300 Multiple Choices': buildRedirectTests([
					{
						method: 'GET',
						url: '300-redirect',
						expectedCount: 0
					},
					{
						method: 'POST',
						url: '300-redirect',
						expectedCount: 0
					},
					{
						method: 'PUT',
						url: '300-redirect',
						expectedCount: 0
					},
					{
						method: 'DELETE',
						url: '300-redirect',
						expectedCount: 0
					},
					{
						method: 'HEAD',
						url: '300-redirect',
						expectedCount: 0
					}
				]),
				'301 Moved Permanently': buildRedirectTests([
					{
						method: 'GET',
						url: '301-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedData: { success: true }
					},
					{
						method: 'HEAD',
						url: '301-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'POST',
						url: '301-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'POST',
						url: '301-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'POST',
						expectedData: { success: true }
					},
					{
						method: 'DELETE',
						url: '301-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'DELETE',
						url: '301-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'DELETE',
						expectedData: { success: true }
					},
					{
						method: 'PUT',
						url: '301-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'PUT',
						url: '301-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'PUT',
						expectedData: { success: true }
					}
				]),

				'302 Found': buildRedirectTests([
					{
						method: 'GET',
						url: '302-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedData: { success: true }
					},
					{
						method: 'HEAD',
						url: '302-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'POST',
						url: '302-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'POST',
						url: '302-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'POST',
						expectedData: { success: true }
					},
					{
						method: 'DELETE',
						url: '302-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'DELETE',
						url: '302-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'DELETE',
						expectedData: { success: true }
					},
					{
						method: 'PUT',
						url: '302-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'PUT',
						url: '302-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'PUT',
						expectedData: { success: true }
					}
				]),

				'303 See Other': buildRedirectTests([
					{
						method: 'GET',
						url: '303-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedData: { success: true }
					},
					{
						method: 'HEAD',
						url: '303-redirect',
						expectedPage: 'redirect-success',
						expectedMethod: 'GET',
						expectedCount: 1
					},
					{
						method: 'POST',
						url: '303-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'POST',
						url: '303-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'DELETE',
						url: '303-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'DELETE',
						url: '303-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'PUT',
						url: '303-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'PUT',
						url: '303-redirect',
						keepOriginalMethod: true,
						expectedPage: 'redirect-success',
						expectedCount: 1,
						expectedMethod: 'GET',
						expectedData: { success: true }
					},
					{
						method: 'GET',
						title: 'Without redirect following',
						url: '303-redirect',
						expectedPage: '303-redirect',
						expectedCount: 0,
						expectedMethod: 'GET',
						followRedirects: false
					}
				]),

				'304 Not Modified': buildRedirectTests([
					{
						method: 'GET',
						url: '304-redirect',
						expectedPage: '304-redirect',
						expectedCount: 0
					},
					{
						method: 'HEAD',
						url: '304-redirect',
						expectedPage: '304-redirect',
						expectedCount: 0
					},
					{
						method: 'POST',
						url: '304-redirect',
						expectedPage: '304-redirect',
						expectedCount: 0
					},
					{
						method: 'PUT',
						url: '304-redirect',
						expectedPage: '304-redirect',
						expectedCount: 0
					},
					{
						method: 'DELETE',
						url: '304-redirect',
						expectedPage: '304-redirect',
						expectedCount: 0
					}
				]),

				'305 Use Proxy': buildRedirectTests([
					{
						method: 'GET',
						url: '305-redirect',
						expectedCount: 1,
						callback: (response) => {
							assert.equal(response.nativeResponse.headers['proxy-agent'], 'nodejs');
						}
					},
					{
						title: 'Without a location header',
						method: 'GET',
						url: '305-redirect-broken',
						expectedToError: true
					},
					{
						method: 'GET',
						title: 'Without redirect following',
						url: '305-redirect',
						expectedPage: '305-redirect',
						expectedCount: 0,
						expectedMethod: 'GET',
						followRedirects: false
					}
				]),

				'306 Unused': buildRedirectTests([
					{
						method: 'GET',
						url: '306-redirect',
						expectedToError: true
					}
				]),

				'307 Temporary Redirect': buildRedirectTests([
					{
						method: 'GET',
						url: '307-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'HEAD',
						url: '307-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'POST',
						url: '307-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'PUT',
						url: '307-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'DELETE',
						url: '307-redirect',
						expectedPage: 'redirect-success',
						expectedCount: 1
					},
					{
						method: 'GET',
						title: 'Without redirect following',
						url: '307-redirect',
						expectedPage: '307-redirect',
						expectedCount: 0,
						expectedMethod: 'GET',
						followRedirects: false
					}
				]),

				'Infinite Redirects': function() {
					let didError = false;

					return nodeRequest(getRequestUrl('infinite-redirect'), {
						redirectOptions: {
							limit: 10
						}
					})
						.then((response) => {})
						.catch(() => {
							didError = true;
						})
						.finally(() => {
							assert.isTrue(didError, 'Expected an error to occur but none did');
						});
				},

				'Sensible Defaults': function() {
					return nodeRequest(getRequestUrl('301-redirect'), {}).then((response: any) => {
						assert.equal(response.url, getRequestUrl('redirect-success'));
					});
				},

				'Redirect with no header': buildRedirectTests([
					{
						method: 'GET',
						url: 'broken-redirect',
						expectedToError: true
					}
				]),

				'Can turn off follow redirects': buildRedirectTests([
					{
						method: 'GET',
						url: '301-redirect',
						expectedCount: 0,
						followRedirects: false
					}
				]),

				'Relative redirect urls': buildRedirectTests([
					{
						method: 'GET',
						url: 'relative-redirect',
						expectedPage: 'redirect-success'
					},
					{
						method: 'GET',
						url: 'protocolless-redirect',
						expectedPage: 'redirect-success'
					}
				])
			}
		}
	}
});
