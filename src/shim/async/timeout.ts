import Promise from './Promise';

/**
 * Reject a promise chain if a result hasn't been found before the timeout
 *
 * @param milliseconds after this number of milliseconds a rejection will be returned
 * @param reason The reason for the rejection
 * @return {function(T): Promise<T>} a function that produces a promise that is rejected or resolved based on your timeout
 */
export default function timeout<T>(milliseconds: number, reason: Error): Identity<T> {
	var start = Date.now();
	return function (value: T): Promise<T> {
		if (Date.now() - milliseconds > start) {
			return Promise.reject<T>(reason);
		}
		return Promise.resolve<T>(value);
	}
}
