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

	return function (locale: string): string {
		if (locale.indexOf('.') === -1) {
			return removeTrailingSeparator(locale);
		}

		return locale.split('.').slice(0, -1).map((part: string): string => {
			return removeTrailingSeparator(part).replace(/_/g, '-');
		}).join('-');
	};
})();
