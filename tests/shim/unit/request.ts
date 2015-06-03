import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Deferred = require('intern/dojo/Deferred');
import has = require('intern/dojo/has');
import * as http from 'http';
// TODO replace with async/Task when that's merged
import { default as Task } from 'src/Promise';
import request, { filterRegistry, providerRegistry, RequestOptions, RequestPromise, Response } from 'src/request';
import { default as nodeRequest } from 'src/request/node';
import { default as xhrRequest } from 'src/request/xhr';
import * as url from 'url';

const mockData = '{ "foo": "bar" }';
let handle: any;

function mockProvider(url: string): RequestPromise<any> {
	return <RequestPromise<any>> Task.resolve({
		data: mockData
	});
}

const suite: { [name: string]: any } = {
	name: 'request',

	afterEach() {
		if (handle) {
			handle.destroy();
			handle = null;
		}
	},

	'default provider'() {
		const provider = providerRegistry.match();
		assert.isTrue(provider === nodeRequest || provider === xhrRequest);
	},

	'custom provider': {
		'String matching'() {
			const dfd = this.async();
			handle = providerRegistry.register('arbitrary.html', mockProvider);

			request.get('arbitrary.html')
				.then(
					dfd.callback(function (response: any): void {
						assert.equal(response.data, mockData);
					}),
					dfd.reject.bind(dfd)
				);
		},

		'RegExp matching'() {
			const dfd = this.async();
			handle = providerRegistry.register(/arbitrary\.html$/, mockProvider);

			request.get('arbitrary.html')
				.then(
					dfd.callback(function (response: any): void {
						assert.equal(response.data, mockData);
					}),
					dfd.reject.bind(dfd)
				);
		},

		'Default matching'() {
			const dfd = this.async();
			handle = providerRegistry.register(
				function (url: string): boolean {
					return url === 'arbitrary.html';
				},
				mockProvider
			);

			request.get('arbitrary.html')
				.then(
					dfd.callback(function (response: any): void {
						assert.equal(response.data, mockData);
					}),
					dfd.reject.bind(dfd)
				);
		}
	},

	'custom filters': {
		beforeEach() {
			handle = providerRegistry.register('arbitrary.html', mockProvider);
		},

		'String matching'() {
			let data: string;

			handle = filterRegistry.register('arbitrary.html', function (response: Response<any>): Response<any> {
				data = response.data;
				return response;
			});

			const dfd = this.async();
			request.get('arbitrary.html')
				.then(
					dfd.callback(function (response: any): void {
						assert.equal(response.data, data);
					}),
					dfd.reject.bind(dfd)
				);
		},

		'RegExp matching'() {
			const dfd = this.async();
			let data: string;
			handle = filterRegistry.register(/arbitrary\.html$/, function (response: Response<any>): Response<any> {
				data = response.data;
				return response;
			});

			request.get('arbitrary.html')
				.then(
					dfd.callback(function (response: any): void {
						assert.equal(response.data, data);
					}),
					dfd.reject.bind(dfd)
				);
		},

		'Default matching'() {
			const dfd = this.async();
			let data: string;

			handle = filterRegistry.register(
				function (response: Response<any>, url: string): boolean {
					return url === 'arbitrary.html';
				},
				function (response: Response<any>): Response<any> {
					data = response.data;
					return response;
				}
			);

			request.get('arbitrary.html')
				.then(
					dfd.callback(function (response: any): void {
						assert.equal(response.data, data);
					}),
					dfd.reject.bind(dfd)
				);
		},

		'JSON matching'() {
			const dfd = this.async();

			request.get('arbitrary.html', {
				responseType: 'json'
			}).then(
				dfd.callback(function (response: any) {
					assert.deepEqual(response.data, { foo: 'bar' }, 'JSON parsing should be automatically provided.');
				}),
				dfd.reject.bind(dfd)
			);
		}
	}
};

if (has('host-node')) {
	const serverPort = 8124;
	const serverUrl = 'http://localhost:' + serverPort;
	let server: any;
	let nodeRequest: any;

	let getRequestUrl = function (dataKey: string): string {
		return serverUrl + '?dataKey=' + dataKey;
	};

	suite['node'] = {
		setup() {
			const dfd = new Deferred();
			const responseData: { [name: string]: any } = {
				'foo.json': JSON.stringify({ foo: 'bar' }),
				invalidJson: '<not>JSON</not>'
			};

			function getResponseData(request: any) {
				const urlInfo = url.parse(request.url, true);
				return responseData[urlInfo.query.dataKey];
			}

			server = http.createServer(function(request, response){
				const body = getResponseData(request);
				nodeRequest = request;

				response.writeHead(200, {
					'Content-Length': body.length,
					'Content-Type': 'application/json'
				});
				response.write(body);

				response.end();
			});

			server.on('listening', dfd.resolve);
			server.listen(serverPort);

			return dfd.promise;
		},

		teardown() {
			server.close();
		},

		afterEach() {
			if (handle) {
				handle.destroy();
				handle = null;
			}
		},

		'.get': {
			'simple request'() {
				const dfd = this.async();
				request.get(getRequestUrl('foo.json'))
					.then(
						dfd.callback(function (response: any) {
							assert.equal(String(response.data), JSON.stringify({ foo: 'bar' }));
						}),
						dfd.reject.bind(dfd)
					);
			},

			'custom headers'() {
				const dfd = this.async();
				const options: RequestOptions = { headers: { 'Content-Type': 'application/json' } };
				request.get(getRequestUrl('foo.json'), options)
					.then(
						dfd.callback(function (response: any) {
							assert.equal(String(response.data), JSON.stringify({ foo: 'bar' }));
							assert.notProperty(nodeRequest.headers, 'Content-Type', 'expected header to be normalized');
							assert.propertyVal(nodeRequest.headers, 'content-type', 'application/json');
						}),
						dfd.reject.bind(dfd)
					);
			}
		},

		'JSON filter'() {
			handle = filterRegistry.register(/foo\.json$/, function (response: Response<any>) {
				response.data = JSON.parse(String(response.data));
				return response;
			});

			const dfd = this.async();
			request.get(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any) {
						assert.deepEqual(response.data, { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
		}
	};
}

if (has('host-browser')) {
	let getRequestUrl = function (dataKey: string): string {
		return (<any> require).toUrl('../support/data/' + dataKey);
	};

	suite['browser'] = {
		'.get'() {
			const dfd = this.async();
			request.get(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any) {
						assert.deepEqual(JSON.parse(response.data), { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
		},

		'JSON filter'() {
			filterRegistry.register(/foo.json$/, function (response: Response<any>) {
				response.data = JSON.parse(String(response.data));
				return response;
			});

			const dfd = this.async();
			request.get(getRequestUrl('foo.json'))
				.then(
					dfd.callback(function (response: any) {
						assert.deepEqual(response.data, { foo: 'bar' });
					}),
					dfd.reject.bind(dfd)
				);
		}
	};
}

registerSuite(suite);
