import Task from '../async/Task';
import RequestTimeoutError from './errors/RequestTimeoutError';
import { Handle } from '../interfaces';
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
		headers: options.headers || {},
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

	if (!('user-agent' in requestOptions.headers)) {
		requestOptions.headers['user-agent'] = 'dojo/' + version + ' Node.js/' + process.version.replace(/^v/, '');
	}

	if (options.proxy) {
		requestOptions.path = requestUrl;
		if (parsedUrl.auth) {
			requestOptions.headers['proxy-authorization'] = 'Basic ' + new Buffer(parsedUrl.auth).toString('base64');
		}

		let _parsedUrl = urlUtil.parse(requestUrl);
		requestOptions.headers['host'] = _parsedUrl.host;
		requestOptions.auth = _parsedUrl.auth || options.auth;
	}

	if (!options.auth && (options.user || options.password)) {
		requestOptions.auth = encodeURIComponent(options.user || '') + ':' + encodeURIComponent(options.password || '');
	}

	const request = (parsedUrl.protocol === 'https:' ? https : http).request(requestOptions);
	const response: Response<T> = {
		data: null,
		getHeader: function (name: string): string {
			return (this.nativeResponse && this.nativeResponse.headers[name.toLowerCase()]) || null;
		},
		requestOptions: options,
		statusCode: null,
		url: requestUrl
	};

	const promise = new Task<Response<T>>(function (resolve, reject) {
		if (options.socketOptions) {
			if ('timeout' in options.socketOptions) {
				request.setTimeout(options.socketOptions.timeout);
			}

			if ('noDelay' in options.socketOptions) {
				request.setNoDelay(options.socketOptions.noDelay);
			}

			if ('keepAlive' in options.socketOptions) {
				const initialDelay: number = options.socketOptions.keepAlive;
				request.setSocketKeepAlive(initialDelay >= 0, initialDelay);
			}
		}

		let timeout: Handle;
		request.once('response', function (nativeResponse: http.ClientResponse): void {
			response.nativeResponse = nativeResponse;
			response.statusCode = nativeResponse.statusCode;

			// Redirection handling defaults to true in order to harmonise with the XHR provider, which will always
			// follow redirects
			// TODO: This redirect code is not 100% correct according to the RFC; needs to handle redirect loops and
			// restrict/modify certain redirects
			if (
				response.statusCode >= 300 &&
				response.statusCode < 400 &&
				response.statusCode !== 304 &&
				options.followRedirects !== false &&
				nativeResponse.headers.location
			) {
				resolve(node(nativeResponse.headers.location, options));
				return;
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
							options.streamTarget.abort(error);
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
					options.streamTarget.close();
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
						writableRequest.abort(error);
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
