// Matches an ISO 639.1/639.2 compatible language, followed by optional subtags.
const VALID_LOCALE_PATTERN = /^[a-z]{2,3}(-[a-z0-9\-\_]+)?$/i;

/**
 * Retrieve a list of locales that can provide substitute for the specified locale
 * (including itself).
 *
 * For example, if 'fr-CA' is specified, then `[ 'fr', 'fr-CA' ]` is returned.
 *
 * @param locale
 * The target locale.
 *
 * @return
 * A list of locales that match the target locale.
 */
export function generateLocales(locale: string): string[] {
	const normalized = normalizeLocale(locale);
	const parts = normalized.split('-');
	let current = parts[0];
	const result: string[] = [ current ];

	for (let i = 0; i < parts.length - 1; i += 1) {
		current += '-' + parts[i + 1];
		result.push(current);
	}

	return result;
}

/**
 * Normalize a locale so that it can be converted to a bundle path.
 *
 * @param locale
 * The target locale.
 *
 * @return The normalized locale.
 */
export const normalizeLocale = (function () {
	function removeTrailingSeparator(value: string): string {
		return value.replace(/(\-|_)$/, '');
	}

	function normalize(locale: string): string {
		if (locale.indexOf('.') === -1) {
			return removeTrailingSeparator(locale);
		}

		return locale.split('.').slice(0, -1).map((part: string): string => {
			return removeTrailingSeparator(part).replace(/_/g, '-');
		}).join('-');
	}

	return function (locale: string): string {
		const normalized = normalize(locale);

		if (!validateLocale(normalized)) {
			throw new Error(`${normalized} is not a valid locale.`);
		}

		return normalized;
	};
})();

/**
 * Validates that the provided locale at least begins with a ISO 639.1/639.2 comptabile language subtag,
 * and that any additional subtags contain only valid characters.
 *
 * While locales should adhere to the guidelines set forth by RFC 5646 (https://tools.ietf.org/html/rfc5646),
 * only the language subtag is strictly enforced.
 *
 * @param locale
 * The locale to validate.
 *
 * @return
 * `true` if the locale is valid; `false` otherwise.
 */
export function validateLocale(locale: string): boolean {
	return VALID_LOCALE_PATTERN.test(locale);
}
