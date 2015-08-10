import { RequestOptions } from '../request';
import UrlSearchParams from '../UrlSearchParams';

/**
 * Returns a URL formatted with optional query string and cache-busting segments.
 *
 * @param url The base URL.
 * @param options The options hash that is used to generate the query string.
 */
export function generateRequestUrl(url: string, options: RequestOptions): string {
	let query = options.query || '';

	if (typeof query === 'object') {
		query = new UrlSearchParams(query).toString();
	}

	if (options.cacheBust) {
		const cacheBust = String(Date.now());
		query += query ? '&' + cacheBust : cacheBust;
	}

	const separator = url.indexOf('?') > -1 ? '&' : '?';
	return query ? url + separator + query : url;
}
