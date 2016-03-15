import BaseStringSource from '../streams/helpers/BaseStringSource';
import * as http from 'http';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as DojoPromise from 'intern/dojo/Promise';
import Promise from 'src/Promise';
import RequestTimeoutError from 'src/request/errors/RequestTimeoutError';
import { default as nodeRequest } from 'src/request/node';
import ArraySink from 'src/streams/ArraySink';
import ReadableStream from 'src/streams/ReadableStream';
import ReadableStreamController from 'src/streams/ReadableStreamController';
import WritableStream from 'src/streams/WritableStream';
import * as url from 'url';

const serverPort = 8124;
const serverUrl = 'http://localhost:' + serverPort;
let server: any;
let request: any;
let requestData: string;

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
		const responseData: { [name: string]: any } = {
			'foo.json': JSON.stringify({ foo: 'bar' }),
			'redirected': 'redirected',
			invalidJson: '<not>JSON</not>'
		};

		server = http.createServer(function (_request, response) {
			const urlInfo = url.parse(_request.url, true);
			const dataKey: string = urlInfo.query.dataKey;
			request = _request;

			const data: string[] = [];
			request.on('data', function (chunk: any) {
				data.push(chunk.toString('utf8'));
			});
			request.on('end', function () {
				if (dataKey === 'redirect') {
					response.writeHead(302, {
						location: getRequestUrl('redirected')
					});
					response.end();
				}
				else {
					const body = responseData[dataKey] || null;
					requestData = data.length ? JSON.parse(data.join()) : null;
					response.writeHead(200, {
						'Content-Type': 'application/json'
					});
					response.end(body);
				}
			});
		});

		server.on('listening', dfd.resolve);
		server.listen(serverPort);

		return dfd.promise;
	},

	teardown() {
		server.close();
	},

	'request options': {
		data: {
			stream(): void {
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

			'stream error'(): void {
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

			'string'(): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), {
					data: '{ "foo": "bar" }'
				}).then(
					dfd.callback(function (response: any) {
						assert.deepEqual(JSON.parse(response.data), { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
			}
		},

		proxy(): void {
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
			both(): void {
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

			'user only'(): void {
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

			'password only'(): void {
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

			error(): void {
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

		socketOptions(): void {
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

		streamEncoding(): void {
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
			success(): void {
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

			error(): void {
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

		'"timeout"'(): void {
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
		'request header normalization'(): void {
			const dfd = this.async();
			nodeRequest(getRequestUrl('foo.json'), {
				headers: {
					someThingCrAzY: 'some-arbitrary-value'
				}
			}).then(
				dfd.callback(function (response: any) {
					const header: any = response.nativeResponse.req._header;

					assert.include(header, 'somethingcrazy: some-arbitrary-value');
					assert.match(header, /dojo\/[^\s]+ Node\.js/);
				}),
				dfd.reject.bind(dfd)
			);
		},

		'response headers': {
			'before response'(): void {
				const dfd = this.async();
				nodeRequest(getRequestUrl('foo.json'), { timeout: 1 })
					.then(
						dfd.resolve.bind(dfd),
						dfd.callback(function (error: RequestTimeoutError<any>): void {
							assert.strictEqual(error.response.getHeader('content-type'), null);
						})
					);
			},

			'after response'(): void {
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
		properties(): void {
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
		'302'(): void {
			const dfd = this.async();
			nodeRequest(getRequestUrl('redirect'), { streamEncoding: 'utf8' })
				.then(
					dfd.callback(function (response: any): void {
						assert.strictEqual(response.data, 'redirected');
					}),
					dfd.reject.bind(dfd)
				);
		}
	}
});
