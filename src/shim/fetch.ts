import dojoGlobal from './global';
import has from '../has/has';

let fetchLoadedPromise: Promise<void>;
if (!has('build-elide')) {
	if (has('host-browser')) {
		fetchLoadedPromise = import('cross-fetch/dist/browser-polyfill');
	} else {
		fetchLoadedPromise = import('cross-fetch/dist/node-polyfill');
	}
} else {
	fetchLoadedPromise = Promise.resolve();
}

fetchLoadedPromise.then(() => {
	if (typeof global !== 'undefined' && (global as any).fetch && (global as any).fetch !== dojoGlobal.fetch) {
		dojoGlobal.fetch = (global as any).fetch;
	}
});

const _fetch = (input: RequestInfo, init?: RequestInit) => fetchLoadedPromise.then(() => dojoGlobal.fetch(input, init));

let replacement: (input: RequestInfo, init?: RequestInit) => Promise<Response> = _fetch;

export default function fetch(input: RequestInfo, init?: RequestInit) {
	return replacement(input, init);
}

export function replace(fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>): () => void {
	if (has('test')) {
		replacement = fetch;
		return () => {
			replacement = _fetch;
		};
	} else {
		throw new Error('Replacement functionality is only available in a test environment');
	}
}
