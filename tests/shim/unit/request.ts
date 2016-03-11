import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Task from 'src/async/Task';
import request, { filterRegistry, providerRegistry, Response, ResponsePromise } from 'src/request';
import 'intern/dojo/has!host-node?./request_node:./request_browser';

const mockData = '{ "foo": "bar" }';
let handle: any;

function mockProvider(url: string): ResponsePromise<any> {
	return <ResponsePromise<any>> Task.resolve({
		data: mockData
	});
}

registerSuite({
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
});
