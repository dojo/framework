import Promise from './Promise';

/**
 * Used for delaying a Promise chain for a specific number of milliseconds.
 *
 * @param milliseconds the number of milliseconds to delay
 * @return {function(T): Promise<T>} a function producing a promise that eventually returns the value passed to it; usable with Thenable.then()
 */
export default function delay<T>(milliseconds: number): Identity<T> {
	return function (value: T): Promise<T> {
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(value);
			}, milliseconds)
		});
	};
}
