import Task from './async/Task';
import ProviderRegistry from './request/ProviderRegistry';
import { RequestOptions, Response, Provider } from './request/interfaces';
import xhr from './request/providers/xhr';

export const providerRegistry = new ProviderRegistry();

const request: {
	(url: string, options?: RequestOptions): Task<Response>;
	delete(url: string, options?: RequestOptions): Task<Response>;
	get(url: string, options?: RequestOptions): Task<Response>;
	head(url: string, options?: RequestOptions): Task<Response>;
	options(url: string, options?: RequestOptions): Task<Response>;
	post(url: string, options?: RequestOptions): Task<Response>;
	put(url: string, options?: RequestOptions): Task<Response>;

	setDefaultProvider(provider: Provider): void;
} = <any> function request(url: string, options: RequestOptions = {}): Task<Response> {
	try {
		return providerRegistry.match(url, options)(url, options);
	}
	catch (error) {
		return Task.reject<Response>(error);
	}
};

[ 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT' ].forEach(method => {
	Object.defineProperty(request, method.toLowerCase(), {
		value(url: string, options: RequestOptions = {}): Task<Response> {
			options = Object.create(options);
			options.method = method;
			return request(url, options);
		}
	});
});

Object.defineProperty(request, 'setDefaultProvider', {
	value(provider: Provider) {
		providerRegistry.setDefaultProvider(provider);
	}
});

providerRegistry.setDefaultProvider(xhr);

export default request;
export * from './request/interfaces';
export { default as Headers } from './request/Headers';
export { default as TimeoutError } from './request/TimeoutError';
export { default as Response, ResponseData } from './request/Response';
