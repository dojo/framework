import * as Globalize from 'globalize/dist/globalize';
import { getComputedLocale, getMatchedSupportedLocale } from '../i18n';

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
	const { locale: requestedLocale = getComputedLocale(), options, value, unit } = normalizeFormatterArguments<T, O>(
		args
	);
	const locale = getMatchedSupportedLocale(requestedLocale) || getComputedLocale();
	const methodArgs: any[] = typeof value !== 'undefined' ? [value] : [];

	if (typeof unit !== 'undefined') {
		methodArgs.push(unit);
	}

	if (typeof options !== 'undefined') {
		methodArgs.push(options);
	}
	const globalize = new Globalize(locale);
	return (globalize as any)[method].apply(globalize, methodArgs);
}
