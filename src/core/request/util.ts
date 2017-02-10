import { RequestOptions } from './interfaces';
import UrlSearchParams from '../UrlSearchParams';
import { forOf } from '@dojo/shim/iterator';

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

export function getStringFromFormData(formData: any): string {
	const fields: string[] = [];

	forOf(formData.keys(), (key: string) => {
		fields.push(encodeURIComponent(key) + '=' + encodeURIComponent(formData.get(key)));
	});

	return fields.join('&');
}
