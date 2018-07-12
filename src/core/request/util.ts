import { RequestOptions } from './interfaces';
import UrlSearchParams from '../UrlSearchParams';

/**
 * Returns a URL formatted with optional query string and cache-busting segments.
 *
 * @param url The base URL.
 * @param options The RequestOptions used to generate the query string or cacheBust.
 */
export function generateRequestUrl(url: string, options: RequestOptions = {}): string {
	let query = new UrlSearchParams(options.query).toString();
	if (options.cacheBust) {
		const bustString = String(Date.now());
		query += query ? `&${bustString}` : bustString;
	}
	const separator = url.indexOf('?') > -1 ? '&' : '?';
	return query ? `${url}${separator}${query}` : url;
}

export function getStringFromFormData(formData: any): string {
	const fields: string[] = [];

	for (const key of formData.keys()) {
		fields.push(encodeURIComponent(key) + '=' + encodeURIComponent(formData.get(key)));
	}

	return fields.join('&');
}
