const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import Task from '../../src/async/Task';
import request, { providerRegistry, Response, Headers, RequestOptions, UploadObservableTask } from '../../src/request';
import ResponseClass from '../../src/request/Response';
import Observable from '../../src/Observable';

const mockData = '{ "foo": "bar" }';
let handle: any;

function mockProvider(url: string, options?: RequestOptions): UploadObservableTask<Response> {
	const task: UploadObservableTask<Response> = <any> Task.resolve(new class extends ResponseClass {
		bodyUsed = false;
		headers: Headers = new Headers();
		ok = true;
		status = 200;
		statusText = 'OK';
		url: string = url;
		requestOptions = options || {};

		download = new Observable<number>(() => {});
		data = new Observable<number>(() => {});

		arrayBuffer(): Task<ArrayBuffer> {
			return Task.resolve(<any> null);
		}

		blob(): Task<Blob> {
			return Task.resolve(<any> null);
		}

		formData(): Task<FormData> {
			return Task.resolve(<any> null);
		}

		text(): Task<string> {
			return Task.resolve(mockData);
		}
	});

	task.upload = new Observable<number>(() => {
	});

	return task;
}

registerSuite('request', {
	afterEach() {
		if (handle) {
			handle.destroy();
			handle = null;
		}
	},

	tests: {
		'helper methods': {
			beforeEach() {
				handle = providerRegistry.register('test.html', mockProvider);
			},

			tests: {
				'get'() {
					return request.get('test.html').then(response => {
						assert.equal(response.requestOptions.method, 'GET');
					});
				},
				'delete'() {
					return request.delete('test.html').then(response => {
						assert.equal(response.requestOptions.method, 'DELETE');
					});
				},
				'head'() {
					return request.head('test.html').then(response => {
						assert.equal(response.requestOptions.method, 'HEAD');
					});
				},
				'options'() {
					return request.options('test.html').then(response => {
						assert.equal(response.requestOptions.method, 'OPTIONS');
					});
				},
				'post'() {
					return request.post('test.html', {
						body: 'some body'
					}).then(response => {
						assert.equal(response.requestOptions.method, 'POST');
						assert.equal(response.requestOptions.body, 'some body');
					});
				},
				'put'() {
					return request.put('test.html').then(response => {
						assert.equal(response.requestOptions.method, 'PUT');
					});
				}
			}
		},

		'custom provider': {
			'String matching'() {
				handle = providerRegistry.register('arbitrary.html', mockProvider);

				return request.get('arbitrary.html')
					.then(function (response) {
						return response.text();
					}).then(data => {
						assert.equal(data, mockData);
					});
			},

			'RegExp matching'() {
				handle = providerRegistry.register(/arbitrary\.html$/, mockProvider);

				return request.get('arbitrary.html')
					.then(function (response) {
						return response.text();
					}).then(text => {
						assert.equal(text, mockData);
					});
			},

			'Default matching'() {
				handle = providerRegistry.register(
					function (url: string): boolean {
						return url === 'arbitrary.html';
					},
					mockProvider
				);

				return request.get('arbitrary.html')
					.then(function (response) {
						return response.text();
					}).then(text => {
						assert.equal(text, mockData);
					});
			}
		},

		'custom filters': {
			beforeEach() {
				handle = providerRegistry.register('arbitrary.html', mockProvider);
			},

			tests: {
				'JSON matching'() {
					return request.get('arbitrary.html').then(function (response) {
						return response.json<{ foo: string; }>();
					}).then((json) => {
						assert.deepEqual(json, { foo: 'bar' }, 'JSON parsing should be automatically provided.');
					});
				}
			}
		}
	}
});
