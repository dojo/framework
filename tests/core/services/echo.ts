import Promise from '../../src/Promise';
import { Hash } from '../../src/interfaces';

import http = require('intern/dojo/node!http');
import querystring = require('intern/dojo/node!querystring');
import httpProxy = require('intern/dojo/node!http-proxy');
import formidable = require('intern/dojo/node!formidable');
const proxy = new httpProxy.RoutingProxy();

/**
 * Wraps a request handling function so that it can handle multipart form data.
 * If a multi-part request is detected, a promise will be added
 * to the request object at the 'data' property. It will resolve
 * to the fields sent in the multi-part request.
 */
function wrapWithMultipartHandler(handleRequest: (request: any, response: any) => void) {
	const multipartRE = /^multipart\/form-data;/;

	return function (request: any, response: any) {
		const headers = request.headers;
		if (headers['content-type'] && multipartRE.test(headers['content-type'])) {
			request.data = new Promise(function (resolve, reject) {
				const parser = new formidable.IncomingForm();
				parser.parse(request, function (err: any, fields: formidable.Fields, files: formidable.Files) {
					if (err) {
						reject(err);
						return;
					}
					for (let key in files) {
						fields[key] = files[key].name;
					}
					resolve(fields);
				});
			});
		}

		return handleRequest(request, response);
	};
}

function writeErrorResponse(response: any, error?: string) {
	response.writeHead(500);
	if (error) {
		response.write(error);
	}
	response.end();
}

function writeSuccessResponse(response: any, body: string) {
	response.writeHead(200, {
		'Content-Length': body.length,
		'Content-Type': 'application/json'
	});

	response.write(body);
	response.end();
}

function retrieveResource(response: any, responseType: string): void {
	let resourceName: string;
	let encoding: string;
	if (responseType === 'document' || responseType === 'html') {
		resourceName = 'foo.html';
		encoding = 'utf-8';
	}
	else if (responseType === 'gif') {
		resourceName = 'blob.gif';
	}
	else if (responseType === 'xml') {
		resourceName = 'foo.xml';
	}
	else {
		writeErrorResponse(response, 'Unrecognized response type requested');
		return;
	}

	http.get({
			host: 'localhost',
			port: '9000',
			path: '/tests/support/data/' + resourceName,
			method: 'GET'
		},
		function (newResponse: any) {
			response.writeHead(
				newResponse.statusCode,
				responseType === 'xml' ? {'content-type': 'text/xml'} : newResponse.headers
			);
			if (encoding) {
				newResponse.setEncoding(encoding);
			}
			newResponse.on('data', function (chunk: Buffer | string) {
				response.write(chunk);
			});
			newResponse.on('end', function () {
				response.end();
			});
		}
	);
}

export function start(port?: number): Promise<http.Server> {
	const echoRequest = wrapWithMultipartHandler(function (request: any, response: any) {
		try {
			const queryString = request.url.split('?')[1];
			let query: Hash<string | string[]>;
			let responseType = '';

			if (queryString) {
				query = querystring.parse(queryString);
				const responseTypeParam: string | string[] = query['responseType'];

				if (responseTypeParam instanceof Array) {
					responseType = responseTypeParam[0] ? responseTypeParam[0].toLowerCase() : '';
				}
				else if (typeof responseTypeParam === 'string') {
					responseType = responseTypeParam ? responseTypeParam.toLowerCase() : '';
				}
			}

			new Promise(function (resolve, reject) {
				if (request.data && typeof request.data.then === 'function') {
					request.data.then(function (data: any) {
							resolve(JSON.stringify(data));
						},
						function () {
							reject();
						}
					);
				}
				else if (request.method !== 'GET') {
					let postData = '';
					request.on('data', function (chunk: Buffer | string) {
						postData += chunk.toString();
					});
					request.on('end', function () {
						resolve(querystring.parse(postData));
					});
				}
				else {
					resolve();
				}
			}).then(function (data?: string) {
					if (!responseType || responseType.localeCompare('json') === 0) {
						const body = JSON.stringify({
							method: request.method,
							query: query,
							headers: request.headers,
							payload: data
						});
						if (query && query['delay']) {
							let delay = Number(query['delay']);
							setTimeout(writeSuccessResponse, delay, response, body);
						} else {
							writeSuccessResponse(response, body);
						}
					}
					else {
						retrieveResource(response, responseType);
					}
				},
				function () {
					writeErrorResponse(response, 'Error parsing request data');
				}
			);
		}
		catch (err) {
			writeErrorResponse(response, 'Error handling request: ' + err);
		}
	});

	const server: http.Server = http.createServer(function (request: any, response: any) {
		if (request.url.indexOf('/__echo/') === 0) {
			echoRequest(request, response);
		}
		else {
			proxy.proxyRequest(request, response, {
				host: 'localhost',
				port: 9000
			});
		}
	});

	const promise: Promise<http.Server> = new Promise(function (resolve, reject) {
		server.on('listening', function () {
			resolve(server);
		});
		setTimeout(reject, 10000);
	});
	server.listen(port || 9001);

	return promise;
}
