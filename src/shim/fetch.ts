import dojoGlobal from './global';
`!has('build-elide')`;
import 'isomorphic-fetch';

import has from '../has/has';

if (typeof global !== 'undefined' && (global as any).fetch && (global as any).fetch !== dojoGlobal.fetch) {
	dojoGlobal.fetch = (global as any).fetch;
}

const _fetch = dojoGlobal.fetch.bind(dojoGlobal) as (input: RequestInfo, init?: RequestInit) => Promise<Response>;
let replacement: (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export default function fetch(input: RequestInfo, init?: RequestInit) {
	return replacement ? replacement(input, init) : _fetch(input, init);
}

export function replace(fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {
	if (has('test')) {
		replacement = fetch;
	} else {
		throw new Error('Replacement functionality is only available in a test environment');
	}
}
