import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as DojoPromise from 'intern/dojo/Promise';
import request, { RequestOptions } from 'src/request';
import { createServer } from 'http';
import { parse } from 'url';

let handle: any;

const serverPort = 8124;
const serverUrl = 'http://localhost:' + serverPort;
let server: any;
let nodeRequest: any;

let getRequestUrl = function (dataKey: string): string {
	return serverUrl + '?dataKey=' + dataKey;
};

registerSuite({
	name: 'request_node',

	setup() {
		const dfd = new DojoPromise.Deferred();
		const responseData: { [name: string]: any } = {
			'foo.json': new Buffer(JSON.stringify({ foo: 'bar' }), 'utf8'),
			invalidJson: new Buffer('<not>JSON</not>', 'utf8')
		};

		function getResponseData(request: any) {
			const urlInfo = parse(request.url, true);
			return responseData[urlInfo.query.dataKey];
		}

		server = createServer(function(request, response){
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
});
