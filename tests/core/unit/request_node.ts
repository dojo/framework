const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import request from '../../src/request';
import node from '../../src/request/providers/node';
import { createServer } from 'http';
import { parse } from 'url';

request.setDefaultProvider(node);

let handle: any;

const serverPort = 8124;
const serverUrl = 'http://localhost:' + serverPort;
let server: any;

let getRequestUrl = function(dataKey: string): string {
	return serverUrl + '?dataKey=' + dataKey;
};

registerSuite('request node', {
	before(this: any) {
		const dfd = this.async();
		const responseData: { [name: string]: any } = {
			'foo.json': new Buffer(JSON.stringify({ foo: 'bar' }), 'utf8'),
			invalidJson: new Buffer('<not>JSON</not>', 'utf8')
		};

		function getResponseData(request: any) {
			const urlInfo = parse(request.url, true);
			return responseData[urlInfo.query.dataKey as string];
		}

		server = createServer(function(request, response) {
			const body = getResponseData(request);

			response.writeHead(200, {
				'Content-Type': 'application/json'
			});
			response.write(body);

			response.end();
		});

		server.on('listening', dfd.resolve.bind(dfd));
		server.listen(serverPort);

		return dfd.promise;
	},

	after() {
		server.close();
	},

	afterEach() {
		if (handle) {
			handle.destroy();
			handle = null;
		}
	},

	tests: {
		'.get': {
			'simple request'(this: any) {
				return request
					.get(getRequestUrl('foo.json'))
					.then((response) => {
						return response.text();
					})
					.then((text) => {
						assert.equal(String(text), JSON.stringify({ foo: 'bar' }));
					});
			},

			'custom headers'(this: any) {
				const options = { headers: { 'Content-Type': 'application/json' } };
				return request.get(getRequestUrl('foo.json'), options).then((response) => {
					return response.text().then((text) => {
						assert.equal(String(text), JSON.stringify({ foo: 'bar' }));
						assert.equal(response.headers.get('content-type'), 'application/json');
					});
				});
			}
		},

		'JSON responseType filter'() {
			return request
				.get(getRequestUrl('foo.json'))
				.then((response) => {
					return response.json();
				})
				.then((json) => {
					assert.deepEqual(json, { foo: 'bar' });
				});
		}
	}
});
