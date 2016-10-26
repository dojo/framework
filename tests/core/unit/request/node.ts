import BaseStringSource from '../streams/helpers/BaseStringSource';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as DojoPromise from 'intern/dojo/Promise';
import Promise from 'dojo-shim/Promise';
import RequestTimeoutError from '../../../src/request/errors/RequestTimeoutError';
import { default as nodeRequest, NodeRequestOptions } from '../../../src/request/node';
import ArraySink from '../../../src/streams/ArraySink';
import ReadableStream from '../../../src/streams/ReadableStream';
import ReadableStreamController from '../../../src/streams/ReadableStreamController';
import WritableStream from '../../../src/streams/WritableStream';
import { createServer } from 'http';
import { parse } from 'url';

const serverPort = 8124;
const serverUrl = 'http://localhost:' + serverPort;
let server: any;
let proxy: any;
let requestData: string;

interface DummyResponse {
	body?: string;
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
			'Location': getRequestUrl('redirect-success')
		}
	},
	'301-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': getRequestUrl('redirect-success')
		}
	},
	'302-redirect': {
		statusCode: 302,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': getRequestUrl('redirect-success')
		}
	},
	'303-redirect': {
		statusCode: 303,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': getRequestUrl('redirect-success')
		}
	},
	'304-redirect': {
		statusCode: 304,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': getRequestUrl('redirect-success')
		}
	},
	'305-redirect': {
		statusCode: 305,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': 'http://localhost:1337'
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
			'Location': getRequestUrl('redirect-success')
		}
	},
	'307-redirect': {
		statusCode: 307,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': getRequestUrl('redirect-success')
		}
	},
	'infinite-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning to redirect'),
		headers: {
			'Location': getRequestUrl('infinite-redirect')
		}
	},
	'broken-redirect': {
		statusCode: 301,
		body: JSON.stringify('beginning to redirect'),
		headers: {}
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
		const followRedirects = (details.followRedirects === undefined) ? true : details.followRedirects;

		let title = details.title || (method + ' ' + (keepOriginalMethod ? 'w/' : 'w/o') + ' keepOriginalMethod');

		tests[ title ] = () => {

			let error: any = null;

			return nodeRequest(getRequestUrl(details.url), {
				responseType: 'json',
				method: method,
				followRedirects: followRedirects,
				redirectOptions: {
					keepOriginalMethod
				}
			})
			.then((response) => {
				if (details.callback) {
					details.callback(response);
				}

				assert.deepPropertyVal(response, 'requestOptions.method', expectedMethod);
				assert.equal(response.url, expectedPage);

				if (details.expectedCount !== undefined) {
					const { redirectOptions: { count: redirectCount = 0 } = {} } = <NodeRequestOptions<string>> response.requestOptions;

					assert.equal(redirectCount, details.expectedCount);
				}

				if (details.expectedData !== undefined) {
					if (response.data === null) {
						assert.isNull(details.expectedData);
					} else {
						let data = JSON.parse(response.data.toString());
						assert.deepEqual(data, details.expectedData);
					}
				}
			})
			.catch((e) => {
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
};

function getResponseData(request: any): DummyResponse {
	const urlInfo = parse(request.url, true);
	return responseData[ urlInfo.query.dataKey ] || {};
}

function getRequestUrl(dataKey: string): string {
	return serverUrl + '?dataKey=' + dataKey;
}

function getAuthRequestUrl(dataKey: string, user: string = 'user', password: string = 'password'): string {
	const requestUrl = getRequestUrl(dataKey);
	return requestUrl.slice(0, 7) + user + ':' + password + '@' + requestUrl.slice(7);
}

class ErrorableStream<T> extends WritableStream<T> {
	write(chunk: T): Promise<void> {
		const error = new Error('test');
		this._error(error);

		return Promise.reject(error);
	}
}

registerSuite({
	name: 'request/node',

	setup() {
		const dfd = new DojoPromise.Deferred();

		server = createServer(function (request, response) {
			const { statusCode = 200, headers = {}, body = '{}' } = getResponseData(request);

			const data: string[] = [];
			request.on('data', function (chunk: any) {
				data.push(chunk.toString('utf8'));
			});

			request.on('end', function () {
				requestData = data.length ? JSON.parse(data.join()) : null;

				if (!('Content-Type' in headers)) {
					headers[ 'Content-Type' ] = 'application/json';
				}

				response.writeHead(statusCode, headers);

				response.write(new Buffer(body, 'utf8'));

				response.end();
			});
		});

		server.on('listening', dfd.resolve);
		server.listen(serverPort);

		proxy = createServer((request, response) => {
			const statusCode = 200,
				headers: any = {},
				body = '{}';

			requestData = '';

			if (!('Content-Type' in headers)) {
				headers[ 'Content-Type' ] = 'application/json';
			}

			headers[ 'Proxy-agent' ] = 'nodejs';

			response.writeHead(statusCode, headers);

			response.write(new Buffer(body, 'utf8'));

			response.end();
		});

		proxy.listen(1337);

		return dfd.promise;
	},

	teardown() {
		server.close();
		proxy.close();
	},

	'request options': {
		data: {
			stream(this: any): void {
				const dfd = this.async();
				const source = new BaseStringSource();
				source.start = function (controller: ReadableStreamController<string>): Promise<void> {
					controller.enqueue('{ "test": "1" }');
					controller.close();
					return Promise.resolve();
				};

				nodeRequest(getRequestUrl('postStream'), {
					data: new ReadableStream(source),
					method: 'POST'
				}).then(
					dfd.callback(function (response: any) {
						assert.deepEqual(requestData, { test: '1' });
					}),
					dfd.reject.bind(dfd)
				);
			},

			'stream error'(this: any): void {
				const dfd = this.async();
				const source = new BaseStringSource();
				source.start = function (controller: ReadableStreamController<string>): Promise<void> {
					return Promise.reject(new Error('test'));
				};

				nodeRequest(getRequestUrl('postStream'), {
					data: new ReadableStream(source),
					method: 'POST'
				}).then(
					dfd.resolve.bind(dfd),
					dfd.callback(function (error: any) {
						const url = serverUrl + '/?dataKey=postStream';
						assert.strictEqual(error.message, '[POST ' + url + '] test');
					})
				);
			},

			'string'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					data: '{ "foo": "bar" }',
					method: 'POST'
				}).then(
					dfd.callback(function (response: any) {
						assert.deepEqual(requestData, { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
			}
		},

		proxy(this: any): void {
			const dfd = this.async();
			const url = getRequestUrl('foo.json');
			nodeRequest(url, {
				proxy: url.slice(0, 7) + 'username:password@' + url.slice(7)
			}).then(
				dfd.callback(function (response: any) {
					const request = response.nativeResponse.req;

					assert.strictEqual(request.path, url);
					assert.strictEqual(request._headers['proxy-authorization'],
						'Basic ' + new Buffer('username:password').toString('base64'));
					assert.strictEqual(request._headers.host, serverUrl.slice(7));
				}),
				dfd.reject.bind(dfd)
			);
		},

		'user and password': {
			both(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					user: 'user name',
					password: 'pass word'
				}).then(
					dfd.callback(function (response: any) {
						const actual: string = response.nativeResponse.req._headers.authorization;
						const expected: string = 'Basic ' + new Buffer('user%20name:pass%20word').toString('base64');

						assert.strictEqual(actual, expected);
					}),
					dfd.reject.bind(dfd)
				);
			},

			'user only'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					user: 'user name'
				}).then(
					dfd.callback(function (response: any) {
						const actual: string = response.nativeResponse.req._headers.authorization;
						const expected: string = 'Basic ' + new Buffer('user%20name:').toString('base64');

						assert.strictEqual(actual, expected);
					}),
					dfd.reject.bind(dfd)
				);
			},

			'password only'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					password: 'pass word'
				}).then(
					dfd.callback(function (response: any) {
						const actual: string = response.nativeResponse.req._headers.authorization;
						const expected: string = 'Basic ' + new Buffer(':pass%20word').toString('base64');

						assert.strictEqual(actual, expected);
					}),
					dfd.reject.bind(dfd)
				);
			},

			error(this: any): void {
				const dfd = this.async();
				nodeRequest(getAuthRequestUrl('foo.json'), { timeout: 1 })
					.then(
						dfd.resolve.bind(dfd),
						dfd.callback(function (error: RequestTimeoutError<any>): void {
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
				dfd.callback(function (response: any) {
					// TODO: Is it even possible to test this?
					const socketOptions = response.requestOptions.socketOptions;
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
			}).then(
				dfd.callback(function (response: any) {
					assert.deepEqual(JSON.parse(response.data), { foo: 'bar' });
				}),
				dfd.reject.bind(dfd)
			);
		},

		streamTarget: {
			success(this: any): void {
				const dfd = this.async();
				const sink = new ArraySink();
				const stream = new WritableStream(sink);
				nodeRequest(getRequestUrl('foo.json'), {
					streamTarget: stream
				}).then(
					dfd.callback(function (response: any) {
						assert.deepEqual(JSON.parse(<string> sink.chunks[0]), { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
			},

			error(this: any): void {
				const dfd = this.async();
				const stream = new ErrorableStream<string>(new ArraySink());
				nodeRequest(getRequestUrl('foo.json'), {
					streamTarget: stream
				}).then(
					dfd.resolve.bind(dfd),
					dfd.callback(function (error: any): void {
						assert.instanceOf(error, Error);
					})
				);
			}
		},

		'"timeout"'(this: any): void {
			const dfd = this.async();
			nodeRequest(getRequestUrl('foo.json'), { timeout: 1 })
				.then(
					dfd.resolve.bind(dfd),
					dfd.callback(function (error: Error): void {
						assert.strictEqual(error.name, 'RequestTimeoutError');
					})
				);
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
				dfd.callback(function (response: any) {
					const header: any = response.nativeResponse.req._header;

					assert.notInclude(header, 'somethingcrazy: some-arbitrary-value');
					assert.include(header, 'someThingCrAzY: some-arbitrary-value');
					assert.match(header, /dojo\/[^\s]+ Node\.js/);
				}),
				dfd.reject.bind(dfd)
			);
		},

		'response headers': {
			'before response'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), { timeout: 1 })
					.then(
						dfd.resolve.bind(dfd),
						dfd.callback(function (error: RequestTimeoutError<any>): void {
							assert.strictEqual(error.response.getHeader('content-type'), null);
						})
					);
			},

			'after response'(this: any): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'))
					.then(
						dfd.callback(function (response: any): void {
							assert.strictEqual(response.getHeader('content-type'), 'application/json');
						}),
						dfd.reject.bind(dfd)
					);
			}
		}
	},

	'response object': {
		properties(this: any): void {
			const dfd = this.async();
			nodeRequest(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any): void {
						assert.strictEqual(response.statusCode, 200);
					}),
					dfd.reject.bind(dfd)
				);
		}
	},

	'status codes': {
		'Redirects': {
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
						assert.equal(response.nativeResponse.headers[ 'proxy-agent' ], 'nodejs');
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

			'Infinite Redirects': function () {
				let didError = false;

				return nodeRequest(getRequestUrl('infinite-redirect'), {
					redirectOptions: {
						limit: 10
					}
				}).then((response) => {
				}).catch(() => {
					didError = true;
				}).finally(() => {
					assert.isTrue(didError, 'Expected an error to occur but none did');
				});
			},

			'Sensible Defaults': function () {
				return nodeRequest(getRequestUrl('301-redirect'), {}).then((response) => {
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
			])
		}
	}
});
