import { RequestOptions } from '../request';
import UrlSearchParams from '../UrlSearchParams';

/**
 * Returns a URL formatted with optional query string and cache-busting segments.
 *
 * @param url The base URL.
 * @param options The RequestOptions used to generate the query string or cacheBust.
 */
export function generateRequestUrl(url: string,
		{ query, cacheBust }: RequestOptions = {}): string {
	query = new UrlSearchParams(query).toString();
	if (cacheBust) {
		const bustString = String(Date.now());
		query += query ? `&${bustString}` : bustString;
	}
	const separator = url.indexOf('?') > -1 ? '&' : '?';
	return query ? `${url}${separator}${query}` : url;
}
