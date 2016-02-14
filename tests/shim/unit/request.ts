import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import DojoPromise = require('intern/dojo/Promise');
import has = require('intern/dojo/has');
import Task from 'src/async/Task';
import request, { filterRegistry, providerRegistry, RequestOptions, Response, ResponsePromise } from 'src/request';

// These imports are only for type information
import * as nodeHttp from 'http';
import * as nodeUrl from 'url';

const mockData = '{ "foo": "bar" }';
let handle: any;

function mockProvider(url: string): ResponsePromise<any> {
	return <ResponsePromise<any>> Task.resolve({
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

	'custom provider': {
		'String matching'() {
			handle = providerRegistry.register('arbitrary.html', mockProvider);

			return request.get('arbitrary.html')
				.then(function (response: any): void {
					assert.equal(response.data, mockData);
				})
			;
		},

		'RegExp matching'() {
			handle = providerRegistry.register(/arbitrary\.html$/, mockProvider);

			return request.get('arbitrary.html')
				.then(function (response: any): void {
					assert.equal(response.data, mockData);
				})
			;
		},

		'Default matching'() {
			handle = providerRegistry.register(
				function (url: string): boolean {
					return url === 'arbitrary.html';
				},
				mockProvider
			);

			return request.get('arbitrary.html')
				.then(function (response: any): void {
					assert.equal(response.data, mockData);
				})
			;
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

			return request.get('arbitrary.html')
				.then(function (response: any): void {
					assert.equal(response.data, data);
				})
			;
		},

		'RegExp matching'() {
			let data: string;
			handle = filterRegistry.register(/arbitrary\.html$/, function (response: Response<any>): Response<any> {
				data = response.data;
				return response;
			});

			return request.get('arbitrary.html')
				.then(function (response: any): void {
					assert.equal(response.data, data);
				})
			;
		},

		'Default matching'() {
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

			return request.get('arbitrary.html')
				.then(function (response: any): void {
					assert.equal(response.data, data);
				})
			;
		},

		'JSON matching'() {
			return request.get('arbitrary.html', {
				responseType: 'json'
			}).then(function (response: any) {
				assert.deepEqual(response.data, { foo: 'bar' }, 'JSON parsing should be automatically provided.');
			});
		}
	}
};

if (has('host-node')) {
	const http: typeof nodeHttp = require('http');
	const url: typeof nodeUrl = require('url');
	const serverPort = 8124;
	const serverUrl = 'http://localhost:' + serverPort;
	let server: any;
	let nodeRequest: any;

	let getRequestUrl = function (dataKey: string): string {
		return serverUrl + '?dataKey=' + dataKey;
	};

	suite['node'] = {
		setup() {
			const dfd = new DojoPromise.Deferred();
			const responseData: { [name: string]: any } = {
				'foo.json': new Buffer(JSON.stringify({ foo: 'bar' }), 'utf8'),
				invalidJson: new Buffer('<not>JSON</not>', 'utf8')
			};

			function getResponseData(request: any) {
				const urlInfo = url.parse(request.url, true);
				return responseData[urlInfo.query.dataKey];
			}

			server = http.createServer(function(request, response){
				const body = getResponseData(request);
				nodeRequest = request;

				response.writeHead(200, {
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

		'JSON responseType filter'() {
			return request.get(getRequestUrl('foo.json'), { responseType: 'json' })
				.then(function(response: any) {
					assert.deepEqual(response.data, { foo: 'bar' });
				})
			;
		},

		'JSON handleAs filter'() {
			return request.get(getRequestUrl('foo.json'), { handleAs: 'json' })
				.then(function(response: any) {
					assert.deepEqual(response.data, { foo: 'bar' });
				})
			;
		}
	};
}

if (has('host-browser')) {
	let getRequestUrl = function (dataKey: string): string {
		return (<any> require).toUrl('../support/data/' + dataKey);
	};

	suite['browser'] = {
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
		},

		'JSON handleAs filter'() {
			return request.get(getRequestUrl('foo.json'), { handleAs: 'json' })
				.then(function (response: any) {
					assert.deepEqual(response.data, { foo: 'bar' });
				})
			;
		}
	};
}

registerSuite(suite);
