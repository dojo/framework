import Task from '../async/Task';
import RequestTimeoutError from './errors/RequestTimeoutError';
import { Handle } from 'dojo-interfaces/core';
import * as http from 'http';
import * as https from 'https';
import { createHandle } from '../lang';
import { RequestError, RequestOptions, Response, ResponsePromise } from '../request';
import ReadableNodeStreamSource from '../streams/adapters/ReadableNodeStreamSource';
import WritableNodeStreamSink from '../streams/adapters/WritableNodeStreamSink';
import ReadableStream from '../streams/ReadableStream';
import WritableStream from '../streams/WritableStream';
import * as urlUtil from 'url';
import { generateRequestUrl } from './util';

// TODO: Where should the dojo version come from? It used to be kernel, but we don't have that.
let version = '2.0.0-pre';

const DEFAULT_REDIRECT_LIMIT = 15;

interface Options {
	agent?: any;
	auth?: string;
	headers?: { [name: string]: string; };
	host?: string;
	hostname?: string;
	localAddress?: string;
	method?: string;
	path?: string;
	port?: number;
	socketPath?: string;
}

interface HttpsOptions extends Options {
	ca?: any;
	cert?: string;
	ciphers?: string;
	key?: string;
	passphrase?: string;
	pfx?: any;
	rejectUnauthorized?: boolean;
	secureProtocol?: string;
}

export interface NodeRequestOptions<T> extends RequestOptions {
	agent?: any;
	ca?: any;
	cert?: string;
	ciphers?: string;
	dataEncoding?: string;
	followRedirects?: boolean;
	key?: string;
	localAddress?: string;
	passphrase?: string;
	pfx?: any;
	proxy?: string;
	rejectUnauthorized?: boolean;
	secureProtocol?: string;
	socketPath?: string;
	socketOptions?: {
		keepAlive?: number;
		noDelay?: boolean;
		timeout?: number;
	};
	streamData?: boolean;
	streamEncoding?: string;
	streamTarget?: WritableStream<T>;
	redirectOptions?: {
		limit?: number;
		count?: number;
		keepOriginalMethod?: boolean;
	};
}

function redirect<T>(resolve: (p?: any) => void, reject: (_?: Error) => void, url: string, options: NodeRequestOptions<T>): boolean {
	if (!options.redirectOptions) {
		options.redirectOptions = {};
	}

	const { limit: redirectLimit = DEFAULT_REDIRECT_LIMIT } = options.redirectOptions;
	const { count: redirectCount = 0 } = options.redirectOptions;
	const { followRedirects = true } = options;

	if (!followRedirects) {
		return false;
	}

	if (!url) {
		reject(new Error('asked to redirect but no location header was found'));
		return true;
	}

	if (redirectCount > redirectLimit) {
		reject(new Error(`too many redirects, limit reached at ${redirectLimit}`));
		return true;
	}

	options.redirectOptions.count = redirectCount + 1;

	resolve(node(url, options));

	return true;
}

export default function node<T>(url: string, options: NodeRequestOptions<T> = {}): ResponsePromise<T> {
	const requestUrl = generateRequestUrl(url, options);
	const parsedUrl = urlUtil.parse(options.proxy || requestUrl);
	const requestOptions: HttpsOptions = {
		agent: options.agent,
		auth: parsedUrl.auth || options.auth,
		ca: options.ca,
		cert: options.cert,
		ciphers: options.ciphers,
		host: parsedUrl.host,
		hostname: parsedUrl.hostname,
		key: options.key,
		localAddress: options.localAddress,
		method: options.method ? options.method.toUpperCase() : 'GET',
		passphrase: options.passphrase,
		path: parsedUrl.path,
		pfx: options.pfx,
		port: Number(parsedUrl.port),
		rejectUnauthorized: options.rejectUnauthorized,
		secureProtocol: options.secureProtocol,
		socketPath: options.socketPath
	};

	requestOptions.headers = options.headers || {};

	if (!Object.keys(requestOptions.headers).map(headerName => headerName.toLowerCase()).some(headerName => headerName === 'user-agent')) {
		requestOptions.headers['user-agent'] = 'dojo/' + version + ' Node.js/' + process.version.replace(/^v/, '');
	}

	if (options.proxy) {
		requestOptions.path = requestUrl;
		if (parsedUrl.auth) {
			requestOptions.headers['proxy-authorization'] = 'Basic ' + new Buffer(parsedUrl.auth).toString('base64');
		}

		let _parsedUrl = urlUtil.parse(requestUrl);
		if (_parsedUrl.host) {
			requestOptions.headers['host'] = _parsedUrl.host;
		}
		requestOptions.auth = _parsedUrl.auth || options.auth;
	}

	if (!options.auth && (options.user || options.password)) {
		requestOptions.auth = encodeURIComponent(options.user || '') + ':' + encodeURIComponent(options.password || '');
	}

	const request = parsedUrl.protocol === 'https:' ? https.request(requestOptions) : http.request(requestOptions);
	const response: Response<T> = {
		data: null,
		getHeader: function (this: Response<T>, name: string): string {
			return (this.nativeResponse && this.nativeResponse.headers[name.toLowerCase()]) || null;
		},
		requestOptions: options,
		statusCode: null,
		url: requestUrl
	};

	const promise = new Task<Response<T>>(function (resolve, reject) {
		if (options.socketOptions) {
			if (options.socketOptions.timeout) {
				request.setTimeout(options.socketOptions.timeout);
			}

			if ('noDelay' in options.socketOptions) {
				request.setNoDelay(options.socketOptions.noDelay);
			}

			if ('keepAlive' in options.socketOptions) {
				const initialDelay: number | undefined = options.socketOptions.keepAlive;
				request.setSocketKeepAlive(initialDelay >= 0, initialDelay);
			}
		}

		let timeout: Handle;
		request.once('response', function (nativeResponse: http.ClientResponse): void {
			response.nativeResponse = nativeResponse;
			response.statusCode = nativeResponse.statusCode;

			// Redirection handling defaults to true in order to harmonise with the XHR provider, which will always
			// follow redirects
			if (
				response.statusCode >= 300 &&
				response.statusCode < 400
			) {
				const redirectOptions = options.redirectOptions || {};
				const newOptions = Object.create(options);

				switch (response.statusCode) {
					case 300:
						/**
						 * Note about 300 redirects. RFC 2616 doesn't specify what to do with them, it is up to the client to "pick
						 * the right one".  We're picking like Chrome does, just don't pick any.
						 */
						break;

					case 301:
					case 302:
						/**
						 * RFC 2616 says,
						 *
						 *     If the 301 status code is received in response to a request other
						 *     than GET or HEAD, the user agent MUST NOT automatically redirect the
						 *     request unless it can be confirmed by the user, since this might
						 *       change the conditions under which the request was issued.
						 *
						 *     Note: When automatically redirecting a POST request after
						 *     receiving a 301 status code, some existing HTTP/1.0 user agents
						 *     will erroneously change it into a GET request.
						 *
						 * We're going to be one of those erroneous agents, to prevent the request from failing..
						 */
						if ((requestOptions.method !== 'GET' && requestOptions.method !== 'HEAD') && !redirectOptions.keepOriginalMethod) {
							newOptions.method = 'GET';
						}

						if (redirect<T>(resolve, reject, nativeResponse.headers.location, newOptions)) {
							return;
						}
						break;

					case 303:

						/**
						 * The response to the request can be found under a different URI and
						 * SHOULD be retrieved using a GET method on that resource.
						 */
						if (requestOptions.method !== 'GET') {
							newOptions.method = 'GET';
						}

						if (redirect<T>(resolve, reject, nativeResponse.headers.location, newOptions)) {
							return;
						}
						break;

					case 304:
						// do nothing so this can fall through and return the response as normal. Nothing more can
						// be done for 304
						break;

					case 305:
						if (!nativeResponse.headers.location) {
							reject(new Error('expected Location header to contain a proxy url'));
						} else {
							newOptions.proxy = nativeResponse.headers.location;
							if (redirect<T>(resolve, reject, requestUrl, newOptions)) {
								return;
							}
						}
						break;

					case 307:
						/**
						 *  If the 307 status code is received in response to a request other
						 *  than GET or HEAD, the user agent MUST NOT automatically redirect the
						 *  request unless it can be confirmed by the user, since this might
						 *  change the conditions under which the request was issued.
						 */
						if (redirect<T>(resolve, reject, nativeResponse.headers.location, newOptions)) {
							return;
						}
						break;

					default:
						reject(new Error('unhandled redirect status ' + response.statusCode));
						return;
				}
			}

			options.streamEncoding && nativeResponse.setEncoding(options.streamEncoding);
			if (options.streamTarget) {
				const responseSource = new ReadableNodeStreamSource(nativeResponse);
				const responseReadableStream = new ReadableStream(responseSource);

				responseReadableStream.pipeTo(<any> options.streamTarget)
					.then(
						function () {
							resolve(response);
						},
						function (error: RequestError<T>) {
							if (options.streamTarget) {
								// abort the stream, swallowing any errors,
								// (because we've already got an error, and we can't catch this one)
								options.streamTarget.abort(error).catch(() => {
								});
							}
							request.abort();
							error.response = response;
							reject(error);
						}
					);
			}

			let data: any[];
			let loaded: number;
			if (!options.streamData) {
				data = [];
				loaded = 0;

				nativeResponse.on('data', function (chunk: any): void {
					data.push(chunk);
					loaded += (typeof chunk === 'string') ?
						Buffer.byteLength(chunk, options.streamEncoding) :
						chunk.length;
				});
			}

			nativeResponse.once('end', function (): void {
				timeout && timeout.destroy();

				if (!options.streamData) {
					// TODO: what type should data have?
					response.data = <any> (options.streamEncoding ? data.join('') : Buffer.concat(data, loaded));
				}

				// If using a streamTarget, wait for it to finish in case it throws an error
				if (!options.streamTarget) {
					resolve(response);
				}
				else {
					options.streamTarget.close().catch(() => {
					});
				}
			});
		});

		request.once('error', reject);

		if (options.data) {
			if (options.data instanceof ReadableStream) {
				const requestSink = new WritableNodeStreamSink(request);
				const writableRequest = new WritableStream(requestSink);
				options.data.pipeTo(writableRequest)
					.catch(function (error: RequestError<T>) {
						error.response = response;
						writableRequest.abort(error).catch(() => {
						});
						reject(error);
					});
			}
			else {
				request.end(options.data);
			}
		}
		else {
			request.end();
		}

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeout = (function (): Handle {
				const timer = setTimeout(function (): void {
					const error = new RequestTimeoutError('Request timed out after ' + options.timeout + 'ms');
					error.response = response;
					reject(error);
				}, options.timeout);

				return createHandle(function (): void {
					clearTimeout(timer);
				});
			})();
		}
	}, function () {
		request.abort();
	}).catch(function (error: Error): any {
		let parsedUrl = urlUtil.parse(url);

		if (parsedUrl.auth) {
			parsedUrl.auth = '(redacted)';
		}

		let sanitizedUrl = urlUtil.format(parsedUrl);

		error.message = '[' + requestOptions.method + ' ' + sanitizedUrl + '] ' + error.message;
		throw error;
	});

	return promise;
}
