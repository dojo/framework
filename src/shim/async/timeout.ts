import Promise from './Promise';

export default function timeout<T>(milliseconds: number, reason: Error): Identity<T> {
	var start = Date.now();
	return function (value: T): Promise<T> {
		if (Date.now() - milliseconds > start) {
			return Promise.reject<T>(reason);
		}
		return Promise.resolve<T>(value);
	}
}
