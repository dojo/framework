import { Handle } from './interfaces';
import { createHandle } from './lang';

/**
 * Wraps a setTimeout call in a handle, allowing the timeout to be cleared by calling destroy.
 *
 * @param callback Callback to be called when the timeout elapses
 * @param delay Number of milliseconds to wait before calling the callback
 * @return Handle which can be destroyed to clear the timeout
 */
export function createTimer(callback: (...args: any[]) => void, delay?: number): Handle {
	let timerId = setTimeout(callback, delay);

	return createHandle(function () {
		clearTimeout(timerId);
		timerId = null;
	});
}

/**
 * Wraps a callback, returning a function which fires after no further calls are received over a set interval.
 *
 * @param callback Callback to wrap
 * @param delay Number of milliseconds to wait after any invocations before calling the original callback
 * @return Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(callback: T, delay: number): T {
	// node.d.ts clobbers setTimeout/clearTimeout with versions that return/receive NodeJS.Timer,
	// but browsers return/receive a number
	let timer: any;

	return <T> function () {
		timer && clearTimeout(timer);

		let context = this;
		let args = arguments;

		timer = setTimeout(function () {
			callback.apply(context, args);
			args = context = timer = null;
		}, delay);
	};
}

/**
 * Wraps a callback, returning a function which fires at most once per set interval.
 *
 * @param callback Callback to wrap
 * @param delay Number of milliseconds to wait before allowing the original callback to be called again
 * @return Throttled function
 */
export function throttle<T extends (...args: any[]) => void>(callback: T, delay: number): T {
	let ran: boolean;

	return <T> function () {
		if (ran) {
			return;
		}

		ran = true;

		callback.apply(this, arguments);
		setTimeout(function () {
			ran = null;
		}, delay);
	};
}

/**
 * Like throttle, but calls the callback at the end of each interval rather than the beginning.
 * Useful for e.g. resize or scroll events, when debounce would appear unresponsive.
 *
 * @param callback Callback to wrap
 * @param delay Number of milliseconds to wait before calling the original callback and allowing it to be called again
 * @return Throttled function
 */
export function throttleAfter<T extends (...args: any[]) => void>(callback: T, delay: number): T {
	let ran: boolean;

	return <T> function () {
		if (ran) {
			return;
		}

		ran = true;

		let context = this;
		let args = arguments;

		setTimeout(function () {
			callback.apply(context, args);
			args = context = ran = null;
		}, delay);
	};
}

/**
 * Helper function to generate a value property descriptor
 * @param {T}                            value        The value the property descriptor should be set to
 * @param {boolean}                      enumerable   If the property should be enumberable, defaults to false
 * @param {boolean}                      writable     If the property should be writable, defaults to true
 * @param {boolean}                      configurable If the property should be configurable, defaults to true
 * @returns {TypedPropertyDescriptor<T>}              The property descriptor object
 */
export function getValueDescriptor<T>(value: T, enumerable: boolean = false, writable: boolean = true, configurable: boolean = true): TypedPropertyDescriptor<T> {
	return {
		value: value,
		enumerable: enumerable,
		writable: writable,
		configurable: configurable
	};
}
