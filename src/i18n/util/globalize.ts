import * as Globalize from 'globalize/dist/globalize';
import i18n from '../i18n';

/**
 * @private
 * Normalize an array of formatter arguments into a discrete object with `locale`, `options`, `value` and
 * `unit` properties for use with the various Globalize.js formatter methods.
 *
 * @param args
 * An object with an optional locale, options, value, and/or unit.
 *
 * @return
 * The normalized object map.
 */
function normalizeFormatterArguments<T, O>(args: DelegatorOptions<T> | FormatterDelegatorOptions<T, O>) {
	let { locale, optionsOrLocale, unit, value } = args as FormatterDelegatorOptions<T, O>;
	let options = optionsOrLocale;

	if (typeof optionsOrLocale === 'string') {
		locale = optionsOrLocale;
		options = undefined;
	}

	return { locale, options, unit, value };
}

export interface DelegatorOptions<O> {
	locale?: string;
	optionsOrLocale?: O | string;
}

export interface FormatterDelegatorOptions<T, O> extends DelegatorOptions<O> {
	unit?: string;
	value?: T;
}

/**
 * Return a Globalize.js object for the specified locale. If no locale is provided, then the root
 * locale is assumed.
 *
 * @param string
 * An optional locale for the Globalize.js object.
 *
 * @return
 * The localized Globalize.js object.
 */
export default function getGlobalize(locale?: string) {
	return locale && locale !== i18n.locale ? new Globalize(locale) : Globalize;
}

/**
 * Call the specified Globalize.js method with the specified value, unit, and options, for the specified locale.
 *
 * @param method
 * The name of the static method on the `Globalize` object (required).
 *
 * @param args
 * An object containing any locale, options, value, or unit required by the underlying Globalize.js method.
 *
 * @return
 * The value returned by the underlying Globalize.js method.
 */
export function globalizeDelegator<O, R>(method: string, args: DelegatorOptions<O>): R;
export function globalizeDelegator<T, O, R>(method: string, args: FormatterDelegatorOptions<T, O>): R;
export function globalizeDelegator<T, O, R>(
	method: string,
	args: DelegatorOptions<O> | FormatterDelegatorOptions<T, O>
): R {
	const { locale, options, value, unit } = normalizeFormatterArguments<T, O>(args);
	const methodArgs: any[] = typeof value !== 'undefined' ? [value] : [];

	if (typeof unit !== 'undefined') {
		methodArgs.push(unit);
	}

	if (typeof options !== 'undefined') {
		methodArgs.push(options);
	}

	const globalize = getGlobalize(locale);
	return (<any>globalize)[method].apply(globalize, methodArgs);
}
